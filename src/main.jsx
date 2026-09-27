import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';

// The shared-link library does not load the site's 3D scene or public CMS data.
const App = React.lazy(() => import('./AppRoot.jsx'));
const SiteProvider = React.lazy(() => import('./context/DataContext').then((module) => ({ default: module.DataProvider })));
const DubplatesPage = React.lazy(() => import('./components/pages/DubplatesPage'));
const isDubplates = /^\/dubplates\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <React.Suspense fallback={null}>
                {isDubplates ? <DubplatesPage /> : <SiteProvider><App /></SiteProvider>}
            </React.Suspense>
        </BrowserRouter>
    </React.StrictMode>,
);
