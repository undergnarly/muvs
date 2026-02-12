import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './AppRoot.jsx';
import { DataProvider } from './context/DataContext';
import './styles/global.css';

console.log("DEBUG: main.jsx loaded - importing AppRoot");

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <DataProvider>
                <App />
            </DataProvider>
        </BrowserRouter>
    </React.StrictMode>,
);
