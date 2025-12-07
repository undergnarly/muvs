import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/pages/HomePage';
import AboutPage from './components/pages/AboutPage';
import NewsPage from './components/pages/NewsPage';
import MusicPage from './components/pages/MusicPage';
import MixesPage from './components/pages/MixesPage';
import CodePage from './components/pages/CodePage';
import { ROUTES } from './utils/constants';

function App() {
  return (
    <>
      <Routes>
        <Route path={ROUTES.HOME} element={<MusicPage />} />
        <Route path={ROUTES.MIXES} element={<MixesPage />} />
        <Route path={ROUTES.CODE} element={<CodePage />} />
        <Route path={ROUTES.NEWS} element={<NewsPage />} />
        <Route path={ROUTES.ABOUT} element={<AboutPage />} />
      </Routes>
    </>
  );
}

export default App;
