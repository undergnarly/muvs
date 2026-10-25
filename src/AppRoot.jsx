import React, { Suspense } from 'react';
import { Routes, Route, useLocation, useParams } from 'react-router-dom';

// Keep the main 3D world and its static recovery routes immediately available.
import MusicPage from './components/pages/MusicPage';
import MixesPage from './components/pages/MixesPage';
import CodePage from './components/pages/CodePage';
import HomeNewPage, { MusicNewPage, MixesHubPage, CodeHubPage, AboutHubPage, RadioHubPage } from './components/pages/HomeNewPage';
import NewsPage3D from './components/pages/NewsPage3D';
import CVPage3D from './components/pages/CVPage3D';
import LecturePage3D from './components/pages/LecturePage3D';
import LectureTextPage3D from './components/pages/LectureTextPage3D';

// Optional legacy reading/demo routes do not participate in the first 3D view.
const AboutPage = React.lazy(() => import('./components/pages/AboutPage'));
const NewsPage = React.lazy(() => import('./components/pages/NewsPage'));
const CVPage = React.lazy(() => import('./components/pages/CVPage'));
const LecturePage = React.lazy(() => import('./components/pages/LecturePage'));
const LectureTextPage = React.lazy(() => import('./components/pages/LectureTextPage'));
const TestPage = React.lazy(() => import('./components/pages/TestPage'));

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
import FilmLeakOverlay from './components/layout/FilmLeakOverlay';
import PublicSeo from './components/layout/PublicSeo';
import { dispatchFilmTransition } from './utils/filmLeak';
import { isSceneFilmRoute, normalizeSceneFilmPath } from './utils/sceneFilmTransition';
import { ROUTES } from './utils/constants';
import { useData } from './context/DataContext';
import { waitForMenuArtwork, markMenuRevealed } from './utils/menuStartup';
import { settleWithin } from './utils/menuStartupGate';
import { cancelSplashDrawing, completeSplashDrawing } from './utils/splashProgress';
import { departSplash, finishStartupDive, guardStartupInput } from './utils/startupDive';
import { MENU_ARTWORK, getObjectFallbackSrc } from './data/menuArtwork';
import { RADIO_STATIONS } from './data/radio';

