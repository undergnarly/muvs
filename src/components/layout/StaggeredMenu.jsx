import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
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

    const socialLinks = siteSettings?.socialLinks || {};
    const socialItems = [
        { label: 'Instagram', link: socialLinks.instagram, icon: FaInstagram },
        { label: 'SoundCloud', link: socialLinks.soundcloud, icon: FaSoundcloud },
        { label: 'Bandcamp', link: socialLinks.bandcamp, icon: FaBandcamp },
        { label: 'Telegram', link: socialLinks.telegram, icon: FaTelegramPlane }
    ].filter(item => item.link);

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
        const socialLinksEls = Array.from(panel.querySelectorAll('.sm-socials-link'));

        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10, x: 0, opacity: 1 });
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinksEls.length) gsap.set(socialLinksEls, { y: 25, opacity: 0, x: 0 });

        const tl = gsap.timeline({ paused: true });

        tl.to(layers, {
            xPercent: 0,
            duration: 0.8,
            ease: 'power3.inOut',
            stagger: 0.08
        })
            .to(panel, {
                xPercent: 0,
                duration: 0.8,
                ease: 'power3.inOut'
            }, '<+=0.1');

        if (itemEls.length) {
            tl.to(itemEls, {
                yPercent: 0,
                rotate: 0,
                duration: 1,
                ease: 'power4.out',
                stagger: 0.05
            }, '-=0.4');
        }

        if (socialTitle) {
            tl.to(socialTitle, { opacity: 1, duration: 0.5 }, '-=0.6');
        }
        if (socialLinksEls.length) {
            tl.to(socialLinksEls, {
                y: 0,
                opacity: 1,
                x: 0,
                duration: 0.6,
                ease: 'back.out(1.7)',
                stagger: 0.05
            }, '-=0.5');
        }

        tl.eventCallback('onComplete', () => {
            busyRef.current = false;
        });
        tl.eventCallback('onReverseComplete', () => {
            busyRef.current = false;
        });

        return tl;
    }, []);

    const playOpen = useCallback(() => {
        if (busyRef.current) return;
        busyRef.current = true;
        const tl = buildOpenTimeline();
        openTlRef.current = tl;
        tl.play();
    }, [buildOpenTimeline]);

    const playClose = useCallback(() => {
        if (busyRef.current) return;
        busyRef.current = true;
        if (openTlRef.current) {
            openTlRef.current.reverse();
        } else {
            // Fallback
            const panel = panelRef.current;
            const layers = preLayerElsRef.current;
            gsap.to([panel, ...layers], {
                xPercent: 100,
                duration: 0.6,
                ease: 'power3.inOut',
                stagger: { amount: 0.1, from: 'end' },
                onComplete: () => { busyRef.current = false; }
            });
        }
    }, [buildOpenTimeline]);

    const animateIcon = useCallback((isOpen) => {
        const plusH = plusHRef.current;
        const plusV = plusVRef.current;
        const icon = iconRef.current;
        spinTweenRef.current?.kill();

        const tl = gsap.timeline();
        if (isOpen) {
            // to X
            tl.to(plusH, { rotate: 45, duration: 0.4, ease: 'back.out(1.7)' }, 0)
                .to(plusV, { rotate: 135, duration: 0.4, ease: 'back.out(1.7)' }, 0)
                .to(icon, { rotate: 90, duration: 0.4, ease: 'power2.inOut' }, 0);
        } else {
            // to Hamburger
            tl.to(plusH, { rotate: 0, duration: 0.4, ease: 'back.out(1.7)' }, 0)
                .to(plusV, { rotate: 90, duration: 0.4, ease: 'back.out(1.7)' }, 0)
                .to(icon, { rotate: 0, duration: 0.4, ease: 'power2.inOut' }, 0);
        }
        spinTweenRef.current = tl;
    }, []);

    const animateColor = useCallback((isOpen) => {
        colorTweenRef.current?.kill();
        const btn = toggleBtnRef.current;
        colorTweenRef.current = gsap.to(btn, {
            color: isOpen ? openMenuButtonColor : menuButtonColor,
            duration: 0.3
        });
    }, [menuButtonColor, openMenuButtonColor]);

    const animateText = useCallback((isOpen) => {
        textCycleAnimRef.current?.kill();
        const inner = textInnerRef.current;
        textCycleAnimRef.current = gsap.to(inner, {
            yPercent: isOpen ? -50 : 0,
            duration: 0.5,
            ease: 'power3.inOut'
        });
    }, []);

    const navigate = useNavigate();

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

    const handleLogoClick = (e) => {
        e.preventDefault();
        const homePath = ROUTES.HOME || '/';

        if (location.pathname !== homePath) {
            navigate(homePath);
            if (open) toggleMenu(); // Close it if currently open
        } else {
            toggleMenu(); // Toggle menu if already on home page
        }
    };

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
                    onClick={handleLogoClick}
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
                            {socialItems.map((s) => (
                                <li key={s.label} className="sm-socials-item">
                                    <a
                                        href={s.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="sm-socials-link"
                                        aria-label={s.label}
                                    >
                                        <s.icon size={24} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="sm-panel-bg" />
            </aside>
        </div>
    );
};

export default StaggeredMenu;
