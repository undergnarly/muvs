import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import SlideContainer from '../navigation/SlideContainer';
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
                        allReleases={sortedReleases}
                        onNavigate={setCurrentIndex}
                        currentIndex={currentIndex} // Adding this if we want to highlight active, though usually redundant as we are ON the active slide. But footer shows ALL.
                    />
                ))}
            </SlideContainer>
        </div>
    );
};

export default MusicPage;
