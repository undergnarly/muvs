import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Button from '../ui/Button';
import BaseSlidePage from '../layout/BaseSlidePage';
import ProjectDetails from './ProjectDetails';
import './ProjectSlide.css';

const ProjectSlide = ({ project, priority = false, allProjects, onNavigate }) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const parallaxStrength = project.parallaxStrength || 50;
    const yParallax = useTransform(scrollYProgress, [0, 1], [0, parallaxStrength]);

    const CoverContent = ({ coverTextY, coverImageY }) => (
        <div className="project-cover-container">
            <motion.div
                className="project-preview-wrapper"
                style={{
                    y: coverImageY || 0
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                {project.thumbnail.startsWith('/images') ? (
                    <div className="mock-project-preview">
                        <span className="preview-title">{project.title}</span>
                        <div className="preview-ui-mock">
                            <div className="ui-dot red"></div>
                            <div className="ui-dot yellow"></div>
                            <div className="ui-dot green"></div>
                        </div>
                    </div>
                ) : (
                    <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="project-preview-img"
                        loading={priority ? "eager" : "lazy"}
                        fetchPriority={priority ? "high" : "auto"}
                        decoding="async"
                    />
                )}
            </motion.div>

            <motion.div
                className="project-main-info"
                style={{ y: coverTextY || yParallax }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
            >
                <h1 className="project-main-title">{project.title}</h1>
                {project.liveUrl && project.liveUrl.trim() !== '' && (
                    <Button variant="dark" href={project.liveUrl} style={{ marginTop: 24 }}>
                        Open Project
                    </Button>
                )}
            </motion.div>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<ProjectDetails project={project} allProjects={allProjects} onNavigate={onNavigate} />}
            textColor="white"
            animationType="zoom-out"
            zoomOutMax={project.zoomOutMax}
            textParallaxY={project.textParallaxY}
            imageParallaxY={project.imageParallaxY}
        />
    );
};

export default ProjectSlide;
