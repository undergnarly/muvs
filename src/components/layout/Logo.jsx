import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import './Logo.css';

const Logo = () => {
    return (
        <Link to={ROUTES.HOME} className="logo">
            MUVS
        </Link>
    );
};

export default Logo;
