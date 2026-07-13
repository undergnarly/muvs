import React from 'react';
import StaggeredMenu from './StaggeredMenu';
import './Header.css';

const Header = ({ theme = 'light', showSwipeUpHint = false }) => {
    return (
        <StaggeredMenu theme={theme} showSwipeUpHint={showSwipeUpHint} />
    );
};

export default Header;
