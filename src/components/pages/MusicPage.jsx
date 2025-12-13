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

    const sortedReleases = [...releases].sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="page-container music-page">
            <Header />

            <SlideContainer activeIndex={currentIndex} onChange={setCurrentIndex}>
                {sortedReleases.map((release, index) => (
                    <ReleaseSlide
                        key={release.id}
                        release={release}
                        priority={index === 0}
                    />
                ))}
            </SlideContainer>

            <SlideIndicators
                total={sortedReleases.length}
                current={currentIndex}
                onChange={setCurrentIndex}
            />
        </div>
    );
};

export default MusicPage;
