import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Presentation from './Presentation';
import Controller from './Controller';
import './index.css';

// Inject slides.css as a <link> at runtime so it always loads after the bundled CSS,
// guaranteeing project overrides win without needing !important.
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/api/slides.css';
document.head.appendChild(link);

// Hot-reload slides.css when the engine signals it changed.
const WS_URL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001').replace(/^http/, 'ws');
function connectCssWatcher() {
  const ws = new WebSocket(WS_URL);
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'RELOAD_CSS') link.href = `/api/slides.css?t=${Date.now()}`;
  };
  ws.onclose = () => setTimeout(connectCssWatcher, 2000);
}
connectCssWatcher();

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Presentation />} />
      <Route path="/controller" element={<Controller />} />
    </Routes>
  </BrowserRouter>
);
