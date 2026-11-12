import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './discovery.css';
import './hero.css';
import './place-photos.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
