import React from 'react';
import StaggeredMenu from './StaggeredMenu';
import './Header.css';

const Header = ({ theme = 'light' }) => {
    return (
        <StaggeredMenu theme={theme} />
    );
};

export default Header;
