import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'about-1',
        title: 'ABOUT',
        artists: 'MUVS',
        description: 'Placeholder copy. Replace with the about-page intro once ready.',
        releaseDate: '',
        coverImage: '',
    },
];

const PORTFOLIO_PLACEHOLDERS = [
    { id: 'about-portfolio-1', label: 'Slot 1', url: '', x:  6, z: 14 },
    { id: 'about-portfolio-2', label: 'Slot 2', url: '', x: -6, z: 22 },
    { id: 'about-portfolio-3', label: 'Slot 3', url: '', x:  6, z: 30 },
];

const AboutPage3D = () => {
    const { about, siteSettings } = useData();
    const tg = siteSettings?.socialLinks?.telegram || 'https://t.me/muvs';
    const items = about?.content
        ? [{
            id: 'about',
            title: about.title || 'ABOUT',
            artists: 'MUVS',
            description: about.content,
            releaseDate: '',
            coverImage: about.backgroundImage || '',
        }]
        : FALLBACK;
    return (
        <Scene3DShell
            items={items}
            simple
            cfgStorageKey="muvs:scene3d:about:v1"
            serverCfgKey="aboutConfig"
            stopCount={5}
            showDebug
            portfolio={PORTFOLIO_PLACEHOLDERS}
            bottomAction={{ label: 'MAKE REQUEST', href: tg }}
        />
    );
};

export default AboutPage3D;
