import React from 'react';
import { createRoot } from 'react-dom/client';
import { Compass } from 'lucide-react';
import App from './App';
import './styles.css';
import './discovery.css';
import './hero.css';
import './place-photos.css';
import './explore.css';
import './itinerary-stay.css';
import './splash.css';

function SplashScreen() {
  const contours = (
    <svg viewBox="0 0 240 225" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M9-10C24 22 68 32 68 66S52 117 97 130s70 14 87 51 42 40 68 45" />
      <path d="M37-10C52 16 92 23 93 56s-16 48 23 61 62 12 77 45 35 41 59 45" />
      <path d="M68-10C84 7 120 13 120 47s-13 46 21 53 57 8 70 39 26 36 41 40" />
      <path d="M107-10C131 0 151 14 148 40s15 43 44 43 38 20 45 43 11 20 15 24" />
      <path d="M143-10C164 0 174 15 173 36s18 29 39 23 31-5 40 5" />
    </svg>
  );

  return (
    <div className="launch-splash" aria-hidden="true">
      <div className="launch-splash-contours top">{contours}</div>
      <div className="launch-splash-contours bottom">{contours}</div>
      <div className="launch-splash-copy">
        <div className="brand launch-splash-brand">
          <span className="brand-icon"><Compass strokeWidth={2.2} /></span>
          roam<span className="brand-dot">.</span>
        </div>
        <p>For the wanderers.<br />And the wonderers.</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SplashScreen />
    <App />
  </React.StrictMode>,
);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is optional.
    });
  });
}
