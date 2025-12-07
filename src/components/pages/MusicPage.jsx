import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import SlideIndicators from '../navigation/SlideIndicators';
import ReleaseSlide from './ReleaseSlide';
import { useData } from '../../context/DataContext';
import './MusicPage.css';

const MusicPage = () => {
    const { releases } = useData();
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
