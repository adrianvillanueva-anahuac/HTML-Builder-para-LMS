import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import 'shepherd.js/dist/css/shepherd.css';
import './index.css';
import './menu-motion.css';

if (import.meta.env.DEV) {
  void import('./dev-annotations').then(({setupDevAnnotations}) => setupDevAnnotations());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
