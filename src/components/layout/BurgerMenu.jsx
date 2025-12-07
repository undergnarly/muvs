import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '../../utils/constants';
import SocialLinks from './SocialLinks';
import './BurgerMenu.css';

const menuItems = [
    { label: 'MUSIC', path: ROUTES.MUSIC },
    { label: 'MIXES', path: ROUTES.MIXES },
    { label: 'CODE', path: ROUTES.CODE },
    { label: 'NEWS', path: ROUTES.NEWS },
    { label: 'ABOUT', path: ROUTES.ABOUT },
];

const BurgerMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setIsOpen(!isOpen);

    // Close menu when route changes
    React.useEffect(() => {
        setIsOpen(false);
    }, [location]);

    return (
        <>
            <button
                className={`burger-button ${isOpen ? 'open' : ''}`}
                onClick={toggleMenu}
                aria-label="Toggle Navigation"
                style={{ color: isOpen ? '#FFFFFF' : 'inherit' }}
            >
                <span className="burger-line top"></span>
                <span className="burger-line bottom"></span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="menu-overlay"
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        <nav className="menu-nav">
                            {menuItems.map((item, index) => (
                                <motion.div
                                    key={item.path}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 + index * 0.1, duration: 0.4, ease: "easeOut" }}
                                >
                                    <Link
                                        to={item.path}
                                        className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                                    >
                                        {item.label}
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                            className="menu-socials"
                        >
                            <SocialLinks />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default BurgerMenu;
