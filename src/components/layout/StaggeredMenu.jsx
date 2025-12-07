import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { FaInstagram, FaSoundcloud, FaBandcamp, FaTelegram } from 'react-icons/fa';
import { ROUTES } from '../../utils/constants';
import './StaggeredMenu.css';

const menuItems = [
    { label: 'MUSIC', path: ROUTES.MUSIC },
    { label: 'MIXES', path: ROUTES.MIXES },
    { label: 'CODE', path: ROUTES.CODE },
    { label: 'NEWS', path: ROUTES.NEWS },
    { label: 'ABOUT', path: ROUTES.ABOUT },
];

const socialItems = [
    { label: 'Instagram', link: 'https://instagram.com/muvs', icon: 'FaInstagram' },
    { label: 'SoundCloud', link: 'https://soundcloud.com/muvs', icon: 'FaSoundcloud' },
    { label: 'Bandcamp', link: 'https://bandcamp.com/muvs', icon: 'FaBandcamp' },
    { label: 'Telegram', link: 'https://t.me/muvs', icon: 'FaTelegram' }
];

export const StaggeredMenu = () => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const openRef = useRef(false);
    const panelRef = useRef(null);
    const preLayersRef = useRef(null);
    const preLayerElsRef = useRef([]);
    const plusHRef = useRef(null);
    const plusVRef = useRef(null);
    const iconRef = useRef(null);
    const textInnerRef = useRef(null);
    const textWrapRef = useRef(null);
    const [textLines, setTextLines] = useState(['Menu', 'Close']);

    const openTlRef = useRef(null);
    const closeTweenRef = useRef(null);
    const spinTweenRef = useRef(null);
    const textCycleAnimRef = useRef(null);
    const colorTweenRef = useRef(null);
    const toggleBtnRef = useRef(null);
    const busyRef = useRef(false);

    const position = 'right';
    const colors = ['#1a1a1a', '#2a2a2a'];
    const menuButtonColor = '#fff';
    const openMenuButtonColor = '#fff';
    const accentColor = '#ccff00';

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const panel = panelRef.current;
            const preContainer = preLayersRef.current;
            const plusH = plusHRef.current;
            const plusV = plusVRef.current;
            const icon = iconRef.current;
            const textInner = textInnerRef.current;
            if (!panel || !plusH || !plusV || !icon || !textInner) return;

            let preLayers = [];
            if (preContainer) {
                preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
            }
            preLayerElsRef.current = preLayers;

            const offscreen = 100;
            gsap.set([panel, ...preLayers], { xPercent: offscreen });
            gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
            gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
            gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
            gsap.set(textInner, { yPercent: 0 });
            if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
        });
        return () => ctx.revert();
    }, [menuButtonColor]);

    const buildOpenTimeline = useCallback(() => {
        const panel = panelRef.current;
        const layers = preLayerElsRef.current;
        if (!panel) return null;

        openTlRef.current?.kill();
        closeTweenRef.current?.kill();

        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

        const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
        const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

        const tl = gsap.timeline({ paused: true });

        layerStates.forEach((ls, i) => {
            tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
        });

        const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
        const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
        const panelDuration = 0.65;

        tl.fromTo(
            panel,
            { xPercent: panelStart },
            { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
            panelInsertTime
        );

        if (itemEls.length) {
            const itemsStart = panelInsertTime + panelDuration * 0.15;
            tl.to(
                itemEls,
                {
                    yPercent: 0,
                    rotate: 0,
                    duration: 1,
                    ease: 'power4.out',
                    stagger: { each: 0.1, from: 'start' }
                },
                itemsStart
            );
            if (numberEls.length) {
                tl.to(
                    numberEls,
                    {
                        duration: 0.6,
                        ease: 'power2.out',
                        '--sm-num-opacity': 1,
                        stagger: { each: 0.08, from: 'start' }
                    },
                    itemsStart + 0.1
                );
            }
        }

        if (socialTitle || socialLinks.length) {
            const socialsStart = panelInsertTime + panelDuration * 0.4;
            if (socialTitle) {
                tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
            }
            if (socialLinks.length) {
                tl.to(
                    socialLinks,
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.55,
                        ease: 'power3.out',
                        stagger: { each: 0.08, from: 'start' }
                    },
                    socialsStart + 0.04
                );
            }
        }

        openTlRef.current = tl;
        return tl;
    }, []);

    const playOpen = useCallback(() => {
        if (busyRef.current) return;
        busyRef.current = true;
        const tl = buildOpenTimeline();
        if (tl) {
            tl.eventCallback('onComplete', () => { busyRef.current = false; });
            tl.play(0);
        } else {
            busyRef.current = false;
        }
    }, [buildOpenTimeline]);

    const playClose = useCallback(() => {
        openTlRef.current?.kill();
        const panel = panelRef.current;
        if (!panel) return;

        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        const preLayers = preLayerElsRef.current || [];

        closeTweenRef.current?.kill();

        // "Inverted" exit: Items disappear first (staggered), then panel slides out.
        const tl = gsap.timeline({
            onComplete: () => { busyRef.current = false; }
        });
        closeTweenRef.current = tl;

        // 1. Stagger items out
        const allItems = [...itemEls, ...socialLinks];
        if (allItems.length) {
            tl.to(allItems, {
                x: 50,
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                stagger: { each: 0.03, from: 'end' } // Reverse order
            }, 0);
        }

        // 2. Slide panel and layers out
        const panelExitStart = 0.3; // Start sliding after items start fading
        const allLayers = [...preLayers, panel];
        tl.to(allLayers, {
            xPercent: 100,
            duration: 0.5,
            ease: 'power4.in',
            stagger: 0.05
        }, panelExitStart);

    }, []);

    const animateIcon = useCallback(opening => {
        const icon = iconRef.current;
        if (!icon) return;
        spinTweenRef.current?.kill();
        if (opening) {
            spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
        } else {
            spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
        }
    }, []);

    const animateColor = useCallback(opening => {
        const btn = toggleBtnRef.current;
        if (!btn) return;
        colorTweenRef.current?.kill();
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, {
            color: targetColor,
            delay: 0.18,
            duration: 0.3,
            ease: 'power2.out'
        });
    }, [openMenuButtonColor, menuButtonColor]);

    const animateText = useCallback(opening => {
        const inner = textInnerRef.current;
        if (!inner) return;
        textCycleAnimRef.current?.kill();

        const currentLabel = opening ? 'Menu' : 'Close';
        const targetLabel = opening ? 'Close' : 'Menu';
        const cycles = 3;
        const seq = [currentLabel];
        let last = currentLabel;
        for (let i = 0; i < cycles; i++) {
            last = last === 'Menu' ? 'Close' : 'Menu';
            seq.push(last);
        }
        if (last !== targetLabel) seq.push(targetLabel);
        seq.push(targetLabel);
        setTextLines(seq);

        gsap.set(inner, { yPercent: 0 });
        const lineCount = seq.length;
        const finalShift = ((lineCount - 1) / lineCount) * 100;
        textCycleAnimRef.current = gsap.to(inner, {
            yPercent: -finalShift,
            duration: 0.5 + lineCount * 0.07,
            ease: 'power4.out'
        });
    }, []);

    const navigate = useNavigate();

    const handleLinkClick = (e, path) => {
        e.preventDefault();

        // If menu is closed (e.g. clicking logo from top bar), navigate immediately
        if (!open) {
            navigate(path);
            return;
        }

        if (location.pathname === path) {
            toggleMenu();
            return;
        }

        // 1. Animate UI back to closed state
        openRef.current = false;
        setOpen(false);
        playClose();
        animateIcon(false);
        animateColor(false);
        animateText(false);

        // 2. Wait for exit animation (approx 0.7s total duration of playClose timeline)
        // items (0.3s) + panel (0.5s) with overlap. Total ~0.7-0.8s.
        setTimeout(() => {
            navigate(path);
        }, 700);
    };

    const toggleMenu = useCallback(() => {
        const target = !openRef.current;
        openRef.current = target;
        setOpen(target);
        if (target) {
            playOpen();
        } else {
            playClose();
        }
        animateIcon(target);
        animateColor(target);
        animateText(target);
    }, [playOpen, playClose, animateIcon, animateColor, animateText]);

    return (
        <div
            className="staggered-menu-wrapper"
            style={{ '--sm-accent': accentColor }}
            data-position={position}
            data-open={open || undefined}
        >
            <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
                {colors.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />)}
            </div>

            <header className="staggered-menu-header" aria-label="Main navigation header">
                <a
                    href={ROUTES.HOME || '/'}
                    className="sm-logo"
                    aria-label="Logo"
                    onClick={(e) => handleLinkClick(e, ROUTES.HOME || '/')}
                >
                    <div className="sm-logo-img" />
                </a>
                <button
                    ref={toggleBtnRef}
                    className="sm-toggle"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    onClick={toggleMenu}
                    type="button"
                >
                    <span ref={textWrapRef} className="sm-toggle-textWrap" aria-hidden="true">
                        <span ref={textInnerRef} className="sm-toggle-textInner">
                            {textLines.map((l, i) => (
                                <span className="sm-toggle-line" key={i}>{l}</span>
                            ))}
                        </span>
                    </span>
                    <span ref={iconRef} className="sm-icon" aria-hidden="true">
                        <span ref={plusHRef} className="sm-icon-line" />
                        <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
                    </span>
                </button>
            </header>

            <aside ref={panelRef} className="staggered-menu-panel" aria-hidden={!open}>
                <div className="sm-panel-inner">
                    <ul className="sm-panel-list" role="list">
                        {menuItems.map((it, idx) => (
                            <li className="sm-panel-itemWrap" key={it.label}>
                                <a
                                    href={it.path}
                                    className={`sm-panel-item ${location.pathname === it.path ? 'active' : ''}`}
                                    onClick={(e) => handleLinkClick(e, it.path)}
                                >
                                    <span className="sm-panel-itemLabel">{it.label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>

                    <div className="sm-socials" aria-label="Social links">
                        <h3 className="sm-socials-title">Socials</h3>
                        <ul className="sm-socials-list" role="list">
                            {socialItems.map((s) => {
                                const IconComponent = s.icon === 'FaInstagram' ? FaInstagram :
                                    s.icon === 'FaSoundcloud' ? FaSoundcloud :
                                        s.icon === 'FaBandcamp' ? FaBandcamp :
                                            FaTelegram;
                                return (
                                    <li key={s.label} className="sm-socials-item">
                                        <a
                                            href={s.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="sm-socials-link"
                                            aria-label={s.label}
                                        >
                                            <IconComponent size={24} />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default StaggeredMenu;
