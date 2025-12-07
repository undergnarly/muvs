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

    // Persist changes to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('muvs_releases', JSON.stringify(releases));
    }, [releases]);

    useEffect(() => {
        localStorage.setItem('muvs_mixes', JSON.stringify(mixes));
    }, [mixes]);

    useEffect(() => {
        localStorage.setItem('muvs_projects', JSON.stringify(projects));
    }, [projects]);

    useEffect(() => {
        localStorage.setItem('muvs_news', JSON.stringify(news));
    }, [news]);

    const updateData = (type, newData) => {
        switch (type) {
            case 'releases': setReleases(newData); break;
            case 'mixes': setMixes(newData); break;
            case 'projects': setProjects(newData); break;
            case 'news': setNews(newData); break;
            default: console.warn(`Unknown data type: ${type}`);
        }
    };

    const resetData = () => {
        if (window.confirm('Are you sure you want to reset all data to defaults? This cannot be undone.')) {
            setReleases(defaultReleases);
            setMixes(defaultMixes);
            setProjects(defaultProjects);
            setNews(defaultNews);
            localStorage.clear();
        }
    };

    const value = {
        releases,
        mixes,
        projects,
        news,
        updateData,
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
