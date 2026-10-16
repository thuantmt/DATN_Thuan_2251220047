import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './AuthApp';
import './styles.css';
import './workspace.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
