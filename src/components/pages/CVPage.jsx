import React, { useEffect } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../layout/Header';
import BaseSlidePage from '../layout/BaseSlidePage';
import SplitText from '../ui/SplitText';
import Button from '../ui/Button';
import { Download, ExternalLink, Globe, Cpu, Code2, Rocket } from 'lucide-react';
import './CVPage.css';

const CVPage = () => {
    const { about } = useData();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const CoverContent = (
        <div className="cv-cover-container">
            <div className="cv-title-background" style={{ top: about.titleTopPosition || '20%' }}>
                <h1 className="cv-title-text">
                    <SplitText delay={0.2}>CURRICULUM VITAE</SplitText>
                </h1>
            </div>

            <div className="cv-cover-wrapper">
                {(about.backgroundImageDesktop || about.backgroundImageMobile || about.backgroundImage) && (
                    <div className="cv-image-placeholder">
                        {about.backgroundImageDesktop || about.backgroundImageMobile ? (
                            <>
                                {about.backgroundImageDesktop && (
                                    <img src={about.backgroundImageDesktop} alt="Background" className="about-image-desktop" />
                                )}
                                {about.backgroundImageMobile && (
                                    <img src={about.backgroundImageMobile} alt="Background" className="about-image-mobile" />
                                )}
                            </>
                        ) : (
                            about.backgroundImage && <img src={about.backgroundImage} alt="Background" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const DetailContent = (
        <div className="cv-details-container">
            <div className="cv-content">
                {/* Header Info */}
                <section className="cv-section">
                    <h2 style={{ fontSize: '32px', border: 'none', marginBottom: '8px', color: '#fff' }}>Nikita Antimonov</h2>
                    <p className="cv-item-subtitle" style={{ fontSize: '20px' }}>Full-Stack Developer & Creative Technologist</p>

                    <div className="cv-info-grid">
                        <div className="cv-info-item">
                            <span className="label">Location</span>
                            <span className="value">Bali</span>
                        </div>
                        <div className="cv-info-item">
                            <span className="label">Telegram</span>
                            <a href="https://t.me/muvs_music" target="_blank" className="value" style={{ textDecoration: 'underline' }}>@muvs_music</a>
                        </div>
                        <div className="cv-info-item">
                            <span className="label">Email</span>
                            <span className="value">sezfour@gmail.com</span>
                        </div>
                        <div className="cv-info-item">
                            <span className="label">Experience</span>
                            <span className="value">10 Years</span>
                        </div>
                    </div>
                </section>

                {/* Professional Focus */}
                <section className="cv-section">
                    <p className="cv-item-description" style={{ fontSize: '18px', color: '#fff' }}>
                        10 years of experience building everything from startup MVPs to enterprise-scale systems.
                        Now focused on creating innovative, visually striking digital experiences.
                    </p>
                </section>

                {/* My Approach */}
                <section className="cv-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Rocket className="w-5 h-5" style={{ color: '#fff' }} />
                        <h2 style={{ margin: 0, border: 'none', color: '#fff' }}>My Approach</h2>
                    </div>
                    <p className="cv-item-description">
                        In the age of AI, I believe <strong>architecture trumps technology</strong>.
                        I work with React, Django, and modern stacks, but I'm framework-agnostic —
                        the right solution depends on your project's unique needs.
                    </p>
                </section>

                {/* AI Systems */}
                <section className="cv-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Cpu className="w-5 h-5" style={{ color: '#fff' }} />
                        <h2 style={{ margin: 0, border: 'none', color: '#fff' }}>AI Systems</h2>
                    </div>
                    <div className="cv-item-description">
                        <p style={{ marginBottom: '12px' }}>
                            Since 2025, I've been developing AI solutions - from chatbots to automation systems.
                            Currently building AI integrations for travel industry automation (Langchain, RAG, OpenAI/Gemini).
                        </p>
                        <p>
                            I leverage tools like Claude Code and Antigravity to rapidly build MVP prototypes.
                            Experienced in AI imagery, video content, and automated content pipelines.
                        </p>
                    </div>
                </section>

                {/* Toolkit Section */}
                <section className="cv-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Code2 className="w-5 h-5" style={{ color: '#fff' }} />
                        <h2 style={{ margin: 0, border: 'none', color: '#fff' }}>Toolkit</h2>
                    </div>
                    <div className="cv-skills-grid">
                        <div className="cv-skill-category">
                            <h3>AI & Meta</h3>
                            <div className="cv-skill-list">
                                <span className="cv-skill-tag">Claude Code</span>
                                <span className="cv-skill-tag">Antigravity</span>
                                <span className="cv-skill-tag">Lovable</span>
                                <span className="cv-skill-tag">n8n / RAG</span>
                            </div>
                        </div>
                        <div className="cv-skill-category">
                            <h3>Code</h3>
                            <div className="cv-skill-list">
                                <span className="cv-skill-tag">Python / Django</span>
                                <span className="cv-skill-tag">FastAPI / Flask</span>
                                <span className="cv-skill-tag">React / JS</span>
                                <span className="cv-skill-tag">Postgres / Redis</span>
                            </div>
                        </div>
                        <div className="cv-skill-category">
                            <h3>Platforms</h3>
                            <div className="cv-skill-list">
                                <span className="cv-skill-tag">Tilda</span>
                                <span className="cv-skill-tag">Squarespace</span>
                                <span className="cv-skill-tag">Webflow</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Selected Work */}
                <section className="cv-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Globe className="w-5 h-5" style={{ color: '#fff' }} />
                        <h2 style={{ margin: 0, border: 'none', color: '#fff' }}>Websites & Projects</h2>
                    </div>
                    <div className="cv-skills-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                        {['muvs.dev', 'bimxdv.com', 'pacha-alpaca.com', 'caffitaly.ru', 'balibolthouses.id'].map((site) => (
                            <a
                                key={site}
                                href={`https://${site}`}
                                target="_blank"
                                className="cv-skill-tag"
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}
                            >
                                <span>{site}</span>
                                <ExternalLink size={12} />
                            </a>
                        ))}
                    </div>
                </section>

                {/* Experience Summary */}
                <section className="cv-section">
                    <h2>Experience History</h2>

                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">Freelance / AI Automation</span>
                            <span className="cv-item-date">2024 — Present</span>
                        </div>
                        <p className="cv-item-description">
                            Building AI integrations, CRM automations, and React/Django apps (Caffitaly, Nuanu).
                            Focusing on high-speed MVP development using modern AI tools.
                        </p>
                    </div>

                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">Pacha Alpaca</span>
                            <span className="cv-item-date">2023 — 2024</span>
                        </div>
                        <p className="cv-item-subtitle">Co-founder & Architect</p>
                        <p className="cv-item-description">
                            Launched an autonomous alpaca farm business on Bali. Managed full cycle:
                            design, construction, and AI-driven marketing automation.
                        </p>
                    </div>

                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">Action (action.ru)</span>
                            <span className="cv-item-date">2020 — 2023</span>
                        </div>
                        <p className="cv-item-subtitle">Web Developer</p>
                        <p className="cv-item-description">
                            Developed reporting systems and recruitment platforms.
                            Stack: Django, Celery, Postgres, Redis, Sentry, Kibana.
                        </p>
                    </div>

                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">IFK Vremya / Crypto Practice</span>
                            <span className="cv-item-date">2018 — 2020</span>
                        </div>
                        <p className="cv-item-description">
                            Developed high-frequency trading software, bots, and indicators for crypto markets.
                            Django, React, ZeroMQ, neural networks for trade execution.
                        </p>
                    </div>

                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">Taiga System</span>
                            <span className="cv-item-date">2016 — 2018</span>
                        </div>
                        <p className="cv-item-subtitle">Full-Stack Developer</p>
                        <p className="cv-item-description">
                            Redesign and API development for security systems (Anti-theft).
                            Django, EmberJS, RabbitMQ.
                        </p>
                    </div>
                </section>

                {/* Education */}
                <section className="cv-section">
                    <h2>Education</h2>
                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">HSE University, Moscow</span>
                            <span className="cv-item-date">2018</span>
                        </div>
                        <p className="cv-item-subtitle">Master's Degree</p>
                        <p className="cv-item-description">Computer Systems and Networks</p>
                    </div>

                    <div className="cv-item">
                        <div className="cv-item-header">
                            <span className="cv-item-title">HSE University, Moscow</span>
                            <span className="cv-item-date">2016</span>
                        </div>
                        <p className="cv-item-subtitle">Master's Degree</p>
                        <p className="cv-item-description">Industrial Automation & Production Systems</p>
                    </div>
                </section>

                {/* Final Note / CTA */}
                <section className="cv-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '48px', marginTop: '64px' }}>
                    <h2 style={{ border: 'none' }}>Let's Create Something</h2>
                    <p className="cv-item-description" style={{ fontSize: '18px', marginBottom: '24px' }}>
                        I work with existing designs or collaborate from concept to launch.
                        Open to creative projects, experimental web experiences, and innovative applications.
                    </p>
                    <p className="cv-item-description" style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                        This site is a live example - built from scratch in one week with a functional admin panel and performance optimization.
                        Interested in something similar? Let's collaborate.
                    </p>

                    <div className="cv-download-btn" style={{ justifyContent: 'flex-start' }}>
                        <Button
                            variant="accent"
                            href="/resume/resume.pdf"
                            style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}
                        >
                            Download Full PDF
                            <Download className="w-5 h-5" />
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );

    return (
        <>
            <Header />
            <BaseSlidePage
                coverContent={CoverContent}
                detailContent={DetailContent}
                pageId="cv"
                textColor="white"
            />
        </>
    );
};

export default CVPage;
