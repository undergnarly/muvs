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
            {about.backgroundImage && (
                <div className="about-background-image">
                    <img src={about.backgroundImage} alt="About background" />
                </div>
            )}
            <h1 className="about-title">
                <SplitText delay={0.2}>{about.title || 'ABOUT'}</SplitText>
            </h1>
        </div>
    );

    const DetailContent = (
        <div className="about-details-container">
            <div className="about-content">
                <p>{about.content}</p>
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
