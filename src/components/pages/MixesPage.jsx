import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import SlideContainer from '../navigation/SlideContainer';
import MixSlide from './MixSlide';
import { useData } from '../../context/DataContext';
import './MixesPage.css';

const MixesPage = () => {
    const { mixes } = useData();
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="page-container mixes-page">
            <Header />

            <SlideContainer activeIndex={currentIndex} onChange={setCurrentIndex}>
                {mixes.map((mix, index) => (
                    <MixSlide
                        key={mix.id}
                        mix={mix}
                        priority={index === 0}
                        allMixes={mixes}
                        onNavigate={setCurrentIndex}
                    />
                ))}
            </SlideContainer>
        </div>
    );
};

export default MixesPage;
