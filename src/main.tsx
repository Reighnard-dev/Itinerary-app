import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './discovery.css';
import './hero.css';
import './place-photos.css';
import './explore.css';
import './itinerary-stay.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is optional.
    });
  });
}
