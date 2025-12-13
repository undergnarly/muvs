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
            <div className="about-title-background">
                <h1 className="about-title-text">
                    <SplitText delay={0.2}>{about.title || 'ABOUT'}</SplitText>
                </h1>
            </div>

            {/* Constrained Image Wrapper */}
            <div className="about-cover-wrapper">
                {about.backgroundImage && (
                    <div className="about-image-placeholder">
                        <img src={about.backgroundImage} alt="About background" />
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
