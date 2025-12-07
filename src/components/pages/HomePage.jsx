import React from 'react';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';
import './HomePage.css';

const HomePage = () => {
    const CoverContent = (
        <div className="home-cover-container">
            <div className="home-title-wrapper">
                <h1 className="home-title">
                    <SplitText delay={0.2} duration={0.1}>MUVS</SplitText>
                </h1>
                <h2 className="home-subtitle">
                    <SplitText delay={0.8} duration={0.05}>AUDIO / VISUAL / CODE</SplitText>
                </h2>
            </div>
        </div>
    );

    const DetailContent = (
        <div className="home-details-container">
            <p className="home-bio">
                Digital craftsman exploring the intersection of sound, data, and visual aesthetics.
                <br /><br />
                Based in [Location].
            </p>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={DetailContent}
        />
    );
};

export default HomePage;
