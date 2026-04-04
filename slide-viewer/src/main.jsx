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

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Presentation />} />
      <Route path="/controller" element={<Controller />} />
    </Routes>
  </BrowserRouter>
);
