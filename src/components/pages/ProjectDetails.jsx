import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import TechTag from '../ui/TechTag';
import CircularGallery from '../media/CircularGallery';
import NavigationFooter from '../layout/NavigationFooter';
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { sanitizeUrl } from '../../utils/linkHelpers';
import { fixLinks } from '../../utils/linkUtils';
import './ProjectDetails.css';

// Animation variants for stagger effect
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 20,
            stiffness: 100
        }
    }
};

const ProjectDetails = ({ project, allProjects, onNavigate }) => {
    console.log('[ProjectDetails] Rendered with animation variants', {
        hasAnimation: true,
        title: project?.title
    });

    return (
        <motion.div
            className="project-details-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div className="project-info" variants={containerVariants}>
                {project.coverImage ? (
                    <motion.div className="project-cover-image" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }} variants={itemVariants}>
                        <img src={project.coverImage} alt={project.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </motion.div>
                ) : project.thumbnail && (
                    <motion.div className="project-cover-image" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }} variants={itemVariants}>
                        <img src={project.thumbnail} alt={project.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </motion.div>
                )}

                <motion.h2 className="project-title-lg" variants={itemVariants}>{project.title}</motion.h2>

                <motion.div className="project-tech-stack" variants={itemVariants}>
                    {project.technologies.map(tech => (
                        <TechTag key={tech} label={tech} />
                    ))}
                </motion.div>

                <motion.div className="project-description" variants={itemVariants} dangerouslySetInnerHTML={{ __html: fixLinks(project.fullDescription) }}></motion.div>

                {project.features && (
                    <motion.div className="project-features" variants={itemVariants}>
                        <motion.h3 variants={itemVariants}>Key Features</motion.h3>
                        <ul>
                            {project.features.map((feature, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: fixLinks('&bull; ' + feature) }}></li>
                            ))}
                        </ul>
                    </motion.div>
                )}

                <motion.div className="project-actions" variants={itemVariants}>
                    {project.liveUrl && project.liveUrl.trim() !== '' && (
                        <Button variant="accent" href={sanitizeUrl(project.liveUrl)}>
                            View Live Demo <FaExternalLinkAlt style={{ marginLeft: 8 }} />
                        </Button>
                    )}
                    {project.githubUrl && project.githubUrl.trim() !== '' && (
                        <Button variant="accent" href={sanitizeUrl(project.githubUrl)} style={{ background: 'transparent', border: '2px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                            GitHub Repo <FaGithub style={{ marginLeft: 8 }} />
                        </Button>
                    )}
                </motion.div>

                {/* Circular Gallery */}
                {project.gallery && project.gallery.length > 0 && (
                    <motion.div className="gallery-container-full" style={{ marginTop: '48px', width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', background: 'var(--color-bg-dark)' }} variants={itemVariants}>
                        <div className="gallery-wrapper">
                            <CircularGallery
                                items={project.gallery}
                                bend={1}
                                textColor="#ffffff"
                                borderRadius={0.05}
                                scrollEase={0.05}
                                scrollSpeed={1.5}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Navigation Footer */}
                {allProjects && (
                    <NavigationFooter
                        items={allProjects.map(p => ({ ...p, coverImage: p.image }))} // Projects use 'image' property
                        onNavigate={onNavigate}
                        currentIndex={allProjects.findIndex(p => p.id === project.id)}
                        title="More Projects"
                    />
                )}
            </motion.div>
        </motion.div>
    );
};

export default ProjectDetails;
