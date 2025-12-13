import React from 'react';
import Button from '../ui/Button';
import TechTag from '../ui/TechTag';
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import './ProjectDetails.css';

const ProjectDetails = ({ project }) => {
    return (
        <div className="project-details-container">
            <div className="project-info">
                <h2 className="project-title-lg">{project.title}</h2>

                <div className="project-tech-stack">
                    {project.technologies.map(tech => (
                        <TechTag key={tech} label={tech} />
                    ))}
                </div>

                <div className="project-description" dangerouslySetInnerHTML={{ __html: project.fullDescription }}></div>

                {project.features && (
                    <div className="project-features">
                        <h3>Key Features</h3>
                        <ul>
                            {project.features.map((feature, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: `• ${feature}` }}></li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="project-actions">
                    <Button variant="accent" href={project.liveUrl}>
                        View Live Demo <FaExternalLinkAlt style={{ marginLeft: 8 }} />
                    </Button>
                    <Button variant="accent" href={project.githubUrl} style={{ background: 'transparent', border: '2px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                        GitHub Repo <FaGithub style={{ marginLeft: 8 }} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetails;
