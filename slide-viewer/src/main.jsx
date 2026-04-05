// This file is no longer the primary entry point.
// The template's entry.js imports viewer components via the @viewer alias.
// This file is kept for backwards compatibility if someone runs the viewer directly.

import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Presentation from './Presentation';
import Controller from './Controller';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Presentation />} />
      <Route path="/controller" element={<Controller />} />
    </Routes>
  </BrowserRouter>
);
