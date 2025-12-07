import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import SlideIndicators from '../navigation/SlideIndicators';
import ReleaseSlide from './ReleaseSlide';
import { releases } from '../../data/releases';
import './MusicPage.css';

const MusicPage = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="page-container music-page">
            <Header />

            <SlideContainer activeIndex={currentIndex} onChange={setCurrentIndex}>
                {releases.map((release) => (
                    <ReleaseSlide key={release.id} release={release} />
                ))}
            </SlideContainer>

            <SlideIndicators
                total={releases.length}
                current={currentIndex}
                onChange={setCurrentIndex}
            />
        </div>
    );
};

export default MusicPage;
