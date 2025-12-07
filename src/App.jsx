import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './components/pages/HomePage';
import AboutPage from './components/pages/AboutPage';
import NewsPage from './components/pages/NewsPage';
import MusicPage from './components/pages/MusicPage';
import MixesPage from './components/pages/MixesPage';
import CodePage from './components/pages/CodePage';
import LoginPage from './components/admin/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import NewsManager from './components/admin/NewsManager';
import MusicManager from './components/admin/MusicManager';
import MixesManager from './components/admin/MixesManager';
import ProjectsManager from './components/admin/ProjectsManager';
import MessagesManager from './components/admin/MessagesManager';
import AdminSettings from './components/admin/AdminSettings';
import { ROUTES } from './utils/constants';
import { useData } from './context/DataContext';
import { useLocation } from 'react-router-dom';

function App() {
  const { trackVisit } = useData();
  const location = useLocation();

  React.useEffect(() => {
    // Track visit with current path and referrer
    trackVisit(location.pathname, document.referrer);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<MusicPage />} />
      <Route path={ROUTES.MIXES} element={<MixesPage />} />
      <Route path={ROUTES.CODE} element={<CodePage />} />
      <Route path={ROUTES.NEWS} element={<NewsPage />} />
      <Route path={ROUTES.ABOUT} element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="news" element={<NewsManager />} />
        <Route path="music" element={<MusicManager />} />
        <Route path="mixes" element={<MixesManager />} />
        <Route path="projects" element={<ProjectsManager />} />
        <Route path="messages" element={<MessagesManager />} />
        <Route path="settings" element={<AdminSettings />} />
        {/* Sub-routes will be added here */}
      </Route>
    </Routes>
  );
}

export default App;
