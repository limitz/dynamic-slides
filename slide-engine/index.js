import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import chokidar from 'chokidar';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse } from 'smol-toml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = process.env.SCRIPT || resolve(process.cwd(), 'presentation.toml');
const PORT = process.env.PORT || 3001;

// --- State ---
let state = {
  slides: [],
  currentIndex: 0,
  currentStep: 0,
  meta: {},
  theme: {},
};

// Count fragment elements in a slide (bullets with fragment: true)
function countFragments(slide) {
  if (!slide) return 0;
  const bullets = slide.content?.bullets || [];
  return bullets.filter(b => typeof b === 'object' && b !== null && b.fragment).length;
}

// --- Script loading ---
function loadScript() {
  if (!existsSync(SCRIPT_PATH)) {
    console.warn(`Script not found: ${SCRIPT_PATH}`);
    return;
  }
  try {
    const raw = readFileSync(SCRIPT_PATH, 'utf-8');
    const parsed = parse(raw);
    state.slides = parsed.slide || [];
    state.meta = parsed.meta || {};
    state.theme = parsed.theme || {};
    state.currentStep = 0;
    console.log(`Loaded ${state.slides.length} slides from ${SCRIPT_PATH}`);
  } catch (err) {
    console.error('Failed to parse script:', err.message);
  }
}

loadScript();

// --- Express app ---
const app = express();
app.use(express.json());

// Serve static assets from the project directory (images, videos, etc.)
const projectDir = dirname(SCRIPT_PATH);
app.use('/assets', express.static(resolve(projectDir, 'assets')));

// CORS for Vite dev server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// GET /state
app.get('/state', (req, res) => {
  res.json(state);
});

// POST /slide/next
app.post('/slide/next', (req, res) => {
  const fragments = countFragments(state.slides[state.currentIndex]);
  if (state.currentStep < fragments) {
    state.currentStep++;
  } else if (state.currentIndex < state.slides.length - 1) {
    state.currentIndex++;
    state.currentStep = 0;
  }
  broadcast({ type: 'STATE', state });
  res.json({ currentIndex: state.currentIndex, currentStep: state.currentStep });
});

// POST /slide/prev
app.post('/slide/prev', (req, res) => {
  if (state.currentStep > 0) {
    state.currentStep--;
  } else if (state.currentIndex > 0) {
    state.currentIndex--;
    state.currentStep = countFragments(state.slides[state.currentIndex]);
  }
  broadcast({ type: 'STATE', state });
  res.json({ currentIndex: state.currentIndex, currentStep: state.currentStep });
});

// POST /slide/:id
app.post('/slide/:id', (req, res) => {
  const idx = state.slides.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Slide not found' });
  state.currentIndex = idx;
  state.currentStep = 0;
  broadcast({ type: 'STATE', state });
  res.json({ currentIndex: state.currentIndex, currentStep: state.currentStep });
});

// PATCH /script — update script content and reload
app.patch('/script', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    writeFileSync(SCRIPT_PATH, content, 'utf-8');
    res.json({ ok: true });
    // chokidar will pick up the change and broadcast
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reload — force reload from disk
app.post('/reload', (req, res) => {
  loadScript();
  broadcast({ type: 'STATE', state });
  res.json({ ok: true });
});

// --- HTTP + WebSocket server ---
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  // Send current state on connect
  ws.send(JSON.stringify({ type: 'STATE', state }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleClientMessage(ws, msg);
    } catch {
      // ignore malformed messages
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

function handleClientMessage(ws, msg) {
  switch (msg.type) {
    case 'NEXT': {
      const fragments = countFragments(state.slides[state.currentIndex]);
      if (state.currentStep < fragments) {
        state.currentStep++;
      } else if (state.currentIndex < state.slides.length - 1) {
        state.currentIndex++;
        state.currentStep = 0;
      }
      broadcast({ type: 'STATE', state });
      break;
    }
    case 'PREV': {
      if (state.currentStep > 0) {
        state.currentStep--;
      } else if (state.currentIndex > 0) {
        state.currentIndex--;
        state.currentStep = countFragments(state.slides[state.currentIndex]);
      }
      broadcast({ type: 'STATE', state });
      break;
    }
    case 'GOTO':
      if (typeof msg.index === 'number' && msg.index >= 0 && msg.index < state.slides.length) {
        state.currentIndex = msg.index;
        state.currentStep = 0;
        broadcast({ type: 'STATE', state });
      }
      break;
  }
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// --- File watcher ---
chokidar.watch(SCRIPT_PATH, { ignoreInitial: true }).on('change', () => {
  console.log('Script changed, reloading...');
  loadScript();
  broadcast({ type: 'STATE', state });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Watching: ${SCRIPT_PATH}`);
});
