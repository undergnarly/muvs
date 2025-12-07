import React from 'react';
import Logo from './Logo';
import BurgerMenu from './BurgerMenu';
import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="header-content">
                <Logo />
                <BurgerMenu />
            </div>
        </header>
    );
};

export default Header;
