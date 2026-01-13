import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, BookOpen, Zap, Target, ArrowRight } from 'lucide-react';
import { lectureTextContent } from '../../data/lectureTextContent';
import './LectureTextPage.css';

const LectureTextPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="lecture-text-container">
            <nav className="lecture-sticky-nav">
                <button className="back-btn" onClick={() => navigate('/lecture')}>
                    <ChevronLeft size={16} /> Слайды
                </button>
                <div className="lecture-meta">
                    2026 Edition <span className="dot">•</span> Конспект
                </div>
            </nav>

            <header className="lecture-text-header">
                <h1>Автоматизация и AI системы</h1>
                <div className="lecture-meta">
                    2 часа интенсивного погружения в архитектуру будущего
                </div>
            </header>

            <motion.main
                className="lecture-text-content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {Object.entries(lectureTextContent).map(([id, slide]) => (
                    <motion.section key={id} id={`section-${id}`} className="lecture-text-section" variants={itemVariants}>
                        <div className="section-number">{id.padStart(2, '0')}</div>
                        <h2 className="section-title">{slide.title}</h2>

                        <div className="section-narrative">
                            <p>{slide.talk}</p>
                        </div>

                        {slide.practice && (
                            <div className="section-practice">
                                <div className="practice-badge">
                                    <Zap size={14} /> Практика & Демо
                                </div>
                                <div className="practice-content">
                                    {slide.practice}
                                </div>
                            </div>
                        )}
                    </motion.section>
                ))}

                <footer className="lecture-text-footer">
                    <div className="final-note">
                        <Target size={40} />
                        <h3>Готовы стать архитектором?</h3>
                        <p>Этот конспект — ваша дорожная карта. Начните с малого, стройте системы, автоматизируйте хаос.</p>
                        <button className="cta-btn" onClick={() => navigate('/lecture')}>
                            Вернуться к слайдам <ArrowRight size={20} />
                        </button>
                    </div>
                </footer>
            </motion.main>
        </div>
    );
};

export default LectureTextPage;
