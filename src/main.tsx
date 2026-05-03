import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const preloadLogo = () => {
	const img = new Image();
	img.src = "/lumatha-logo-new.png";
};

preloadLogo();

// Prevent infinite reload loops on chunk errors - max 2 reloads per 60 seconds
const PRELOAD_RELOAD_KEY = 'lumatha_preload_reload_count';
const PRELOAD_RELOAD_TIME = 'lumatha_preload_reload_time';

window.addEventListener('vite:preloadError', (e) => {
	e.preventDefault();
	
	const now = Date.now();
	const lastTime = parseInt(sessionStorage.getItem(PRELOAD_RELOAD_TIME) || '0', 10);
	let count = parseInt(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || '0', 10);
	
	// Reset count if more than 60 seconds passed
	if (now - lastTime > 60000) {
		count = 0;
	}
	
	// Stop after 2 reloads and show alert instead
	if (count >= 2) {
		console.error('Chunk load failed repeatedly. Please refresh manually.');
		alert('App update detected. Please press F5 or refresh the page to continue.');
		return;
	}
	
	// Track reload and refresh
	sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(count + 1));
	sessionStorage.setItem(PRELOAD_RELOAD_TIME, String(now));
	window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);

