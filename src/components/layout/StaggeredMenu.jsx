import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaInstagram, FaSoundcloud, FaBandcamp, FaTelegramPlane } from 'react-icons/fa';
import { ROUTES } from '../../utils/constants';
import { RADIO_STATIONS } from '../../data/radio';
import { useData } from '../../context/DataContext';
import { isPlainMenuClick, menuFocusables, menuTabTarget } from '../../utils/menuAccessibility';
import './StaggeredMenu.css';

const toSlug = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const itemSlug = (item) => toSlug(item?.slug || item?.title || item?.id);

let logoAccentUntil = 0;

export const StaggeredMenu = ({ theme = 'light', swipeHintTarget = null }) => {
    const location = useLocation();
    const { siteSettings, releases = [], mixes = [], projects = [] } = useData();
    const [open, setOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState(null);
    const [logoAccentEnd, setLogoAccentEnd] = useState(() => logoAccentUntil);
    const navigate = useNavigate();
    const wrapperRef = useRef(null);
    const panelRef = useRef(null);
    const toggleRef = useRef(null);
    const navigationTimer = useRef(null);
    const prefix = useId();
    const panelId = `${prefix}-main-menu`;

    useEffect(() => () => window.clearTimeout(navigationTimer.current), []);

    useEffect(() => {
        if (!open) return undefined;
        const previous = document.activeElement;
        const toggle = toggleRef.current;
        const focusFirst = () => (menuFocusables(panelRef.current)[0] || toggleRef.current)?.focus({ preventScroll: true });
        focusFirst();
        const onKeyDown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setExpandedItem(null);
                setOpen(false);
                return;
            }
            if (event.key !== 'Tab') return;
            const next = menuTabTarget(menuFocusables(wrapperRef.current), document.activeElement, event.shiftKey);
            if (next) { event.preventDefault(); next.focus({ preventScroll: true }); }
        };
        const onFocus = event => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) focusFirst();
        };
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('focusin', onFocus);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('focusin', onFocus);
            const target = previous?.isConnected && !previous.closest?.('[inert]') ? previous : toggle;
            if (target?.isConnected) target.focus({ preventScroll: true });
        };
    }, [open]);

    useEffect(() => {
        if (logoAccentEnd <= Date.now()) return undefined;
        const timeoutId = window.setTimeout(() => setLogoAccentEnd(0), logoAccentEnd - Date.now());
        return () => window.clearTimeout(timeoutId);
    }, [logoAccentEnd]);

    const position = 'right';
    const colors = ['#1a1a1a', '#2a2a2a'];
    const isDark = theme === 'dark';
    const menuButtonColor = isDark ? '#1a1a1a' : '#fff';
    const openMenuButtonColor = '#fff';
    const accentColor = '#ccff00';

    const socialLinks = siteSettings?.socialLinks || {};
    const socialItems = [
        { label: 'Instagram', link: socialLinks.instagram, icon: FaInstagram },
        { label: 'SoundCloud', link: socialLinks.soundcloud, icon: FaSoundcloud },
        { label: 'Bandcamp', link: socialLinks.bandcamp, icon: FaBandcamp },
        { label: 'Telegram', link: socialLinks.telegram, icon: FaTelegramPlane }
    ].filter(item => item.link);

    const menuItems = useMemo(() => [
        {
            key: 'music',
            label: 'MUSIC',
            path: ROUTES.MUSIC,
            children: releases
                .filter((release) => release.active !== false)
                .map((release) => ({
                    key: String(release.id ?? itemSlug(release)),
                    label: release.title || 'UNTITLED RELEASE',
                    meta: release.artists || '',
                    path: `/${encodeURIComponent(itemSlug(release))}`,
                })),
        },
        {
            key: 'mixes',
            label: 'MIXES',
            path: ROUTES.MIXES,
            children: [...mixes]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((mix) => ({
                    key: String(mix.id ?? itemSlug(mix)),
                    label: mix.title || 'UNTITLED MIX',
                    meta: mix.recordDate || mix.date || '',
                    path: `${ROUTES.MIXES}?item=${encodeURIComponent(itemSlug(mix))}`,
                })),
        },
        {
            key: 'code',
            label: 'CODE',
            path: ROUTES.CODE,
            children: [...projects]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((project) => ({
                    key: String(project.id ?? itemSlug(project)),
                    label: project.title || 'UNTITLED PROJECT',
                    meta: project.type || '',
                    path: `${ROUTES.CODE}?item=${encodeURIComponent(itemSlug(project))}`,
                })),
        },
        { key: 'about', label: 'ABOUT', path: ROUTES.ABOUT, children: [] },
        {
            key: 'radio', label: 'RADIO', path: ROUTES.RADIO,
            children: RADIO_STATIONS.map((station) => ({
                key: station.id, label: station.title, meta: station.era,
                path: `${ROUTES.RADIO}?item=${station.slug}`,
            })),
        },
    ], [mixes, projects, releases]);

    const handleLinkClick = (e, path) => {
        if (!isPlainMenuClick(e)) return;
        e.preventDefault();
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (currentPath === path) {
            toggleMenu();
            return;
        }
        setExpandedItem(null);
        toggleMenu();
        window.clearTimeout(navigationTimer.current);
        navigationTimer.current = window.setTimeout(() => {
            navigate(path);
        }, 700);
    };

    const toggleMenu = () => {
        window.clearTimeout(navigationTimer.current);
        if (open) setExpandedItem(null);
        setOpen(!open);
    };

    const handleMenuItemClick = (e, item) => {
        if (!isPlainMenuClick(e)) return;
        if (!item.children.length) {
            handleLinkClick(e, item.path);
            return;
        }

        e.preventDefault();
        setExpandedItem((current) => current === item.key ? null : item.key);
    };

    const handleLogoClick = (e) => {
        if (!isPlainMenuClick(e)) return;
        e.preventDefault();
        e.stopPropagation();
        window.clearTimeout(navigationTimer.current);

        logoAccentUntil = Date.now() + 3000;
        setLogoAccentEnd(logoAccentUntil);

        const homePath = ROUTES.HOME || '/';

        if (open) {
            toggleMenu();
        }

        if (window.location.pathname !== homePath || window.location.search) {
            navigate(homePath);
        }
    };

    return (
        <div
            ref={wrapperRef}
            className={`staggered-menu-wrapper${isDark && !open ? ' sm-dark' : ''}`}
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
                    className={`sm-logo${logoAccentEnd > Date.now() ? ' is-animating' : ''}`}
                    aria-label="MUVS home"
                    onClick={handleLogoClick}
                >
                    <div className="sm-logo-img" />
                </a>
                <div className="sm-menu-control">
                    <motion.button
                        ref={toggleRef}
                        className="sm-toggle"
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        aria-controls={panelId}
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
                    <AnimatePresence mode="wait" initial={false}>
                        {swipeHintTarget && !open && (
                            <motion.button
                                key={swipeHintTarget}
                                className={`sm-swipe-label${swipeHintTarget === 'MENU' ? ' is-clickable' : ''}`}
                                type="button"
                                aria-label={swipeHintTarget === 'MENU' ? 'Open menu' : undefined}
                                aria-controls={swipeHintTarget === 'MENU' ? panelId : undefined}
                                disabled={swipeHintTarget !== 'MENU'}
                                onClick={swipeHintTarget === 'MENU' ? toggleMenu : undefined}
                                aria-live="polite"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.22 }}
                            >
                                <span className="sm-swipe-label-arrow" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="17" height="17">
                                        <path d="M12 19 V5 M6.5 10.5 L12 5 L17.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    </svg>
                                </span>
                                <span className="sm-swipe-label-copy">
                                    <span>SWIPE UP</span>
                                    <span>{`TO ${swipeHintTarget}`}</span>
                                </span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <motion.aside
                ref={panelRef}
                id={panelId}
                className="staggered-menu-panel"
                aria-label="Main navigation"
                aria-hidden={!open}
                inert={!open}
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
                        {menuItems.map((it, idx) => {
                            const expandable = it.children.length > 0;
                            const expanded = expandedItem === it.key;
                            const active = location.pathname === it.path
                                || it.children.some((child) => child.path === `${location.pathname}${location.search}`);
                            return (
                            <li className={`sm-panel-itemWrap${expanded ? ' is-expanded' : ''}`} key={it.label}>
                                <a
                                    className={`sm-panel-item${active ? ' active' : ''}`}
                                    href={it.path}
                                    onClick={(e) => handleMenuItemClick(e, it)}
                                    aria-expanded={expandable ? expanded : undefined}
                                    aria-controls={expandable ? `${prefix}-sm-submenu-${it.key}` : undefined}
                                    aria-current={location.pathname === it.path ? 'page' : undefined}
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
                                    {expandable && (
                                        <motion.span
                                            className="sm-panel-itemChevron"
                                            aria-hidden="true"
                                            animate={{ rotate: expanded ? 180 : 0 }}
                                            transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
                                        >
                                            <svg viewBox="0 0 24 24" width="22" height="22">
                                                <path d="M6 9 L12 15 L18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                            </svg>
                                        </motion.span>
                                    )}
                                </a>
                                {expandable && (
                                        <motion.div
                                            id={`${prefix}-sm-submenu-${it.key}`}
                                            className="sm-submenu-clip"
                                            inert={!open || !expanded}
                                            aria-hidden={!expanded}
                                            initial={false}
                                            animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
                                            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
                                        >
                                            <div className="sm-submenu-scroll">
                                                {it.children.map((child, childIndex) => (
                                                    <motion.a
                                                        key={child.key}
                                                        href={child.path}
                                                        className={`sm-submenu-item${child.path === `${location.pathname}${location.search}` ? ' active' : ''}`}
                                                        onClick={(e) => handleLinkClick(e, child.path)}
                                                        aria-current={child.path === `${location.pathname}${location.search}` ? 'page' : undefined}
                                                        initial={false}
                                                        animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : 18 }}
                                                        transition={{
                                                            duration: 0.45,
                                                            ease: [0.19, 1, 0.22, 1],
                                                            delay: expanded ? 0.08 + childIndex * 0.045 : 0,
                                                        }}
                                                    >
                                                        <span className="sm-submenu-itemIndex">{String(childIndex + 1).padStart(2, '0')}</span>
                                                        <span className="sm-submenu-itemMain">
                                                            <span className="sm-submenu-itemLabel">{child.label}</span>
                                                            {child.meta && <span className="sm-submenu-itemMeta">{child.meta}</span>}
                                                        </span>
                                                    </motion.a>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                            </li>
                            );
                        })}
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
                                        <s.icon size={24} aria-hidden="true" focusable="false" />
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
