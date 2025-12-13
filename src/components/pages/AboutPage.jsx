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
                style={{
                    top: about.titleTopPosition || '20%'
                }}
            >
                <h1
                    className="about-title-text"
                    style={{
                        fontSize: about.titleFontSize || 'min(24vw, 120px)',
                        visibility: 'visible' // Prevent flash
                    }}
                >
                    <SplitText delay={0.2}>{about.title || 'ABOUT'}</SplitText>
                </h1>
            </div>

            {/* Constrained Image Wrapper */}
            <div className="about-cover-wrapper">
                {(about.backgroundImageDesktop || about.backgroundImageMobile || about.backgroundImage) && (
                    <div className="about-image-placeholder">
                        {/* Show adaptive images if they exist */}
                        {(about.backgroundImageDesktop || about.backgroundImageMobile) ? (
                            <>
                                {/* Desktop image - shown only on desktop */}
                                {about.backgroundImageDesktop && (
                                    <img
                                        src={about.backgroundImageDesktop}
                                        alt="About background"
                                        className="about-image-desktop"
                                    />
                                )}
                                {/* Mobile image - shown only on mobile */}
                                {about.backgroundImageMobile && (
                                    <img
                                        src={about.backgroundImageMobile}
                                        alt="About background"
                                        className="about-image-mobile"
                                    />
                                )}
                            </>
                        ) : (
                            /* Fallback to old backgroundImage if new ones don't exist */
                            about.backgroundImage && (
                                <img src={about.backgroundImage} alt="About background" />
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const DetailContent = (
        <div className="about-details-container">
            <div className="about-content">
                <p
                    className="about-text"
                    dangerouslySetInnerHTML={{ __html: about.content }}
                />

                {/* Social Icons */}
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginTop: '32px',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <SocialLinks />
                </div>
            </div>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={DetailContent}
            pageId="about"
        />
    );
};

export default AboutPage;
