import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 App starting with env:', import.meta.env.VITE_API_BASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
