import React, { createContext, useContext, useState, useEffect } from 'react';
import { releases as defaultReleases } from '../data/releases';
import { mixes as defaultMixes } from '../data/mixes';
import { projects as defaultProjects } from '../data/projects';
import { news as defaultNews } from '../data/news';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    // Helper to load from storage or fallback to default
    const loadData = (key, fallback) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    };

    const [releases, setReleases] = useState(() => loadData('muvs_releases', defaultReleases));
    const [mixes, setMixes] = useState(() => loadData('muvs_mixes', defaultMixes));
    const [projects, setProjects] = useState(() => loadData('muvs_projects', defaultProjects));
    const [news, setNews] = useState(() => loadData('muvs_news', defaultNews));
    const [stats, setStats] = useState(() => loadData('muvs_stats', {
        totalVisits: 0,
        totalPlays: 0,
        daily: {}, // { "2024-12-07": 5, ... }
        sources: {}, // { "google.com": 10, "direct": 5, ... }
        pages: {}, // { "/music": 20, "/about": 10, ... }
        detailViews: 0
    }));
    const [messages, setMessages] = useState(() => loadData('muvs_messages', []));
    const [adminSettings, setAdminSettings] = useState(() => loadData('muvs_admin_settings', { pin: '1234' }));

    // Helper to safely save to localStorage
    const saveToStorage = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving to ${key}:`, error);
            // If quota exceeded, alert the user (only once to avoid spam)
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                alert('Storage Limit Reached! Cannot save changes. Please delete some items (like unused images) to free up space.');
            }
        }
    };

    // Persist changes to localStorage whenever state changes
    useEffect(() => { saveToStorage('muvs_releases', releases); }, [releases]);
    useEffect(() => { saveToStorage('muvs_mixes', mixes); }, [mixes]);
    useEffect(() => { saveToStorage('muvs_projects', projects); }, [projects]);
    useEffect(() => { saveToStorage('muvs_news', news); }, [news]);
    useEffect(() => { saveToStorage('muvs_stats', stats); }, [stats]);
    useEffect(() => { saveToStorage('muvs_messages', messages); }, [messages]);
    useEffect(() => { saveToStorage('muvs_admin_settings', adminSettings); }, [adminSettings]);

    const updateData = (type, newData) => {
        switch (type) {
            case 'releases': setReleases(newData); break;
            case 'mixes': setMixes(newData); break;
            case 'projects': setProjects(newData); break;
            case 'news': setNews(newData); break;
            default: console.warn(`Unknown data type: ${type}`);
        }
    };

    const trackVisit = (path, referrer = '') => {
        const today = new Date().toISOString().split('T')[0]; // "2024-12-07"

        setStats(prev => {
            const newStats = { ...prev };

            // Increment total visits
            newStats.totalVisits = (newStats.totalVisits || 0) + 1;

            // Track daily visits
            newStats.daily = { ...prev.daily };
            newStats.daily[today] = (newStats.daily[today] || 0) + 1;

            // Track page views
            newStats.pages = { ...prev.pages };
            newStats.pages[path] = (newStats.pages[path] || 0) + 1;

            // Track sources
            newStats.sources = { ...prev.sources };
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

            return newStats;
        });
    };

    const trackDetailView = () => {
        setStats(prev => ({
            ...prev,
            detailViews: (prev.detailViews || 0) + 1
        }));
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
        if (window.confirm('Are you sure you want to reset all data to defaults? This cannot be undone.')) {
            setReleases(defaultReleases);
            setMixes(defaultMixes);
            setProjects(defaultProjects);
            setNews(defaultNews);
            setStats({
                totalVisits: 0,
                totalPlays: 0,
                daily: {},
                sources: {},
                pages: {},
                detailViews: 0
            });
            setMessages([]);
            setAdminSettings({ pin: '1234' });
            localStorage.clear();
        }
    };

    const value = {
        releases,
        mixes,
        projects,
        news,
        stats,
        messages,
        adminSettings,
        updateData,
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
