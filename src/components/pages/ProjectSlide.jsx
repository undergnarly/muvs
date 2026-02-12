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

    const titleRef = useRef(null);
    const { scrollYProgress: localScrollY } = useScroll({
        target: titleRef,
        offset: ["start end", "end start"]
    });

    const parallaxStrength = project.parallaxStrength || 100;
    const localYParallax = useTransform(localScrollY, [0, 1], [-parallaxStrength, parallaxStrength]);

    const CoverContent = ({ coverTextY, coverImageY }) => (
        <div className="project-cover-container">
            {/* Background title text */}
            <motion.div
                ref={titleRef}
                className="project-title-background"
                style={{
                    top: project.textTopPosition || '20%',
                    x: '-50%',
                    y: coverTextY || localYParallax,
                    gap: project.titleGap || '0px'
                }}
                initial={priority ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                {project.type && (
                    <h2
                        className="project-background-type"
                        style={{ fontSize: project.typeFontSize || 'min(12vw, 60px)' }}
                    >
                        {project.type}
                    </h2>
                )}
                <h1
                    className="project-background-title"
                    style={{ fontSize: project.titleFontSize || 'min(24vw, 120px)' }}
                >
                    {project.title}
                </h1>
            </motion.div>

            {/* Project preview wrapper */}
            <motion.div
                className="project-preview-wrapper"
                style={{
                    y: coverImageY || 0
                }}
                initial={priority ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: priority ? 0 : 0.2 }}
            >
                {!project.thumbnail || (project.thumbnail.startsWith('/images') && !project.thumbnail.includes('.')) ? (
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
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                {project.description && (
                    <div
                        className="project-short-description"
                        dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                )}
                {project.liveUrl && project.liveUrl.trim() !== '' && (
                    <Button variant="accent" href={project.liveUrl} style={{ marginTop: 24, background: 'transparent', border: '2px solid var(--color-accent)', color: 'var(--color-accent)' }}>
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
            textColor="black"
            animationType="zoom-out"
            zoomOutMax={project.zoomOutMax}
            textParallaxY={project.textParallaxY}
            imageParallaxY={project.imageParallaxY}
        />
    );
};

export default ProjectSlide;
