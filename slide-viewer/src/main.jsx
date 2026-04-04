import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Presentation from './Presentation';
import Controller from './Controller';
import './index.css';

// Load user's custom CSS (transitions, overrides) from project directory if present
const projectStyles = import.meta.glob('@project/slides.css', { eager: true });

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Presentation />} />
      <Route path="/controller" element={<Controller />} />
    </Routes>
  </BrowserRouter>
);
