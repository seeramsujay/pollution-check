/**
 * @file main.tsx
 * @description Application entry point. Mounts the Preact root component into the DOM.
 *
 * The `#app` element is defined in `index.html`. Preact's `render()` replaces
 * its contents with the hydrated component tree. This file intentionally contains
 * no business logic — it exists solely as the Vite entry module.
 */

import { render } from 'preact';
import './index.css';
import { App } from './app.tsx';

// Mount the root App component into the `<div id="app">` placeholder in index.html.
render(<App />, document.getElementById('app')!);
