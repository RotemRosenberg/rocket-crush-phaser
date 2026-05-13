import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode is intentionally omitted: in development it runs every useEffect twice,
// which causes Phaser to create two Game instances sharing the same EventBus.
// The result is doubled score events and moves running out in half the turns.
// TypeScript + our own review process catches the kinds of bugs StrictMode targets.
createRoot(document.getElementById('root')!).render(<App />)
