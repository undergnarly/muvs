import React, { useState } from 'react';
import { Navigate, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
    FaBars, FaCode, FaCog, FaCompactDisc, FaEnvelope, FaExternalLinkAlt,
    FaHome, FaMusic, FaNewspaper, FaSignOutAlt, FaTimes, FaUser,
} from 'react-icons/fa';
import './AdminLayout.css';

const NAV_ITEMS = [
    { path: '/admin', label: 'Dashboard', icon: FaHome },
    { path: '/admin/news', label: 'News', icon: FaNewspaper },
    { path: '/admin/music', label: 'Music', icon: FaCompactDisc },
    { path: '/admin/mixes', label: 'Mixes', icon: FaMusic },
    { path: '/admin/projects', label: 'Projects', icon: FaCode },
    { path: '/admin/about', label: 'About', icon: FaUser },
    { path: '/admin/messages', label: 'Messages', icon: FaEnvelope },
    { path: '/admin/settings', label: 'Settings', icon: FaCog },
];

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    const handleLogout = () => {
        sessionStorage.removeItem('isAdmin');
        navigate('/login');
    };

    const activeItem = NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];

    return (
        <div className="admin-layout">
            <header className="admin-mobile-header">
                <button className="admin-icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" title="Open navigation">
                    <FaBars />
                </button>
                <div>
                    <span className="admin-mobile-brand">MUVS</span>
                    <strong>{activeItem.label}</strong>
                </div>
                <a className="admin-icon-button" href="/" target="_blank" rel="noreferrer" aria-label="Open website" title="Open website">
                    <FaExternalLinkAlt />
                </a>
            </header>

            {sidebarOpen && <button className="admin-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

            <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
                <div className="admin-sidebar-head">
                    <div className="admin-logo">
                        <span>MUVS</span>
                        <small>CONTROL</small>
                    </div>
                    <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" title="Close navigation">
                        <FaTimes />
                    </button>
                </div>
                <nav className="admin-nav">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={`admin-nav-item ${isActive ? 'active' : ''}`}>
                                <Icon /> {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <a className="admin-site-link" href="/" target="_blank" rel="noreferrer">
                    <FaExternalLinkAlt /> View website
                </a>
                <button onClick={handleLogout} className="admin-logout">
                    <FaSignOutAlt /> Logout
                </button>
            </aside>
            <main className="admin-content">
                <div className="admin-content-inner">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
