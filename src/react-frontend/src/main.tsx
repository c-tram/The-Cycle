import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Fallback: render App without StrictMode due to missing type in custom types
delete (React as any).StrictMode; // Ensure no runtime error if custom types conflict

createRoot(document.getElementById('root')!).render(
  <App />
);
