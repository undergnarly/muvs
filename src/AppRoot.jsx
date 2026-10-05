import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

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
import HomeNewPage, { MusicNewPage, MixesHubPage, CodeHubPage, AboutHubPage } from './components/pages/HomeNewPage';
import NewsPage3D from './components/pages/NewsPage3D';
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
const DubplatesPage = React.lazy(() => import('./components/pages/DubplatesPage'));
const DubplatesManager = React.lazy(() => import('./components/admin/DubplatesManager'));

import TopBlur from './components/layout/TopBlur';
import PageGradient from './components/layout/PageGradient';
import { ROUTES } from './utils/constants';
import { useData } from './context/DataContext';
import { waitForMenuArtwork, markMenuRevealed } from './utils/menuStartup';
import { settleWithin } from './utils/menuStartupGate';
import { updateSplashProgress } from './utils/splashProgress';
import { MENU_ARTWORK, getObjectFallbackSrc } from './data/menuArtwork';

const StartupFallback = () => (
    <main style={{ position: 'fixed', inset: 0, zIndex: 9998, overflow: 'auto', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#222', background: 'linear-gradient(to bottom, #696969, #a3a3a3 22%, #d8d8d8 46%, #fff 64%)' }}>
        <div>
            <img src={getObjectFallbackSrc(MENU_ARTWORK[0])} alt="MUVS sound system" width="280" height="280" style={{ width: 'min(65vw, 280px)', height: 'auto' }} />
            <h1 style={{ fontSize: 24, margin: '16px 0' }}>MUVS</h1>
            <p role="status">The 3D view couldn’t load. Your music is still here.</p>
            <nav aria-label="Static site navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', margin: '20px 0' }}>
                <a href={ROUTES.MUSIC_OLD}>Music</a><a href={ROUTES.MIXES_OLD}>Mixes</a><a href={ROUTES.CODE_OLD}>Code</a>
            </nav>
            <a href="/" style={{ display: 'inline-block', padding: '12px 20px', border: '1px solid currentColor', borderRadius: 30 }}>Reload 3D menu</a>
        </div>
    </main>
);

class MenuSceneBoundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { this.props.onFailure(); }
    render() { return this.state.failed ? null : this.props.children; }
}

const LoadingFallback = () => (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--color-bg-dark)' }} />
);

const normalizeReleaseSlug = (value) => (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const ReleasePermalinkRoute = () => {
    const { releaseSlug = '' } = useParams();
    const { releases, isLoaded } = useData();
    const slug = normalizeReleaseSlug(releaseSlug);
    const releaseExists = (releases || []).some((release) => (
        release.active !== false
        && normalizeReleaseSlug(release.slug || release.title) === slug
    ));

    if (isLoaded && !releaseExists) return <Navigate to={ROUTES.HOME} replace />;
    return <MusicNewPage releaseSlug={slug} />;
};

function AppRoot() {
    const { trackVisit, siteSettings, releases } = useData();
    const location = useLocation();
    const [startupFailed, setStartupFailed] = React.useState(false);

    React.useEffect(() => {
        window.dispatchEvent(new Event('muvs:app-mounted'));
    }, []);

    React.useEffect(() => {
        if (!startupFailed) return;
        document.getElementById('splash-screen')?.remove();
        markMenuRevealed();
    }, [startupFailed]);


    React.useEffect(() => {
        // Track visit with current path and referrer
        if (!location.pathname.startsWith('/dubplates')) trackVisit(location.pathname, document.referrer);
    }, [location.pathname]);

    React.useEffect(() => {
        const splash = document.getElementById('splash-screen');
        if (!splash) return undefined;

        let removed = false;
        let cancelled = false;
        let removeTimer;
        let routeTimer;
        const hideSplash = () => {
            if (removed || cancelled) return;
            removed = true;
            updateSplashProgress(100);
            const status = document.getElementById('splash-status');
            if (status) status.textContent = 'READY';
            splash.classList.add('hidden');
            removeTimer = setTimeout(() => { splash.remove(); markMenuRevealed(); }, 600);
        };
        if (location.pathname === '/') {
            // Reveal a drawn poster immediately; full video buffers warm behind it.
            // The deadline handles an actual scene/renderer failure only.
            const ready = waitForMenuArtwork().then(() => true);
            settleWithin(ready, 15000).then((success) => {
                if (cancelled) return;
                if (!success) setStartupFailed(true);
                hideSplash();
            });
        } else {
            routeTimer = setTimeout(hideSplash, 500);
        }
        return () => {
            cancelled = true;
            clearTimeout(routeTimer);
            clearTimeout(removeTimer);
            if (removed) { splash.remove(); markMenuRevealed(); }
        };
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
        if (location.pathname.startsWith('/dubplates')) return;
        if (siteSettings?.siteName) {
            document.title = `${siteSettings.siteName} | ${siteSettings.siteDescription || 'Audio • Visual • Code'}`;
        }

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && siteSettings?.siteDescription) {
            metaDescription.content = siteSettings.siteDescription;
        }
    }, [siteSettings?.siteName, siteSettings?.siteDescription, location.pathname]);

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
    ];
    const currentPathSlug = normalizeReleaseSlug(location.pathname.replace(/^\//, ''));
    const isReleasePermalink = !location.pathname.slice(1).includes('/') && (releases || []).some((release) => (
        release.active !== false
        && normalizeReleaseSlug(release.slug || release.title) === currentPathSlug
    ));
    const hideOverlays = scene3DPaths.includes(location.pathname) || isReleasePermalink || location.pathname.startsWith('/dubplates');
    const hideTopBlur = hideOverlays || location.pathname.startsWith('/projects');

    return (
        <>
            {!hideTopBlur && <TopBlur />}
            {!hideOverlays && <PageGradient />}
            <Routes>
                <Route path="/dubplates" element={<Suspense fallback={<LoadingFallback />}><DubplatesPage /></Suspense>} />
                <Route path={ROUTES.HOME} element={startupFailed ? <StartupFallback /> : (
                    <MenuSceneBoundary onFailure={() => setStartupFailed(true)}>
                        <Suspense fallback={null}><HomeNewPage /></Suspense>
                    </MenuSceneBoundary>
                )} />
                <Route path={ROUTES.MUSIC} element={<MusicNewPage />} />
                <Route path={ROUTES.ABOUT} element={<AboutHubPage />} />
                <Route path={ROUTES.NEWS} element={<NewsPage3D />} />
                <Route path={ROUTES.MIXES} element={<MixesHubPage />} />
                <Route path={ROUTES.CODE} element={<CodeHubPage />} />
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
                    <Route path="dubplates" element={<DubplatesManager />} />
                    <Route path="mixes" element={<MixesManager />} />
                    <Route path="projects" element={<ProjectsManager />} />
                    <Route path="about" element={<AboutManager />} />
                    <Route path="messages" element={<MessagesManager />} />
                    <Route path="settings" element={<AdminSettings />} />
                </Route>
                <Route path="/:releaseSlug" element={<ReleasePermalinkRoute />} />
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Routes>
        </>
    );
}

export default AppRoot;
