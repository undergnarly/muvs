import React from 'react';
import Logo from './Logo';
import StaggeredMenu from './StaggeredMenu';
import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="header-content">
                <Logo />
                <StaggeredMenu />
            </div>
        </header>
    );
};

export default Header;
