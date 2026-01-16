import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';


// Public Pages - Static Import for maximum speed and smooth transitions
import HomePage from './components/pages/HomePage';
import AboutPage from './components/pages/AboutPage';
import NewsPage from './components/pages/NewsPage';
import MusicPage from './components/pages/MusicPage';
import MixesPage from './components/pages/MixesPage';
import CodePage from './components/pages/CodePage';
import LecturePage from './components/pages/LecturePage';
import LectureTextPage from './components/pages/LectureTextPage';
import CVPage from './components/pages/CVPage';

// Admin Pages - Lazy Load (Keep heavy admin libs out of main bundle)
const LoginPage = React.lazy(() => import('./components/admin/LoginPage'));
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
  <div style={{ height: '100vh', width: '100vw', background: 'var(--color-bg-dark)' }} />
);

function App() {
  const { trackVisit, siteSettings } = useData();
  const location = useLocation();

  React.useEffect(() => {
    // Track visit with current path and referrer
    trackVisit(location.pathname, document.referrer);
  }, [location.pathname]);

  // Remove Splash Screen on Mount
  React.useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      // Small delay to ensure smooth visual transition
      setTimeout(() => {
        splash.classList.add('hidden');
        // Optional: Remove from DOM after transition
        setTimeout(() => splash.remove(), 1000);
      }, 500);
    }
  }, []);

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



  // Check if current route is lecture page
  const isLecturePage = location.pathname === ROUTES.LECTURE;

  return (
    <>
      {!isLecturePage && <TopBlur />}
      {!isLecturePage && <PageGradient />}
      <Routes>
        <Route path={ROUTES.HOME} element={<MusicPage />} />
        <Route path={ROUTES.ABOUT} element={<AboutPage />} />
        <Route path={ROUTES.NEWS} element={<NewsPage />} />
        <Route path={ROUTES.MUSIC} element={<MusicPage />} />
        <Route path={ROUTES.MIXES} element={<MixesPage />} />
        <Route path={ROUTES.CODE} element={<CodePage />} />
        <Route path={ROUTES.LECTURE} element={<LecturePage />} />
        <Route path={ROUTES.LECTURE_TEXT} element={<LectureTextPage />} />
        <Route path={ROUTES.CV} element={<CVPage />} />
        <Route path="/login" element={
          <Suspense fallback={<LoadingFallback />}>
            <LoginPage />
          </Suspense>
        } />

        <Route path="/admin" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout />
          </Suspense>
        }>
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
    </>
  );
}

export default App;
