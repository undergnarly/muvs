import React from 'react';
import Header from '../layout/Header';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';
import SocialLinks from '../layout/SocialLinks';
import ContactForm from '../forms/ContactForm';
import ScrollFloat from '../ui/ScrollFloat';
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
            <div className="about-content">
                <ScrollFloat
                    animationDuration={1}
                    ease='back.inOut(2)'
                    scrollStart='top center'
                    scrollEnd='center center'
                    stagger={0.02}
                    containerClassName="about-scroll-title"
                >
                    MUVS
                </ScrollFloat>
                <p>
                    I am a developer and music enthusiast passionate about building immersive digital experiences.
                    With a background in both front-end engineering and electronic music production, I strive to bridge the gap between technical precision and artistic expression.
                </p>
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
