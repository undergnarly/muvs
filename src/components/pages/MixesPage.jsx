import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import SlideIndicators from '../navigation/SlideIndicators';
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
                {mixes.map((mix) => (
                    <MixSlide key={mix.id} mix={mix} />
                ))}
            </SlideContainer>

            <SlideIndicators
                total={mixes.length}
                current={currentIndex}
                onChange={setCurrentIndex}
            />
        </div>
    );
};

export default MixesPage;
