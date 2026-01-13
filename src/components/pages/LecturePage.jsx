import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { lectureSlides } from '../../data/lectureData';
import './LecturePage.css';

const {
  ChevronLeft, ChevronRight, Home, Maximize, Minimize, ChevronDown, ChevronUp,
  ExternalLink, CheckCircle2, BookOpen
} = LucideIcons;

// Dynamic icon component
const DynamicIcon = ({ name, size = 24, className = "", color = "currentColor" }) => {
  if (!name) return null;
  const IconComponent = LucideIcons[name] || LucideIcons.HelpCircle;
  return <IconComponent size={size} className={className} color={color} />;
};

// Unified animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } }
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 15 } }
};

const IconWrapper = ({ children, className = "" }) => (
  <span className={`lecture-icon ${className}`}>{children}</span>
);

const SlideRenderer = ({ slide, expandedItems, toggleExpanded }) => {
  const renderContent = () => {
    switch (slide.type) {
      case 'title':
        return (
          <motion.div className="lecture-title-slide" variants={containerVariants}>
            <motion.h1 className="lecture-title-main" variants={itemVariants}>{slide.title}</motion.h1>
            <motion.p className="lecture-subtitle-main" variants={itemVariants}>{slide.subtitle}</motion.p>
          </motion.div>
        );
      case 'timeline':
        return (
          <div className="lecture-concept" style={{ width: '100%' }}>
            <div className="lecture-horizontal-timeline">
              {slide.content.phases.map((phase, idx) => (
                <motion.div key={idx} className="lecture-h-step" variants={itemVariants}>
                  <div className="lecture-h-dot">
                    <DynamicIcon name={phase.icon} size={16} />
                  </div>
                  <span className="lecture-h-year">{phase.period}</span>
                  <span className="lecture-h-title">{phase.title}</span>
                  <p className="lecture-h-desc">{phase.expanded}</p>
                </motion.div>
              ))}
            </div>
            {slide.content.current_moment && (
              <motion.div className="lecture-timeline-current" variants={itemVariants} style={{ marginTop: '40px', textAlign: 'center', width: '100%' }}>
                <span className="lecture-timeline-label">Контекст 2026</span>
                <p>{slide.content.current_moment}</p>
              </motion.div>
            )}
            {slide.content.implication && (
              <motion.div className="lecture-timeline-implication" variants={itemVariants} style={{ marginTop: '20px', textAlign: 'center', width: '100%' }}>
                <span className="lecture-timeline-label">Вывод</span>
                <p>{slide.content.implication}</p>
              </motion.div>
            )}
          </div>
        );
      case 'balance':
        return (
          <div className="lecture-balance">
            <div className="lecture-balance-content">
              <motion.div className="lecture-balance-side lecture-shaolin" variants={scaleVariants}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <DynamicIcon name={slide.content[0].icon} size={24} />
                  <h3 style={{ margin: 0 }}>Шаолинь</h3>
                </div>
                <p>{slide.content[0].text}</p>
              </motion.div>
              <div className="lecture-balance-center">+</div>
              <motion.div className="lecture-balance-side lecture-ai" variants={scaleVariants}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <DynamicIcon name={slide.content[1].icon} size={24} color="white" />
                  <h3 style={{ margin: 0, color: 'white' }}>AI</h3>
                </div>
                <p>{slide.content[1].text}</p>
              </motion.div>
            </div>
            <motion.div className="lecture-balance-side lecture-result" variants={itemVariants} style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <DynamicIcon name={slide.content[2].icon} size={24} />
                <h3 style={{ margin: 0 }}>Результат</h3>
              </div>
              <p>{slide.content[2].text}</p>
            </motion.div>
          </div>
        );
      case 'checklist':
        return (
          <div className="lecture-checklist">
            {slide.content.map((item, idx) => (
              <motion.div key={idx} className="lecture-checklist-item" variants={itemVariants}>
                <IconWrapper><CheckCircle2 size={24} color="#006d51" /></IconWrapper>
                {item.text}
              </motion.div>
            ))}
          </div>
        );
      case 'bio':
        return (
          <div className="lecture-bio-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {slide.content.map((item, idx) => (
              <motion.div key={idx} className="lecture-bio-item" variants={itemVariants} style={{
                background: '#fafafa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '15px',
                border: '1px solid #e0e0e0',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <DynamicIcon name={item.icon} size={24} color="#006d51" />
                <span style={{ fontSize: '20px', lineHeight: '1.5' }}>{item.text}</span>
              </motion.div>
            ))}
          </div>
        );
      case 'tools':
        return (
          <div className="lecture-tools-grid">
            {Object.entries(slide.content).map(([category, data], idx) => {
              const itemId = `${slide.id}-${idx}`;
              const isExpanded = expandedItems[itemId];
              return (
                <motion.div key={idx} className="lecture-tool-category" variants={itemVariants}>
                  <div className="lecture-tool-header" onClick={() => toggleExpanded(itemId)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <DynamicIcon name={data.icon} size={20} />
                      <h3 style={{ margin: 0 }}>{category}</h3>
                    </div>
                    <IconWrapper>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</IconWrapper>
                  </div>
                  <div className="lecture-tool-items" style={{ marginTop: '10px' }}>
                    {data.tools.map((tool, tIdx) => (
                      <a key={tIdx} href={tool.url} target="_blank" rel="noopener noreferrer" className="lecture-tool-badge clickable">
                        {tool.name} <ExternalLink size={12} className="lecture-tool-link-icon" />
                      </a>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="lecture-tool-expanded"
                      >
                        {data.expanded}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        );
      case 'concept':
        return (
          <div className="lecture-concept">
            <motion.p className="lecture-definition" variants={itemVariants}>{slide.content.definition}</motion.p>
            <div className="lecture-timeline">
              {slide.content.types.map((type, idx) => {
                const itemId = `${slide.id}-${idx}`;
                const isExpanded = expandedItems[itemId];
                return (
                  <motion.div key={idx} className="lecture-timeline-phase" variants={itemVariants}>
                    <div className="lecture-timeline-phase-header" onClick={() => toggleExpanded(itemId)}>
                      <IconWrapper><DynamicIcon name={type.icon} size={20} /></IconWrapper>
                      <span className="lecture-timeline-title">{type.title}</span>
                      <IconWrapper>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</IconWrapper>
                    </div>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="lecture-concept-expanded"
                        >
                          {type.expanded}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      case 'neural-simple':
        return (
          <div className="lecture-concept" style={{ width: '100%' }}>
            <motion.p className="lecture-definition" variants={itemVariants}>{slide.content.what_is_nn}</motion.p>

            <div className="lecture-horizontal-timeline">
              {slide.content.timeline.map((event, idx) => (
                <motion.div key={idx} className="lecture-h-step" variants={itemVariants}>
                  <div className="lecture-h-dot">
                    <DynamicIcon name={event.icon} size={16} />
                  </div>
                  <span className="lecture-h-year">{event.year}</span>
                  <span className="lecture-h-title">{event.title}</span>
                  <p className="lecture-h-desc">{event.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="lecture-checklist" style={{ marginTop: '40px', width: '100%', maxWidth: '1000px' }}>
              {slide.content.why_now.map((item, idx) => (
                <motion.div key={idx} className="lecture-checklist-item" variants={itemVariants}>
                  <DynamicIcon name={item.icon} size={20} color="#006d51" />
                  <span style={{ marginLeft: '10px' }}>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        );
      case 'prompt-advanced':
        return (
          <div className="lecture-case-study">
            <motion.div className="lecture-timeline-implication" variants={itemVariants} style={{ background: '#000', marginBottom: '30px' }}>
              <span className="lecture-timeline-label" style={{ color: '#fff' }}>Формула</span>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{slide.content.formula}</p>
            </motion.div>
            <div className="lecture-timeline">
              {slide.content.techniques.map((tech, idx) => {
                const itemId = `${slide.id}-${idx}`;
                const isExpanded = expandedItems[itemId];
                return (
                  <motion.div key={idx} className="lecture-timeline-phase" variants={itemVariants}>
                    <div className="lecture-timeline-phase-header" onClick={() => toggleExpanded(itemId)}>
                      <IconWrapper><DynamicIcon name={tech.icon} size={20} /></IconWrapper>
                      <span className="lecture-timeline-title">{tech.title}</span>
                      <IconWrapper>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</IconWrapper>
                    </div>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="lecture-timeline-expanded"
                        >
                          {tech.expanded}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            <div className="lecture-prompt-comparison" style={{ marginTop: '30px' }}>
              <div className="lecture-prompt-bad">
                <h4 style={{ color: '#ff4d4d' }}>Bad Prompt</h4>
                <p>{slide.content.example.bad}</p>
              </div>
              <div className="lecture-prompt-good">
                <h4 style={{ color: '#006d51' }}>Good Prompt</h4>
                <p>{slide.content.example.good}</p>
              </div>
            </div>
          </div>
        );
      case 'case-study':
        return (
          <div className="lecture-case-study">
            {slide.subtitle && <motion.h3 className="lecture-subtitle" variants={itemVariants} style={{ color: '#006d51', marginBottom: '20px' }}>{slide.subtitle}</motion.h3>}
            <div className="lecture-timeline">
              {slide.content.process && slide.content.process.map((step, idx) => {
                const itemId = `${slide.id}-step-${idx}`;
                const isExpanded = expandedItems[itemId];
                return (
                  <motion.div key={idx} className="lecture-timeline-phase" variants={itemVariants}>
                    <div className="lecture-timeline-phase-header" onClick={() => toggleExpanded(itemId)}>
                      <IconWrapper><DynamicIcon name={step.icon} size={20} /></IconWrapper>
                      <span className="lecture-timeline-title">{step.title}</span>
                      <IconWrapper>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</IconWrapper>
                    </div>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="lecture-timeline-expanded"
                        >
                          {step.expanded}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Handling for weeks in slide 15 */}
              {slide.content.weeks && slide.content.weeks.map((week, idx) => {
                const itemId = `${slide.id}-week-${idx}`;
                const isExpanded = expandedItems[itemId];
                return (
                  <motion.div key={idx} className="lecture-timeline-phase" variants={itemVariants}>
                    <div className="lecture-timeline-phase-header" onClick={() => toggleExpanded(itemId)}>
                      <IconWrapper><DynamicIcon name={week.icon} size={20} /></IconWrapper>
                      <span className="lecture-timeline-title">{week.title}</span>
                      <IconWrapper>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</IconWrapper>
                    </div>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="lecture-timeline-expanded"
                        >
                          {week.expanded}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Special handling for final slide message structure */}
              {slide.content.message && slide.content.message.map((msg, idx) => {
                const itemId = `${slide.id}-msg-${idx}`;
                const isExpanded = expandedItems[itemId];
                return (
                  <motion.div key={idx} className="lecture-timeline-phase" variants={itemVariants}>
                    <div className="lecture-timeline-phase-header" onClick={() => toggleExpanded(itemId)}>
                      <IconWrapper><DynamicIcon name={msg.icon} size={20} /></IconWrapper>
                      <span className="lecture-timeline-title">{msg.title}</span>
                      <IconWrapper>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</IconWrapper>
                    </div>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="lecture-timeline-expanded"
                        >
                          {msg.expanded}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {slide.content.insights && (
              <motion.div className="lecture-timeline-implication" variants={itemVariants} style={{ marginTop: '20px' }}>
                <span className="lecture-timeline-label">Инсайты</span>
                <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
                  {slide.content.insights.map((insight, idx) => <li key={idx} style={{ marginBottom: '5px' }}>{insight}</li>)}
                </ul>
              </motion.div>
            )}

            {slide.content.final_quote && (
              <motion.div variants={scaleVariants} style={{ marginTop: '40px', padding: '30px', background: '#fafafa', borderRadius: '15px', border: '2px solid #000' }}>
                <p style={{ fontSize: '22px', fontStyle: 'italic', margin: 0 }}>"{slide.content.final_quote}"</p>
                {slide.content.call_to_action && <p style={{ marginTop: '20px', fontWeight: 'bold', color: '#006d51' }}>{slide.content.call_to_action}</p>}
              </motion.div>
            )}

            {slide.content.tools && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {slide.content.tools.map((tool, idx) => <span key={idx} className="lecture-tool-badge">{tool}</span>)}
              </div>
            )}
          </div>
        );
      default:
        return <div className="lecture-placeholder">Content type {slide.type} not implemented yet</div>;
    }
  };

  return (
    <motion.div className="lecture-content" variants={containerVariants} initial="hidden" animate="visible">
      {slide.type !== 'title' && <motion.h2 className="lecture-slide-title" variants={itemVariants}>{slide.title}</motion.h2>}
      {renderContent()}
    </motion.div>
  );
};

const LecturePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const navigate = useNavigate();

  const toggleExpanded = useCallback((itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setCurrentSlide(p => Math.min(p + 1, lectureSlides.length - 1));
      else if (e.key === 'ArrowLeft') setCurrentSlide(p => Math.max(p - 1, 0));
      else if (e.key === 'Escape') isFullscreen ? toggleFullscreen() : navigate('/');
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, navigate, toggleFullscreen]);

  const slide = lectureSlides[currentSlide];
  const progress = ((currentSlide + 1) / lectureSlides.length) * 100;

  return (
    <div className="lecture-page">
      <div className="lecture-progress"><motion.div className="lecture-progress-bar" animate={{ width: `${progress}%` }} /></div>
      <div className="lecture-counter">{currentSlide + 1} / {lectureSlides.length}</div>
      <button className="lecture-home-btn" onClick={() => navigate('/')}><Home size={20} /></button>
      <button className="lecture-text-btn" onClick={() => navigate('/lecture-text')}>
        <BookOpen size={20} />
      </button>
      <button className="lecture-fullscreen-btn" onClick={toggleFullscreen}>
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      <div className="lecture-slide">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%' }}
          >
            <SlideRenderer slide={slide} expandedItems={expandedItems} toggleExpanded={toggleExpanded} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="lecture-nav">
        <button className="lecture-nav-btn" onClick={() => setCurrentSlide(p => Math.max(p - 1, 0))} disabled={currentSlide === 0}><ChevronLeft size={32} /></button>
        <button className="lecture-nav-btn" onClick={() => setCurrentSlide(p => Math.min(p + 1, lectureSlides.length - 1))} disabled={currentSlide === lectureSlides.length - 1}><ChevronRight size={32} /></button>
      </div>
    </div>
  );
};

export default LecturePage;
