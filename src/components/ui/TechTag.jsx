import React from 'react';
import './TechTag.css';

const TechTag = ({ label }) => {
    return (
        <span className="tech-tag">
            {label}
        </span>
    );
};

export default TechTag;
