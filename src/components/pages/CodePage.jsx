import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import SlideIndicators from '../navigation/SlideIndicators';
import ProjectSlide from './ProjectSlide';
import { useData } from '../../context/DataContext';
import './CodePage.css';

const CodePage = () => {
    const { projects } = useData();
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="page-container code-page">
            <Header />

            <SlideContainer activeIndex={currentIndex} onChange={setCurrentIndex}>
                {projects.map((project, index) => (
                    <ProjectSlide
                        key={project.id}
                        project={project}
                        priority={index === 0}
                    />
                ))}
            </SlideContainer>

            <SlideIndicators
                total={projects.length}
                current={currentIndex}
                onChange={setCurrentIndex}
            />
        </div>
    );
};

export default CodePage;
