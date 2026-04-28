import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'news-placeholder-1',
        title: 'NEWS ITEM ONE',
        artists: 'MUVS',
        description: 'Placeholder news entry — replace with real content.',
        releaseDate: '',
        coverImage: '',
    },
    {
        id: 'news-placeholder-2',
        title: 'NEWS ITEM TWO',
        artists: 'MUVS',
        description: 'Another placeholder news entry.',
        releaseDate: '',
        coverImage: '',
    },
];

const PORTFOLIO_PLACEHOLDERS = [
    { id: 'news-portfolio-1', label: 'Slot 1', url: '', x:  6, z: 14 },
    { id: 'news-portfolio-2', label: 'Slot 2', url: '', x: -6, z: 22 },
    { id: 'news-portfolio-3', label: 'Slot 3', url: '', x:  6, z: 30 },
];

const mapNews = (n) => ({
    id: n.id,
    title: n.title || '',
    artists: n.author || 'MUVS',
    description: n.content || n.description || '',
    releaseDate: n.date || '',
    coverImage: n.image || '',
});

const NewsPage3D = () => {
    const { news, siteSettings } = useData();
    const tg = siteSettings?.socialLinks?.telegram || 'https://t.me/muvs';
    const items = (news && news.length > 0) ? news.map(mapNews) : FALLBACK;
    return (
        <Scene3DShell
            items={items}
            simple
            cfgStorageKey="muvs:scene3d:news:v1"
            serverCfgKey="newsConfig"
            stopCount={5}
            showDebug
            portfolio={PORTFOLIO_PLACEHOLDERS}
            bottomAction={{ label: 'MAKE REQUEST', href: tg }}
        />
    );
};

export default NewsPage3D;
