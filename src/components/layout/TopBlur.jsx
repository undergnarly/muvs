import React from 'react';
import GradualBlur from '../ui/GradualBlur';
import './TopBlur.css';

const TopBlur = () => {
    return (
        <>
            <div className="top-blur-gradient" />
            <GradualBlur
                target="page"
                position="top"
                height="14vh"
                strength={2}
                divCount={5}
                curve="bezier"
                exponential={true}
                opacity={1}
                zIndex={1999}
            />
        </>
    );
};

export default TopBlur;
