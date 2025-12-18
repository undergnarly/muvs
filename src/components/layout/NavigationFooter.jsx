import React from 'react';
import './NavigationFooter.css';

const NavigationFooter = ({ items, currentIndex, onNavigate, title = "More Releases" }) => {
    if (!items || items.length === 0) return null;

    const handleItemClick = (index) => {
        if (onNavigate) {
            onNavigate(index);
            // Scroll to top of the new slide is handled by the slide transition/mount usually, 
            // but we can enforce window scroll to top if needed.
            // Since we are changing the active slide in SlideContainer, the new component mounts.
            // BaseSlidePage usually sets scroll to 0? Let's check BaseSlidePage later.
            // For now, simple state update.
        }
    };

    return (
        <div className="navigation-footer">
            <h3>{title}</h3>
            <div className="nav-scroll-container">
                {items.map((item, index) => (
                    <button
                        key={item.id || index}
                        className={`nav-item ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => handleItemClick(index)}
                    >
                        <div className={`nav-item-image ${index === currentIndex ? 'active' : ''}`}>
                            {item.coverImage ? (
                                <img src={item.coverImage} alt={item.title} loading="lazy" />
                            ) : (
                                <div className="nav-item-placeholder">
                                    {item.title ? item.title[0] : '#'}
                                </div>
                            )}
                        </div>
                        <span className="nav-item-title">{item.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default NavigationFooter;
