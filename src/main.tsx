import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Visualizer from './Visualizer';
import ModelExplorer from './ModelExplorer';

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/visualizer',
    element: <Visualizer />,
  },
  {
    path: '/model-explorer',
    element: <ModelExplorer />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
