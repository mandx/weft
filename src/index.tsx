// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import reportWebVitals from './reportWebVitals';
import './index.css';
import App from './App';
import * as serviceWorker from './service-worker';

// TODO: Serve index pages with these headers:
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

createRoot(document.getElementById('root')!).render(<App />);
// <StrictMode>
// </StrictMode>

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
reportWebVitals();
