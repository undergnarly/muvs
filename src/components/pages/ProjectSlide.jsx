import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import BaseSlidePage from '../layout/BaseSlidePage';
import ProjectDetails from './ProjectDetails';
import './ProjectSlide.css';

const ProjectSlide = ({ project }) => {
    const CoverContent = (
        <div className="project-cover-container">
            <motion.div
                className="project-preview-wrapper"
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
                    <img src={project.thumbnail} alt={project.title} className="project-preview-img" />
                )}
            </motion.div>

            <motion.div
                className="project-main-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
            >
                <h1 className="project-main-title">{project.title}</h1>
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
            textColor="black"
        />
    );
};

export default ProjectSlide;
