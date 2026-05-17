import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/authDebug' // Load auth debugging tools
import { logger } from './utils/logger'

logger.log('App starting', { component: 'main', action: 'start', data: { env: import.meta.env.VITE_API_BASE_URL } });

createRoot(document.getElementById("root")!).render(<App />);
