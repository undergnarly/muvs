import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import BaseSlidePage from '../layout/BaseSlidePage';
import ProjectDetails from './ProjectDetails';
import './ProjectSlide.css';

const ProjectSlide = ({ project }) => {
    const CoverContent = (
        <div className="project-cover-container">
            {/* Background title text - BEFORE wrapper so z-index works */}
            <motion.div
                className="project-title-background"
                style={{ top: project.textTopPosition || '20%' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <h1
                    className="title-background-text"
                    style={{ fontSize: project.titleFontSize || 'min(24vw, 120px)' }}
                >
                    {project.title}
                </h1>
            </motion.div>

            {/* Cover image with transparency effect */}
            <motion.div
                className="project-preview-wrapper"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
                <div className="preview-placeholder">
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
                        <img src={project.thumbnail} alt={project.title} className="project-preview-img" />
                    )}
                </div>
            </motion.div>

            <motion.div
                className="project-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                <Button variant="dark" href={project.liveUrl} style={{ marginTop: 24 }}>
                    Open Project
                </Button>
            </motion.div>
        </div>
    );

    return (
        <BaseSlidePage
            coverContent={CoverContent}
            detailContent={<ProjectDetails project={project} />}
        />
    );
};

export default ProjectSlide;
