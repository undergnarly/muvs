import React from 'react';
import { FadeContent } from '@appletosolutions/reactbits';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';
import SocialLinks from '../layout/SocialLinks';
import './AboutPage.css';

const AboutPage = () => {
    const CoverContent = (
        <div className="about-cover-container">
            <h1 className="about-title">
                <SplitText delay={0.2}>ABOUT</SplitText>
            </h1>
        </div>
    );

    const DetailContent = (
        <div className="about-details-container">
            <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
                <div className="about-content">
                    <p>
                        I am a developer and music enthusiast passionate about building immersive digital experiences.
                        With a background in both front-end engineering and electronic music production, I strive to bridge the gap between technical precision and artistic expression.
                    </p>
                    <div className="about-contact">
                        <h3>Connect</h3>
                        <SocialLinks />
                    </div>
                </div>
            </FadeContent>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={DetailContent}
        />
    );
};

export default AboutPage;
