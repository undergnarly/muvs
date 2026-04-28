import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'code-placeholder-1',
        title: 'PROJECT ONE',
        artists: 'MUVS',
        description: 'Placeholder code project.',
        releaseDate: '',
        coverImage: '',
    },
    {
        id: 'code-placeholder-2',
        title: 'PROJECT TWO',
        artists: 'MUVS',
        description: 'Another placeholder project.',
        releaseDate: '',
        coverImage: '',
    },
];

const PORTFOLIO_PLACEHOLDERS = [
    {
        id: 'pacha-alpaca',
        label: 'Pacha Alpaca',
        url: 'https://www.pacha-alpaca.com/',
        image: '/images/portfolio/pacha-alpaca.png',
        description: 'Сторителлинговый сайт альпака-фермы на Бали: бронирование лоджей, секции про опыт, фотогалерея. Mobile-first, плавная навигация.',
        x:  6, z: 14,
    },
    {
        id: 'bimx',
        label: 'BIMX Development',
        url: 'https://bimx.dv',
        image: '/images/portfolio/bimx.png',
        description: 'Лендинг строительной компании в Бали. Лид-генерация, кейсы проектов, вызов на связь и форма заявок.',
        x: -6, z: 22,
    },
    {
        id: 'portfolio-3',
        label: 'Project Three',
        url: '',
        image: '',
        description: '',
        x:  6, z: 30,
    },
];

const CodePage3D = () => {
    const { projects, siteSettings } = useData();
    const items = (projects && projects.length > 0) ? projects : FALLBACK;
    const tg = siteSettings?.socialLinks?.telegram || 'https://t.me/muvs';
    return (
        <Scene3DShell
            items={items}
            simple
            cfgStorageKey="muvs:scene3d:code:v1"
            serverCfgKey="codeConfig"
            stopCount={5}
            showDebug
            portfolio={PORTFOLIO_PLACEHOLDERS}
            bottomAction={{ label: 'MAKE REQUEST', href: tg }}
        />
    );
};

export default CodePage3D;
