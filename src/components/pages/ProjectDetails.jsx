```javascript
import React from 'react';
import Button from '../ui/Button';
import TechTag from '../ui/TechTag';
import CircularGallery from '../media/CircularGallery';
import NavigationFooter from '../layout/NavigationFooter';
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { sanitizeUrl } from '../../utils/linkHelpers';
import { fixLinks } from '../../utils/linkUtils';
import './ProjectDetails.css';

const ProjectDetails = ({ project, allProjects, onNavigate }) => {
    return (
        <div className="project-details-container">
            <div className="project-info">
                {project.coverImage ? (
                    <div className="project-cover-image" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                        <img src={project.coverImage} alt={project.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                ) : project.thumbnail && (
                    <div className="project-cover-image" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                        <img src={project.thumbnail} alt={project.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                )}

                <h2 className="project-title-lg">{project.title}</h2>

                <div className="project-tech-stack">
                    {project.technologies.map(tech => (
                        <TechTag key={tech} label={tech} />
                    ))}
                </div>

                <div className="project-description" dangerouslySetInnerHTML={{ __html: fixLinks(project.fullDescription) }}></div>

                {project.features && (
                    <div className="project-features">
                        <h3>Key Features</h3>
                        <ul>
                            {project.features.map((feature, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: fixLinks('&bull; ' + feature) }}></li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="project-actions">
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
                </div>

                {/* Circular Gallery */}
                {project.gallery && project.gallery.length > 0 && (
                    <div className="gallery-container-full" style={{ marginTop: '48px', width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', background: 'var(--color-bg-dark)' }}>
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
                    </div>
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
            </div>
        </div>
    );
};

export default ProjectDetails;
