import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SwarmProvider } from './SwarmContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SwarmProvider>
      <App />
    </SwarmProvider>
  </React.StrictMode>
);
