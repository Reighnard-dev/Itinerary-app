import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './discovery.css';
import './hero.css';
import './place-photos.css';
import './explore.css';
import './itinerary-stay.css';

function Startup() {
  useEffect(() => {
    const splash = document.getElementById('launch-splash');
    if (!splash) return;
    const shownAt = performance.getEntriesByName('roam-splash-shown', 'mark')[0]?.startTime ?? 0;
    const remainingHold = Math.max(0, 650 - (performance.now() - shownAt));
    let frame = 0;
    const fadeTimer = window.setTimeout(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        splash.remove();
        return;
      }

      // A stalled frame during startup should not consume the entire fade.
      let previousFrame: number | undefined;
      let elapsed = 0;
      const fade = (now: number) => {
        elapsed += Math.min(now - (previousFrame ?? now), 100);
        previousFrame = now;
        const progress = Math.min(elapsed / 700, 1);
        splash.style.opacity = String((1 + Math.cos(Math.PI * progress)) / 2);
        if (progress === 1) splash.remove();
        else frame = window.requestAnimationFrame(fade);
      };
      frame = window.requestAnimationFrame(fade);
    }, remainingHold);

    return () => {
      window.clearTimeout(fadeTimer);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Startup />
  </StrictMode>,
);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is optional.
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
