import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { FaMusic, FaNewspaper, FaCode, FaCompactDisc, FaSignOutAlt, FaHome, FaEnvelope, FaCog } from 'react-icons/fa';
import './AdminLayout.css';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const isAdmin = sessionStorage.getItem('isAdmin');
        if (!isAdmin) {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('isAdmin');
        navigate('/login');
    };

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: FaHome },
        { path: '/admin/news', label: 'News', icon: FaNewspaper },
        { path: '/admin/music', label: 'Music', icon: FaCompactDisc },
        { path: '/admin/mixes', label: 'Mixes', icon: FaMusic },
        { path: '/admin/projects', label: 'Projects', icon: FaCode },
        { path: '/admin/messages', label: 'Messages', icon: FaEnvelope },
        { path: '/admin/settings', label: 'Settings', icon: FaCog },
    ];

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">MUVS ADMIN</div>
                <nav className="admin-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} className={`admin-nav-item ${isActive ? 'active' : ''}`}>
                                <Icon /> {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <button onClick={handleLogout} className="admin-logout">
                    <FaSignOutAlt /> Logout
                </button>
            </aside>
            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
