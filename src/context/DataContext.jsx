import React, { createContext, useContext, useState, useEffect } from 'react';
import { releases as defaultReleases } from '../data/releases';
import { mixes as defaultMixes } from '../data/mixes';
import { projects as defaultProjects } from '../data/projects';
import { news as defaultNews } from '../data/news';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    // Helper to load from storage or fallback to default
    // Initial state with defaults
    const [releases, setReleases] = useState(defaultReleases);
    const [mixes, setMixes] = useState(defaultMixes);
    const [projects, setProjects] = useState(defaultProjects);
    const [news, setNews] = useState(defaultNews);
    const [newsSettings, setNewsSettings] = useState({
        titleFontSize: '60px',
        titleTopPosition: '20%',
        backgroundImageDesktop: '',
        backgroundImageMobile: ''
    });
    const [about, setAbout] = useState({
        title: 'ABOUT',
        content: 'I am a developer and music enthusiast passionate about building immersive digital experiences. With a background in both front-end engineering and electronic music production, I strive to bridge the gap between technical precision and artistic expression.',
        backgroundImage: ''
    });
    const [siteSettings, setSiteSettings] = useState({
        favicon: '',
        siteName: 'MUVS',
        siteDescription: 'Audio • Visual • Code',
        socialLinks: {
            instagram: 'https://instagram.com/muvs.dev',
            soundcloud: 'https://soundcloud.com/muvs',
            bandcamp: 'https://muvs.bandcamp.com',
            telegram: 'https://t.me/muvs_dev'
        }
    });
    const [stats, setStats] = useState({
        totalVisits: 0,
        totalPlays: 0,
        daily: {},
        sources: {},
        pages: {},
        countries: {},
        detailViews: 0
    });
    const [messages, setMessages] = useState([]);
    const [adminSettings, setAdminSettings] = useState({ pin: '1234' });
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch data from API on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/data');
                if (res.ok) {
                    const data = await res.json();
                    if (data.releases) setReleases(data.releases);
                    if (data.mixes) setMixes(data.mixes);
                    if (data.projects) setProjects(data.projects);
                    if (data.news) setNews(data.news);
                    if (data.newsSettings) setNewsSettings(data.newsSettings);
                    if (data.about) setAbout(data.about);
                    if (data.siteSettings) setSiteSettings(data.siteSettings);
                    if (data.messages) setMessages(data.messages);
                    if (data.adminSettings) setAdminSettings(data.adminSettings);
                    if (data.stats) setStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        fetchData();
    }, []);

    // Helper to save to API
    const saveToApi = (key, data) => {
        if (!isLoaded) return; // Don't save defaults over DB before loading

        fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: data })
        }).catch(err => console.error(`Error saving ${key}:`, err));
    };

    // Persist changes to API
    useEffect(() => { if (isLoaded) saveToApi('releases', releases); }, [releases, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('mixes', mixes); }, [mixes, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('projects', projects); }, [projects, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('news', news); }, [news, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('about', about); }, [about, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('siteSettings', siteSettings); }, [siteSettings, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('adminSettings', adminSettings); }, [adminSettings, isLoaded]);
    // Stats and Messages might be updated very frequently, consider debouncing or batching in real app
    // For now we sync them as is.
    useEffect(() => { if (isLoaded) saveToApi('stats', stats); }, [stats, isLoaded]);
    useEffect(() => { if (isLoaded) saveToApi('messages', messages); }, [messages, isLoaded]);

    const updateData = (type, newData) => {
        switch (type) {
            case 'releases': setReleases(newData); break;
            case 'mixes': setMixes(newData); break;
            case 'projects': setProjects(newData); break;
            case 'news': setNews(newData); break;
            case 'about': setAbout(newData); break;
            default: console.warn(`Unknown data type: ${type}`);
        }
    };

    const updateSiteSettings = (newSettings) => {
        setSiteSettings(newSettings);
    };

    const trackVisit = async (path, referrer = '') => {
        // Exclude admin and login paths
        if (path.startsWith('/admin') || path.startsWith('/login')) return;

        const today = new Date().toISOString().split('T')[0];

        // Try to get country
        let country = 'Unknown';
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                country = data.country_name || 'Unknown';
            }
        } catch (e) {
            console.warn('Failed to resolve country:', e);
        }

        setStats(prev => {
            const newStats = { ...prev };
            newStats.totalVisits = (newStats.totalVisits || 0) + 1;
            newStats.daily = { ...prev.daily };
            newStats.daily[today] = (newStats.daily[today] || 0) + 1;
            newStats.pages = { ...prev.pages };
            newStats.pages[path] = (newStats.pages[path] || 0) + 1;
            newStats.sources = { ...prev.sources };
            newStats.countries = { ...prev.countries };

            let source = 'direct';
            if (referrer) {
                try {
                    const url = new URL(referrer);
                    source = url.hostname.replace('www.', '');
                } catch (e) {
                    source = 'unknown';
                }
            }
            newStats.sources[source] = (newStats.sources[source] || 0) + 1;

            // Update country stats
            newStats.countries[country] = (newStats.countries[country] || 0) + 1;

            return newStats;
        });
    };

    const trackDetailView = () => {
        setStats(prev => ({ ...prev, detailViews: (prev.detailViews || 0) + 1 }));
    };

    const updatePin = (newPin) => {
        setAdminSettings({ pin: newPin });
    };

    const addMessage = (msg) => {
        const newMessage = { id: Date.now(), timestamp: new Date().toLocaleString(), ...msg };
        setMessages(prev => [newMessage, ...prev]);
    };

    const deleteMessage = (id) => {
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    const resetData = () => {
        if (window.confirm('Reset local state to code defaults? (Does not delete server DB immediately unless saved)')) {
            setReleases(defaultReleases);
            setMixes(defaultMixes);
            setProjects(defaultProjects);
            setNews(defaultNews);
            // ... reset others ...
        }
    };

    const value = {
        releases,
        mixes,
        projects,
        news,
        about,
        siteSettings,
        stats,
        messages,
        adminSettings,
        updateData,
        updateSiteSettings,
        trackVisit,
        trackDetailView,
        updatePin,
        addMessage,
        deleteMessage,
        resetData
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
