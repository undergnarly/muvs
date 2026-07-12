import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Public Pages - Static Import for maximum speed and smooth transitions
import AboutPage from './components/pages/AboutPage';
import NewsPage from './components/pages/NewsPage';
import MusicPage from './components/pages/MusicPage';
import MixesPage from './components/pages/MixesPage';
import CodePage from './components/pages/CodePage';
import LecturePage from './components/pages/LecturePage';
import LectureTextPage from './components/pages/LectureTextPage';
import CVPage from './components/pages/CVPage';
import TestPage from './components/pages/TestPage';
import ThreeDPage from './components/pages/ThreeDPage';
import HomeNewPage, { MusicNewPage } from './components/pages/HomeNewPage';
import AboutPage3D from './components/pages/AboutPage3D';
import NewsPage3D from './components/pages/NewsPage3D';
import MixesPage3D from './components/pages/MixesPage3D';
import CodePage3D from './components/pages/CodePage3D';
import CVPage3D from './components/pages/CVPage3D';
import LecturePage3D from './components/pages/LecturePage3D';
import LectureTextPage3D from './components/pages/LectureTextPage3D';

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
const MeditationProjectPage = React.lazy(() => import('./components/projects/MeditationProjectPage'));
const ProjectsHubPage = React.lazy(() => import('./components/projects/ProjectsHubPage'));

import TopBlur from './components/layout/TopBlur';
import PageGradient from './components/layout/PageGradient';
import { ROUTES } from './utils/constants';
import { useData } from './context/DataContext';

const LoadingFallback = () => (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--color-bg-dark)' }} />
);

function AppRoot() {
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

    const scene3DPaths = [
        ROUTES.HOME,
        ROUTES.MUSIC,
        ROUTES.ABOUT,
        ROUTES.NEWS,
        ROUTES.MIXES,
        ROUTES.CODE,
        ROUTES.CV,
        ROUTES.LECTURE,
        ROUTES.LECTURE_TEXT,
        ROUTES.THREE_D,
    ];
    const hideOverlays = scene3DPaths.includes(location.pathname);
    const hideTopBlur = hideOverlays || location.pathname.startsWith('/projects');

    return (
        <>
            {!hideTopBlur && <TopBlur />}
            {!hideOverlays && <PageGradient />}
            <Routes>
                <Route path={ROUTES.HOME} element={<HomeNewPage />} />
                <Route path={ROUTES.MUSIC} element={<MusicNewPage />} />
                <Route path={ROUTES.ABOUT} element={<AboutPage3D />} />
                <Route path={ROUTES.NEWS} element={<NewsPage3D />} />
                <Route path={ROUTES.MIXES} element={<MixesPage3D />} />
                <Route path={ROUTES.CODE} element={<CodePage3D />} />
                <Route path={ROUTES.LECTURE} element={<LecturePage3D />} />
                <Route path={ROUTES.LECTURE_TEXT} element={<LectureTextPage3D />} />
                <Route path={ROUTES.CV} element={<CVPage3D />} />
                <Route path={ROUTES.HOME_OLD} element={<MusicPage />} />
                <Route path={ROUTES.MUSIC_OLD} element={<MusicPage />} />
                <Route path={ROUTES.ABOUT_OLD} element={<AboutPage />} />
                <Route path={ROUTES.NEWS_OLD} element={<NewsPage />} />
                <Route path={ROUTES.MIXES_OLD} element={<MixesPage />} />
                <Route path={ROUTES.CODE_OLD} element={<CodePage />} />
                <Route path={ROUTES.LECTURE_OLD} element={<LecturePage />} />
                <Route path={ROUTES.LECTURE_TEXT_OLD} element={<LectureTextPage />} />
                <Route path={ROUTES.CV_OLD} element={<CVPage />} />
                <Route path={ROUTES.TEST} element={<TestPage />} />
                <Route path={ROUTES.THREE_D} element={<ThreeDPage />} />
                <Route path="/projects/meditation" element={
                    <Suspense fallback={<LoadingFallback />}>
                        <MeditationProjectPage />
                    </Suspense>
                } />
                <Route path="/projects" element={
                    <Suspense fallback={<LoadingFallback />}>
                        <ProjectsHubPage />
                    </Suspense>
                } />
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

export default AppRoot;
