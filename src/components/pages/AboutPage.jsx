import React from 'react';
import { useData } from '../../context/DataContext';
import Header from '../layout/Header';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';
import SocialLinks from '../layout/SocialLinks';
import ContactForm from '../forms/ContactForm';
import './AboutPage.css';

const AboutPage = () => {
    const { about } = useData();

    const CoverContent = (
        <div className="about-cover-container">
            {/* Background Title */}
            <div
                className="about-title-background"
                style={{ top: about.titleTopPosition || '20%' }}
            >
                <h1
                    className="about-title-text"
                    style={{ fontSize: about.titleFontSize || 'min(24vw, 120px)' }}
                >
                    <SplitText delay={0.2}>{about.title || 'ABOUT'}</SplitText>
                </h1>
            </div>

            {/* Constrained Image Wrapper */}
            <div className="about-cover-wrapper">
                {(about.backgroundImageDesktop || about.backgroundImageMobile || about.backgroundImage) && (
                    <div className="about-image-placeholder">
                        {/* Desktop image */}
                        {about.backgroundImageDesktop && (
                            <img
                                src={about.backgroundImageDesktop}
                                alt="About background"
                                className="about-image-desktop"
                            />
                        )}
                        {/* Mobile image */}
                        {about.backgroundImageMobile && (
                            <img
                                src={about.backgroundImageMobile}
                                alt="About background"
                                className="about-image-mobile"
                            />
                        )}
                        {/* Fallback to old backgroundImage if new ones don't exist */}
                        {!about.backgroundImageDesktop && !about.backgroundImageMobile && about.backgroundImage && (
                            <img src={about.backgroundImage} alt="About background" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const DetailContent = (
        <div className="about-details-container" style={{ width: '100%', maxWidth: '100%', padding: '40px 20px' }}>
            <div className="about-content">
                <div dangerouslySetInnerHTML={{ __html: about.content }}></div>
                <div className="about-contact">
                    <h3>Connect</h3>
                    <SocialLinks />
                    <ContactForm />
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Header />
            <BaseSlidePage
                coverContent={CoverContent}
                detailContent={DetailContent}
            />
        </>
    );
};

export default AboutPage;
