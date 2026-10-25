import React, { createContext, useContext, useState, useEffect } from 'react';
import { releases as defaultReleases } from '../data/releases';
import { mixes as defaultMixes } from '../data/mixes';
import { projects as defaultProjects } from '../data/projects';
import { news as defaultNews } from '../data/news';
import { createConfirmedDataWriter, mergeConfirmedSiteSettings, saveConfirmedSiteSettings } from '../utils/confirmedDataSave';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    // The API payload is the only runtime source of truth. Code defaults are
    // retained below solely for the explicit admin reset action.
    const [releases, setReleases] = useState([]);
    const [mixes, setMixes] = useState([]);
    const [projects, setProjects] = useState([]);
    const [news, setNews] = useState([]);
    const [newsSettings, setNewsSettings] = useState({});
    const [about, setAbout] = useState({});
    const [siteSettings, setSiteSettings] = useState({});
    const [stats, setStats] = useState({});
    const [messages, setMessages] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [siteSettingsReady, setSiteSettingsReady] = useState(false);

    // Fetch data from API on mount
    useEffect(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let cancelled = false;
        const fetchData = async () => {
            try {
                const res = await fetch('/api/data', { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    if (cancelled) return;
                    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid site data');
                    if (data.releases) setReleases(data.releases);
                    if (data.mixes) setMixes(data.mixes);
                    if (data.projects) setProjects(data.projects);
                    if (data.news) setNews(data.news);
                    if (data.newsSettings) setNewsSettings(data.newsSettings);
                    if (data.about) setAbout(data.about);
                    if (data.siteSettings) setSiteSettings(data.siteSettings);
                    if (data.messages) setMessages(data.messages);
                    if (data.stats) setStats(data.stats);
                    setSiteSettingsReady(true);
                }
            } catch (error) {
                if (!cancelled) console.error('Failed to fetch data:', error);
            } finally {
                clearTimeout(timeout);
                if (!cancelled) setIsLoaded(true);
            }
        };
        fetchData();
        return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
    }, []);

    const contentWriter = React.useMemo(() => createConfirmedDataWriter({ onCommit: (type, data) => {
        switch (type) {
            case 'releases': setReleases(data); break;
            case 'mixes': setMixes(data); break;
            case 'projects': setProjects(data); break;
            case 'news': setNews(data); break;
            case 'newsSettings': setNewsSettings(data); break;
            case 'about': setAbout(data); break;
            case 'messages': setMessages(data); break;
        }
    } }), []);

    const updateData = React.useCallback(async (type, newData) => {
        if (!isLoaded || !siteSettingsReady) throw new Error('Site data could not load. Reload before saving. Your draft is still here.');
        return contentWriter(type, newData);
    }, [contentWriter, isLoaded, siteSettingsReady]);

    const updateSiteSettings = React.useCallback(async (newSettings) => {
        if (!isLoaded || !siteSettingsReady) throw new Error('Site settings are not loaded yet');
        const { result, submitted } = await saveConfirmedSiteSettings(newSettings);
        setSiteSettings(previous => mergeConfirmedSiteSettings(previous, submitted, result));
        return result;
    }, [isLoaded, siteSettingsReady]);

    const addMessage = (msg) => {
        const newMessage = { id: Date.now(), timestamp: new Date().toLocaleString(), ...msg };
        return updateData('messages', [newMessage, ...messages]);
    };

    const deleteMessage = (id) => {
        return updateData('messages', messages.filter(m => m.id !== id));
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
        newsSettings,
        about,
        siteSettings,
        stats,
        messages,
        isLoaded,
        siteSettingsReady,
        updateData,
        updateSiteSettings,
        addMessage,
        deleteMessage,
        resetData
    };

    return (
        <DataContext.Provider value={value}>
            {isLoaded ? children : (
                <div style={{ width: '100vw', height: '100vh', background: '#ffffff' }} aria-hidden="true" />
            )}
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
