import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Lazy load pages
const AboutPage = React.lazy(() => import('./components/pages/AboutPage'));
const NewsPage = React.lazy(() => import('./components/pages/NewsPage'));
const MusicPage = React.lazy(() => import('./components/pages/MusicPage'));
const MixesPage = React.lazy(() => import('./components/pages/MixesPage'));
const CodePage = React.lazy(() => import('./components/pages/CodePage'));
const LoginPage = React.lazy(() => import('./components/admin/LoginPage'));

// Lazy load Admin components
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = React.lazy(() => import('./components/admin/Dashboard'));
const NewsManager = React.lazy(() => import('./components/admin/NewsManager'));
const MusicManager = React.lazy(() => import('./components/admin/MusicManager'));
const MixesManager = React.lazy(() => import('./components/admin/MixesManager'));
const ProjectsManager = React.lazy(() => import('./components/admin/ProjectsManager'));
const AboutManager = React.lazy(() => import('./components/admin/AboutManager'));
const MessagesManager = React.lazy(() => import('./components/admin/MessagesManager'));
const AdminSettings = React.lazy(() => import('./components/admin/AdminSettings'));

import TopBlur from './components/layout/TopBlur';
import PageGradient from './components/layout/PageGradient';
import { ROUTES } from './utils/constants';
import { useData } from './context/DataContext';

const LoadingFallback = () => (
  <div style={{
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    zIndex: 100,
    position: 'relative'
  }}>
    <div style={{
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255,255,255,0.1)',
      borderTopColor: '#ccff00',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  const { trackVisit, siteSettings } = useData();
  const location = useLocation();

  React.useEffect(() => {
    // Track visit with current path and referrer
    trackVisit(location.pathname, document.referrer);
  }, [location.pathname]);

  // Update favicon dynamically
  React.useEffect(() => {
    if (siteSettings?.favicon) {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.href = siteSettings.favicon;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.type = 'image/png';
        newFavicon.href = siteSettings.favicon;
        document.head.appendChild(newFavicon);
      }
    }
  }, [siteSettings?.favicon]);

  // Update document title and meta description
  React.useEffect(() => {
    if (siteSettings?.siteName) {
      document.title = `${siteSettings.siteName} | ${siteSettings.siteDescription || 'Audio • Visual • Code'}`;
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && siteSettings?.siteDescription) {
      metaDescription.content = siteSettings.siteDescription;
    }
  }, [siteSettings?.siteName, siteSettings?.siteDescription]);

  return (
    <>
      <TopBlur />
      <PageGradient />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path={ROUTES.HOME} element={<MusicPage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.NEWS} element={<NewsPage />} />
          <Route path={ROUTES.MUSIC} element={<MusicPage />} />
          <Route path={ROUTES.MIXES} element={<MixesPage />} />
          <Route path={ROUTES.CODE} element={<CodePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="news" element={<NewsManager />} />
            <Route path="music" element={<MusicManager />} />
            <Route path="mixes" element={<MixesManager />} />
            <Route path="projects" element={<ProjectsManager />} />
            <Route path="about" element={<AboutManager />} />
            <Route path="messages" element={<MessagesManager />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
