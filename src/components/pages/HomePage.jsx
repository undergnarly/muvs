import React from 'react';
import { useData } from '../../context/DataContext';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';
import './HomePage.css';

const HomePage = () => {
    const { siteSettings } = useData();

    const CoverContent = (
        <div className="home-cover-container">
            <div className="home-title-wrapper">
                <h1 className="home-title">
                    <SplitText delay={0.2} duration={0.1}>{siteSettings?.siteName || 'MUVS'}</SplitText>
                </h1>
                <h2 className="home-subtitle">
                    <SplitText delay={0.8} duration={0.05}>{siteSettings?.tagline || 'AUDIO / VISUAL / CODE'}</SplitText>
                </h2>
            </div>
        </div>
    );

    const DetailContent = (
        <div className="home-details-container">
            <p className="home-bio" dangerouslySetInnerHTML={{ __html: siteSettings?.homepageBio || 'Digital craftsman exploring the intersection of sound, data, and visual aesthetics.' }} />
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
