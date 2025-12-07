import React from 'react';
import clsx from 'clsx';
import './SlideIndicators.css';

const SlideIndicators = ({ total, current, onChange, theme = 'dark' }) => {
    return (
        <div className={clsx('slide-indicators', theme)}>
            {Array.from({ length: total }).map((_, index) => (
                <button
                    key={index}
                    className={clsx('indicator-dot', { active: current === index })}
                    onClick={() => onChange && onChange(index)}
                    aria-label={`Go to slide ${index + 1}`}
                />
            ))}
        </div>
    );
};

export default SlideIndicators;