const StartupFallback = () => (
    <main style={{ position: 'fixed', inset: 0, zIndex: 9998, overflow: 'auto', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#222', background: 'linear-gradient(to bottom, #696969, #a3a3a3 22%, #d8d8d8 46%, #fff 64%)' }}>
        <div>
            <img src={getObjectFallbackSrc(MENU_ARTWORK[0])} alt="MUVS sound system" width="280" height="280" style={{ width: 'min(65vw, 280px)', height: 'auto' }} />
            <h1 style={{ fontSize: 24, margin: '16px 0' }}>MUVS</h1>
            <p role="status">The 3D view couldn’t load. Your music is still here.</p>
            <nav aria-label="Static site navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', margin: '20px 0' }}>
                <a href={ROUTES.MUSIC_OLD}>Music</a><a href={ROUTES.MIXES_OLD}>Mixes</a><a href={ROUTES.CODE_OLD}>Code</a>
                <a href="#radio-fallback">Radio</a>
            </nav>
            <section id="radio-fallback" aria-label="Radio preview" style={{ margin: '24px auto', maxWidth: 500 }}>
                <h2>Radio — Coming soon</h2>
                <p>Three eras. One frequency.</p>
                <ul style={{ padding: 0, listStyle: 'none' }}>{RADIO_STATIONS.map(station => (
                    <li key={station.id} style={{ margin: '12px 0' }}><strong>{station.title}</strong> · {station.era}<br />{station.genres.join(' · ')}</li>
                ))}</ul>
            </section>
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

const NotFoundPage = () => (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div><h1>Page not found</h1><p>This page is not available.</p><a href="/">Back to MUVS</a></div>
    </main>
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

    if (isLoaded && !releaseExists) return <NotFoundPage />;
    return <MusicNewPage releaseSlug={slug} />;
};

function AppRoot() {
    const { siteSettings, releases, mixes, projects, news, about, siteSettingsReady } = useData();
    const location = useLocation();
    const filmPath = normalizeSceneFilmPath(location.pathname);
    const filmPrivate = /^\/(?:admin|login)(?:\/|$)/.test(filmPath);
    const previousFilmPath = React.useRef(filmPath);
    const [startupFailed, setStartupFailed] = React.useState(false);

    React.useEffect(() => {
        const changed = previousFilmPath.current !== filmPath;
        previousFilmPath.current = filmPath;
        if (changed && !document.getElementById('splash-screen') && !filmPrivate) {
            dispatchFilmTransition();
        }
    }, [filmPath, filmPrivate]);

    React.useEffect(() => {
        window.dispatchEvent(new Event('muvs:app-mounted'));
    }, []);

    React.useEffect(() => {
        if (!startupFailed) return;
        cancelSplashDrawing();
        document.getElementById('splash-screen')?.remove();
        finishStartupDive();
        markMenuRevealed();
    }, [startupFailed]);


    React.useEffect(() => {
        const splash = document.getElementById('splash-screen');
        if (!splash || startupFailed) return undefined;

        let removed = false;
        let cancelled = false;
        let departure;
        let routeTimer;
        let completing = false;
        const unguard = guardStartupInput();
        const hideSplash = async () => {
            if (removed || cancelled) return;
            if (completing) return;
            completing = true;
            const completed = await completeSplashDrawing();
            if (!completed || removed || cancelled) return;
            const status = document.getElementById('splash-status');
            if (status) status.textContent = 'READY';
            departure = departSplash(splash, markMenuRevealed);
            await departure.finished;
            if (cancelled) return;
            removed = true;
            unguard();
        };
        const path = location.pathname;
        const sceneRoute = isSceneFilmRoute(path, releases || [])
            || /^\/(?:news|cv|lecture|lecture-text)\/?$/i.test(path);
        if (sceneRoute) {
            // Reveal a drawn poster immediately; full video buffers warm behind it.
            // The deadline handles an actual scene/renderer failure only.
            const ready = waitForMenuArtwork().then(() => true);
            settleWithin(ready, 15000).then((success) => {
                if (cancelled) return;
                if (!success) setStartupFailed(true);
                else hideSplash();
            });
        } else {
            routeTimer = setTimeout(hideSplash, 500);
        }
        return () => {
            cancelled = true;
            cancelSplashDrawing();
            clearTimeout(routeTimer);
            departure?.cancel();
            unguard();
            if (removed || departure) { splash.remove(); finishStartupDive(); markMenuRevealed(); }
        };
    // Public data is loaded before AppRoot mounts; later CMS edits must not
    // restart the user's completed splash animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, startupFailed]);

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

    const scene3DPaths = [
        ROUTES.HOME,
        ROUTES.MUSIC,
        ROUTES.ABOUT,
        ROUTES.NEWS,
        ROUTES.MIXES,
        ROUTES.CODE,
        ROUTES.RADIO,
        ROUTES.CV,
        ROUTES.LECTURE,
        ROUTES.LECTURE_TEXT,
    ];
    const currentPathSlug = normalizeReleaseSlug(filmPath.slice(1));
    const isReleasePermalink = !filmPath.slice(1).includes('/') && (releases || []).some((release) => (
        release.active !== false
        && normalizeReleaseSlug(release.slug || release.title) === currentPathSlug
    ));
    const hideOverlays = scene3DPaths.includes(filmPath) || isReleasePermalink || filmPath.startsWith('/dubplates');
    const hideTopBlur = hideOverlays || filmPath.startsWith('/projects');
    const filmInScene = isSceneFilmRoute(location.pathname, releases || []);

    if (startupFailed) return <StartupFallback />;

    return (
        <>
            <PublicSeo data={{ releases, mixes, projects, news, about, siteSettings }} ready={siteSettingsReady} />
            {!filmInScene && !filmPrivate && !filmPath.startsWith('/dubplates') && <FilmLeakOverlay routeKey={filmPath} settings={siteSettings?.visualEffects} />}
            {!hideTopBlur && <TopBlur />}
            {!hideOverlays && <PageGradient />}
            <MenuSceneBoundary onFailure={() => setStartupFailed(true)}><Routes>
                <Route path="/dubplates" element={<Suspense fallback={<LoadingFallback />}><DubplatesPage /></Suspense>} />
                <Route path={ROUTES.HOME} element={<Suspense fallback={null}><HomeNewPage /></Suspense>} />
                <Route path={ROUTES.MUSIC} element={<MusicNewPage />} />
                <Route path={ROUTES.ABOUT} element={<AboutHubPage />} />
                <Route path={ROUTES.NEWS} element={<NewsPage3D />} />
                <Route path={ROUTES.MIXES} element={<MixesHubPage />} />
                <Route path={ROUTES.CODE} element={<CodeHubPage />} />
                <Route path={ROUTES.RADIO} element={<RadioHubPage />} />
                <Route path={ROUTES.LECTURE} element={<LecturePage3D />} />
                <Route path={ROUTES.LECTURE_TEXT} element={<LectureTextPage3D />} />
                <Route path={ROUTES.CV} element={<CVPage3D />} />
                <Route path={ROUTES.HOME_OLD} element={<MusicPage />} />
                <Route path={ROUTES.MUSIC_OLD} element={<MusicPage />} />
                <Route path={ROUTES.ABOUT_OLD} element={<Suspense fallback={<LoadingFallback />}><AboutPage /></Suspense>} />
                <Route path={ROUTES.NEWS_OLD} element={<Suspense fallback={<LoadingFallback />}><NewsPage /></Suspense>} />
                <Route path={ROUTES.MIXES_OLD} element={<MixesPage />} />
                <Route path={ROUTES.CODE_OLD} element={<CodePage />} />
                <Route path={ROUTES.LECTURE_OLD} element={<Suspense fallback={<LoadingFallback />}><LecturePage /></Suspense>} />
                <Route path={ROUTES.LECTURE_TEXT_OLD} element={<Suspense fallback={<LoadingFallback />}><LectureTextPage /></Suspense>} />
                <Route path={ROUTES.CV_OLD} element={<Suspense fallback={<LoadingFallback />}><CVPage /></Suspense>} />
                <Route path={ROUTES.TEST} element={<Suspense fallback={<LoadingFallback />}><TestPage /></Suspense>} />
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
                <Route path="*" element={<NotFoundPage />} />
            </Routes></MenuSceneBoundary>
        </>
    );
}

export default AppRoot;
