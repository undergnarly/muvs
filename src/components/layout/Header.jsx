import React from 'react';
import StaggeredMenu from './StaggeredMenu';
import './Header.css';

const Header = ({ theme = 'light', swipeHintTarget = null }) => {
    return (
        <StaggeredMenu theme={theme} swipeHintTarget={swipeHintTarget} />
    );
};

export default Header;
