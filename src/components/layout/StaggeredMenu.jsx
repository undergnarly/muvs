import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaInstagram, FaSoundcloud, FaBandcamp, FaTelegramPlane } from 'react-icons/fa';
import { ROUTES } from '../../utils/constants';
import { useData } from '../../context/DataContext';
import './StaggeredMenu.css';

const menuItems = [
    { label: 'MUSIC', path: ROUTES.MUSIC },
    { label: 'MIXES', path: ROUTES.MIXES },
    { label: 'CODE', path: ROUTES.CODE },
    { label: 'NEWS', path: ROUTES.NEWS },
    { label: 'ABOUT', path: ROUTES.ABOUT },
];

export const StaggeredMenu = () => {
    const location = useLocation();
    const { siteSettings } = useData();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const position = 'right';
    const colors = ['#1a1a1a', '#2a2a2a'];
    const menuButtonColor = '#fff';
    const openMenuButtonColor = '#fff';
    const accentColor = '#ccff00';

    const socialLinks = siteSettings?.socialLinks || {};
    const socialItems = [
        { label: 'Instagram', link: socialLinks.instagram, icon: FaInstagram },
        { label: 'SoundCloud', link: socialLinks.soundcloud, icon: FaSoundcloud },
        { label: 'Bandcamp', link: socialLinks.bandcamp, icon: FaBandcamp },
        { label: 'Telegram', link: socialLinks.telegram, icon: FaTelegramPlane }
    ].filter(item => item.link);

    const handleLinkClick = (e, path) => {
        e.preventDefault();
        if (location.pathname === path) {
            toggleMenu();
            return;
        }
        toggleMenu();
        setTimeout(() => {
            navigate(path);
        }, 700);
    };

    const toggleMenu = () => {
        setOpen(!open);
    };

    const handleLogoClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const homePath = ROUTES.HOME || '/';

        if (open) {
            toggleMenu();
        }

        if (location.pathname !== homePath) {
            navigate(homePath);
        }
    };

    return (
        <div
            className="staggered-menu-wrapper"
            style={{ '--sm-accent': accentColor }}
            data-position={position}
            data-open={open || undefined}
        >
            {/* Pre-layers for stagger effect */}
            <div className="sm-prelayers" aria-hidden="true">
                {colors.map((c, i) => (
                    <motion.div
                        key={i}
                        className="sm-prelayer"
                        style={{ background: c }}
                        initial={{ x: '100%' }}
                        animate={{ x: open ? '0%' : '100%' }}
                        transition={{
                            duration: 0.8,
                            ease: [0.76, 0, 0.24, 1],
                            delay: open ? i * 0.08 : (colors.length - 1 - i) * 0.08
                        }}
                    />
                ))}
            </div>

            <header className="staggered-menu-header" aria-label="Main navigation header">
                <a
                    href={ROUTES.HOME || '/'}
                    className="sm-logo"
                    aria-label="Logo"
                    onClick={handleLogoClick}
                >
                    <div className="sm-logo-img" />
                </a>
                <motion.button
                    className="sm-toggle"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    onClick={toggleMenu}
                    type="button"
                    animate={{ color: open ? openMenuButtonColor : menuButtonColor }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="sm-toggle-textWrap" aria-hidden="true">
                        <motion.span
                            className="sm-toggle-textInner"
                            animate={{ y: open ? '-50%' : '0%' }}
                            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                        >
                            <span className="sm-toggle-line">Menu</span>
                            <span className="sm-toggle-line">Close</span>
                        </motion.span>
                    </span>
                    <motion.span
                        className="sm-icon"
                        aria-hidden="true"
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                        <motion.span
                            className="sm-icon-line"
                            animate={{ rotate: open ? 45 : 0 }}
                            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                        <motion.span
                            className="sm-icon-line sm-icon-line-v"
                            animate={{ rotate: open ? 135 : 90 }}
                            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                    </motion.span>
                </motion.button>
            </header>

            <motion.aside
                className="staggered-menu-panel"
                aria-hidden={!open}
                initial={{ x: '100%' }}
                animate={{ x: open ? '0%' : '100%' }}
                transition={{
                    duration: 0.8,
                    ease: [0.76, 0, 0.24, 1],
                    delay: open ? 0.1 : 0
                }}
            >
                <div className="sm-panel-inner">
                    <ul className="sm-panel-list" role="list">
                        {menuItems.map((it, idx) => (
                            <li className="sm-panel-itemWrap" key={it.label}>
                                <a
                                    href={it.path}
                                    className={`sm-panel-item ${location.pathname === it.path ? 'active' : ''}`}
                                    onClick={(e) => handleLinkClick(e, it.path)}
                                >
                                    <motion.span
                                        className="sm-panel-itemLabel"
                                        initial={{ y: '140%', rotate: 10, opacity: 1 }}
                                        animate={{
                                            y: open ? '0%' : '140%',
                                            rotate: open ? 0 : 10
                                        }}
                                        transition={{
                                            duration: 1,
                                            ease: [0.19, 1, 0.22, 1],
                                            delay: open ? 0.4 + (idx * 0.05) : 0
                                        }}
                                    >
                                        {it.label}
                                    </motion.span>
                                </a>
                            </li>
                        ))}
                    </ul>

                    <div className="sm-socials" aria-label="Social links">
                        <motion.h3
                            className="sm-socials-title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: open ? 1 : 0 }}
                            transition={{ duration: 0.5, delay: open ? 0.6 : 0 }}
                        >
                            Socials
                        </motion.h3>
                        <ul className="sm-socials-list" role="list">
                            {socialItems.map((s, idx) => (
                                <li key={s.label} className="sm-socials-item">
                                    <motion.a
                                        href={s.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="sm-socials-link"
                                        aria-label={s.label}
                                        initial={{ y: 25, opacity: 0 }}
                                        animate={{
                                            y: open ? 0 : 25,
                                            opacity: open ? 1 : 0
                                        }}
                                        transition={{
                                            duration: 0.6,
                                            ease: [0.34, 1.56, 0.64, 1],
                                            delay: open ? 0.5 + (idx * 0.05) : 0
                                        }}
                                    >
                                        <s.icon size={24} />
                                    </motion.a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="sm-panel-bg" />
            </motion.aside>
        </div>
    );
};

export default StaggeredMenu;
