import React, { useState } from 'react';
import Header from '../layout/Header';
import SlideContainer from '../navigation/SlideContainer';
import ProjectSlide from './ProjectSlide';
import { useData } from '../../context/DataContext';
import './CodePage.css';

const CodePage = () => {
    const { projects } = useData();
    const [currentIndex, setCurrentIndex] = useState(0);

    const sortedProjects = [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="page-container code-page">
            <Header />

            <SlideContainer activeIndex={currentIndex} onChange={setCurrentIndex}>
                {sortedProjects.map((project, index) => (
                    <ProjectSlide
                        key={project.id}
                        project={project}
                        priority={index === 0}
                        allProjects={projects}
                        onNavigate={setCurrentIndex}
                    />
                ))}
            </SlideContainer>
        </div>
    );
};

export default CodePage;
