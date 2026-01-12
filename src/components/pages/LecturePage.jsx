import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Home, Maximize, Minimize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './LecturePage.css';

// Lecture slides data
const lectureSlides = [
  // BLOCK 1: INTRODUCTION
  {
    block: 'intro',
    id: 1,
    title: 'Автоматизация и AI системы',
    subtitle: 'Как изменить свою жизнь с помощью искусственного интеллекта',
    type: 'title'
  },
  {
    block: 'intro',
    id: 2,
    title: 'Мы на рубеже эпохи',
    content: [
      'AI — это не будущее, это настоящее',
      'Те, кто освоит AI — будут лидерами',
      'Те, кто проигнорирует — останутся позади'
    ],
    type: 'list',
    timing: '3 мин'
  },
  {
    block: 'intro',
    id: 3,
    title: 'Шаолинь + AI = Суперспособности',
    content: [
      'Шаолинь: дисциплина, фокус, практика',
      'AI: ускорение, масштабирование, эффективность',
      'Вместе: путь мастера новой эпохи'
    ],
    type: 'balance',
    timing: '4 мин'
  },
  {
    block: 'intro',
    id: 4,
    title: 'Чему вы научитесь за 2 часа',
    content: [
      '✓ Понимать как работает AI',
      '✓ Внедрить AI в повседневную жизнь',
      '✓ Автоматизировать рутинные задачи',
      '✓ Создать личную систему продуктивности',
      '✓ Подготовиться к будущему'
    ],
    type: 'checklist',
    timing: '3 мин'
  },
  {
    block: 'intro',
    id: 5,
    title: 'Моя история',
    content: [
      'Опыт работы с AI-технологиями',
      'Реальные кейсы автоматизации',
      'Личная трансформация через AI'
    ],
    type: 'bio',
    timing: '3 мин'
  },

  // BLOCK 2: AI FUNDAMENTALS
  {
    block: 'fundamentals',
    id: 6,
    title: 'Что такое AI на самом деле',
    content: {
      definition: 'AI ≠ магия, это математика и данные',
      types: ['Узкоспециализированный AI', 'Общий AI (AGI)', 'Генеративный AI']
    },
    type: 'concept',
    timing: '5 мин'
  },
  {
    block: 'fundamentals',
    id: 7,
    title: 'Как обучается AI',
    content: ['Сбор данных', 'Обучение на примерах', 'Тестирование', 'Улучшение'],
    type: 'process',
    analogy: 'Как учится ученик Шаолиня',
    timing: '4 мин'
  },
  {
    block: 'fundamentals',
    id: 8,
    title: 'Основные инструменты 2025',
    content: {
      'Текст': ['ChatGPT', 'Claude', 'Gemini'],
      'Картинки': ['Midjourney', 'DALL-E', 'Stable Diffusion'],
      'Видео': ['Runway', 'Pika'],
      'Код': ['Copilot', 'Cursor'],
      'Автоматизация': ['Zapier', 'Make']
    },
    type: 'tools',
    timing: '5 мин'
  },
  {
    block: 'fundamentals',
    id: 9,
    title: 'Prompt Engineering — искусство запросов',
    content: {
      formula: 'Роль + Контекст + Задача + Ограничения + Формат',
      example: '"Ты — эксперт по продуктивности. Мне нужно организовать рабочий день. Предложи расписание с учётом биоритмов. Только 3 приоритета. В виде таблицы."'
    },
    type: 'formula',
    timing: '6 мин'
  },
  {
    block: 'fundamentals',
    id: 10,
    title: 'Ограничения и этика',
    content: [
      'AI может ошибаться (галлюцинации)',
      'Проверяйте факты',
      'Личные данные — личные',
      'Авторство и честность'
    ],
    type: 'warning',
    timing: '4 мин'
  },
  {
    block: 'fundamentals',
    id: 11,
    title: 'Практическое упражнение 1',
    content: {
      task: 'Ваш первый AI-диалог',
      steps: [
        'Откройте ChatGPT/Claude',
        'Задайте вопрос о вашей проблеме',
        'Попробуйте улучшить промпт',
        'Сравните результаты'
      ]
    },
    type: 'exercise',
    timing: '8 мин'
  },

  // BLOCK 3: EVERYDAY LIFE
  {
    block: 'everyday',
    id: 12,
    title: 'Утренняя рутина с AI',
    content: {
      items: [
        'AI-ассистент для планирования дня',
        'Генерация идей для задач',
        'Анализ приоритетов',
        'Быстрые заметки голосом'
      ],
      integration: 'Календарь, задачи, заметки'
    },
    type: 'routine',
    timing: '4 мин'
  },
  {
    block: 'everyday',
    id: 13,
    title: 'Обучение и развитие',
    content: {
      features: [
        'Объяснение сложных концепций простым языком',
        'Создание учебных планов',
        'Практика и тестирование знаний',
        'Языковая практика'
      ],
      example: '"Объясни квантовую физику как будто мне 12 лет"'
    },
    type: 'learning',
    timing: '5 мин'
  },
  {
    block: 'everyday',
    id: 14,
    title: 'Здоровье и фитнес',
    content: {
      features: [
        'Генерация тренировок по запросу',
        'Анализ питания из фото',
        'Трекер прогресса',
        'Мотивация и напоминания'
      ],
      connection: 'Связь с Шаолинь: Комплексный подход'
    },
    type: 'wellness',
    timing: '4 мин'
  },
  {
    block: 'everyday',
    id: 15,
    title: 'Творчество и идеи',
    content: [
      'Генерация идей для проектов',
      'Написание черновиков',
      'Создание визуалов',
      'Музыка и звук'
    ],
    type: 'creative',
    note: 'Важно: AI = инструмент, вы = автор',
    timing: '5 мин'
  },
  {
    block: 'everyday',
    id: 16,
    title: 'Коммуникации',
    content: {
      features: [
        'Черновики писем',
        'Перевод и адаптация тона',
        'Резюмирование длинных текстов',
        'Анализ эмоционального тона'
      ],
      example: '"Ответь на это письмо вежливо, но твёрдо"'
    },
    type: 'communication',
    timing: '4 мин'
  },
  {
    block: 'everyday',
    id: 17,
    title: 'Финансы и планирование',
    content: {
      features: [
        'Анализ трат',
        'Бюджетирование',
        'Инвестиционные идеи',
        'Обучение финансовой грамотности'
      ],
      warning: 'Предостережение: Не доверяйте слепо, проверяйте'
    },
    type: 'finance',
    timing: '4 мин'
  },
  {
    block: 'everyday',
    id: 18,
    title: 'Практическое упражнение 2',
    content: {
      task: 'Создаём личного AI-ассистента',
      steps: [
        'Определите 3 рутинные задачи',
        'Создайте промпт для автоматизации',
        'Протестируйте и улучшите',
        'Сохраните как шаблон'
      ]
    },
    type: 'exercise',
    timing: '10 мин'
  },

  // BLOCK 4: AUTOMATION
  {
    block: 'automation',
    id: 19,
    title: 'Что такое автоматизация',
    content: {
      definition: 'Автоматизация = делаем один раз, используется много раз',
      principles: [
        'Если задачу делаете >2 раз — автоматизируйте',
        'Начните с простого',
        'Улучшайте постепенно'
      ]
    },
    type: 'concept',
    timing: '4 мин'
  },
  {
    block: 'automation',
    id: 20,
    title: 'Инструменты автоматизации',
    content: {
      'Zapier/Make': 'Соединение сервисов',
      'IFTTT': 'Простые правила если-то',
      'n8n': 'Open source альтернатива',
      'Google Sheets + Apps Script': 'Для продвинутых'
    },
    type: 'tools',
    timing: '5 мин'
  },
  {
    block: 'automation',
    id: 21,
    title: 'Примеры автоматизаций',
    content: [
      'Telegram → Notion (сохранение статей)',
      'Длинные email → Краткое содержание',
      'Новая задача → Google Calendar',
      'Покупка → Google Sheets статистика',
      'Новое видео → Пост в Telegram'
    ],
    type: 'automation-examples',
    timing: '6 мин'
  },
  {
    block: 'automation',
    id: 22,
    title: 'Построение второй системы мозга',
    content: {
      para: {
        'Projects': 'Активные проекты',
        'Areas': 'Области ответственности',
        'Resources': 'Ресурсы для будущего',
        'Archives': 'Завершённые проекты'
      },
      ai: 'AI-усиление: Автоматическая сортировка, поиск, связи'
    },
    type: 'system',
    timing: '5 мин'
  },
  {
    block: 'automation',
    id: 23,
    title: 'Персональная система знаний',
    content: {
      tools: ['Notion', 'Obsidian', 'Logseq', 'Evernote'],
      ai: 'AI-функции: Автоматические теги, резюме, идеи'
    },
    type: 'knowledge',
    timing: '4 мин'
  },
  {
    block: 'automation',
    id: 24,
    title: 'Практическое упражнение 3',
    content: {
      task: 'Первая автоматизация',
      steps: [
        'Выберите простую задачу',
        'Создайте сценарий в Make/Zapier',
        'Протестируйте',
        'Запланируйте расширение'
      ]
    },
    type: 'exercise',
    timing: '10 мин'
  },

  // BLOCK 5: FUTURE
  {
    block: 'future',
    id: 25,
    title: 'Тренды 2025-2030',
    content: [
      'Multimodal AI (текст + голос + видео)',
      'Personal AI (персональные модели)',
      'Autonomous agents (самостоятельные агенты)',
      'AI в устройстве (приватность)'
    ],
    type: 'trends',
    timing: '4 мин'
  },
  {
    block: 'future',
    id: 26,
    title: 'Карьера в AI-эпоху',
    content: [
      'Prompt Engineering',
      'AI-литератность',
      'Критическое мышление',
      'Адаптивность',
      'Человеческие soft skills'
    ],
    type: 'skills',
    advice: 'Учитесь постоянно, AI — ваш помощник',
    timing: '5 мин'
  },
  {
    block: 'future',
    id: 27,
    title: 'Вызов и ответственность',
    content: [
      'Приватность данных',
      'Этичное использование',
      'Экологический footprint',
      'Цифровое неравенство'
    ],
    type: 'ethics',
    principle: 'Шаолинь принцип: Баланс силы и ответственности',
    timing: '4 мин'
  },
  {
    block: 'future',
    id: 28,
    title: 'План действий на 30 дней',
    content: {
      week1: 'Изучение + эксперименты',
      week2: 'Первые автоматизации',
      week3: 'Построение системы',
      week4: 'Оптимизация и масштабирование'
    },
    type: 'plan',
    timing: '4 мин'
  },
  {
    block: 'future',
    id: 29,
    title: 'Ресурсы для углубления',
    content: {
      books: ['Life 3.0', 'AI Superpowers', 'The Inevitable'],
      channels: 'Telegram-каналы',
      youtube: 'YouTube туториалы',
      community: 'Сообщество практиков'
    },
    type: 'resources',
    timing: '3 мин'
  },
  {
    block: 'future',
    id: 30,
    title: 'Будущее создаёте вы',
    content: {
      quote: '"AI не заменит вас. Вас заменит человек с AI."',
      actions: ['Начните сегодня', 'Экспериментируйте', 'Делитесь с другими', 'Растите вместе']
    },
    type: 'final',
    timing: '3 мин'
  }
];

const LecturePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNav, setShowNav] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.log('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else {
          navigate('/');
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key >= '0' && e.key <= '9') {
        const slideNum = parseInt(e.key);
        if (slideNum > 0 && slideNum <= lectureSlides.length) {
          setCurrentSlide(slideNum - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide, navigate, isFullscreen, toggleFullscreen]);

  const goNext = useCallback(() => {
    if (currentSlide < lectureSlides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const slide = lectureSlides[currentSlide];
  const progress = ((currentSlide + 1) / lectureSlides.length) * 100;

  // Get block indicator
  const blockNames = {
    intro: 'Введение',
    fundamentals: 'Основы AI',
    everyday: 'Повседневность',
    automation: 'Автоматизация',
    future: 'Будущее'
  };

  return (
    <div className="lecture-page">
      {/* Progress bar */}
      <div className="lecture-progress">
        <motion.div
          className="lecture-progress-bar"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Slide counter */}
      <div className="lecture-counter">
        {currentSlide + 1} / {lectureSlides.length}
      </div>

      {/* Home button */}
      <button
        className="lecture-home-btn"
        onClick={() => navigate('/')}
        aria-label="Home"
      >
        <Home size={24} />
      </button>

      {/* Fullscreen button */}
      <button
        className="lecture-home-btn lecture-fullscreen-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        style={{ left: '80px' }}
      >
        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
      </button>

      {/* Main slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="lecture-slide"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {/* Block indicator */}
          <div className="lecture-block-indicator">
            {blockNames[slide.block]}
          </div>

          {/* Slide content */}
          <div className="lecture-content">
            {slide.type === 'title' && (
              <>
                <motion.h1
                  className="lecture-title-main"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.title}
                </motion.h1>
                <motion.p
                  className="lecture-subtitle-main"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {slide.subtitle}
                </motion.p>
              </>
            )}

            {slide.type === 'list' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <ul className="lecture-list">
                  {Array.isArray(slide.content) && slide.content.map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </>
            )}

            {slide.type === 'balance' && (
              <div className="lecture-balance">
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-balance-content">
                  <div className="lecture-balance-side lecture-shaolin">
                    <h3>Шаолинь</h3>
                    {Array.isArray(slide.content) && slide.content.slice(0, 1).map((item, idx) => (
                      <p key={idx}>{item}</p>
                    ))}
                  </div>
                  <div className="lecture-balance-center">+</div>
                  <div className="lecture-balance-side lecture-ai">
                    <h3>AI</h3>
                    {Array.isArray(slide.content) && slide.content.slice(1, 2).map((item, idx) => (
                      <p key={idx}>{item}</p>
                    ))}
                  </div>
                  <div className="lecture-balance-center">=</div>
                  <div className="lecture-balance-side lecture-result">
                    <h3>Результат</h3>
                    {Array.isArray(slide.content) && slide.content.slice(2).map((item, idx) => (
                      <p key={idx}>{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {slide.type === 'checklist' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-checklist">
                  {Array.isArray(slide.content) && slide.content.map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-checklist-item"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'bio' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-bio">
                  {Array.isArray(slide.content) && slide.content.map((item, idx) => (
                    <motion.p
                      key={idx}
                      className="lecture-bio-item"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.2 }}
                    >
                      {item}
                    </motion.p>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'concept' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-concept">
                  {slide.content.definition && (
                    <p className="lecture-definition">{slide.content.definition}</p>
                  )}
                  {slide.content.types && (
                    <div className="lecture-types">
                      {slide.content.types.map((type, idx) => (
                        <div key={idx} className="lecture-type-badge">{type}</div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {slide.type === 'process' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-process">
                  {Array.isArray(slide.content) && slide.content.map((step, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-process-step"
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.15 }}
                    >
                      <div className="lecture-step-number">{idx + 1}</div>
                      <div className="lecture-step-text">{step}</div>
                      {idx < slide.content.length - 1 && <div className="lecture-step-arrow">→</div>}
                    </motion.div>
                  ))}
                </div>
                {slide.analogy && (
                  <p className="lecture-analogy">💡 {slide.analogy}</p>
                )}
              </>
            )}

            {slide.type === 'tools' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-tools-grid">
                  {Object.entries(slide.content).map(([category, tools], idx) => (
                    <motion.div
                      key={category}
                      className="lecture-tool-category"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <h3>{category}</h3>
                      <div className="lecture-tool-items">
                        {Array.isArray(tools) && tools.map((tool, toolIdx) => (
                          <span key={toolIdx} className="lecture-tool-badge">{tool}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'formula' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-formula-box">
                  <div className="lecture-formula">{slide.content.formula}</div>
                  <div className="lecture-example">
                    <strong>Пример:</strong> {slide.content.example}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'warning' && (
              <>
                <h2 className="lecture-slide-title">⚠️ {slide.title}</h2>
                <div className="lecture-warning-list">
                  {Array.isArray(slide.content) && slide.content.map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-warning-item"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'exercise' && (
              <div className="lecture-exercise">
                <div className="lecture-exercise-header">
                  <span className="lecture-exercise-badge">ПРАКТИКА</span>
                  <h2 className="lecture-exercise-title">{slide.content.task}</h2>
                </div>
                <div className="lecture-exercise-steps">
                  {slide.content.steps.map((step, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-exercise-step"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <span className="lecture-step-num">{idx + 1}</span>
                      <span>{step}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {slide.type === 'routine' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-routine">
                  <div className="lecture-routine-items">
                    {slide.content.items.map((item, idx) => (
                      <div key={idx} className="lecture-routine-item">{item}</div>
                    ))}
                  </div>
                  <div className="lecture-integration">
                    <strong>Интеграция:</strong> {slide.content.integration}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'learning' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-learning">
                  <div className="lecture-learning-features">
                    {slide.content.features.map((feature, idx) => (
                      <div key={idx} className="lecture-learning-item">{feature}</div>
                    ))}
                  </div>
                  <div className="lecture-learning-example">
                    <strong>Пример:</strong> {slide.content.example}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'wellness' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-wellness">
                  <div className="lecture-wellness-features">
                    {slide.content.features.map((feature, idx) => (
                      <div key={idx} className="lecture-wellness-item">{feature}</div>
                    ))}
                  </div>
                  <div className="lecture-wellness-connection">
                    {slide.content.connection}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'creative' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-creative">
                  {Array.isArray(slide.content) && slide.content.map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-creative-item"
                      initial={{ rotate: -5, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
                {slide.note && <p className="lecture-note">💡 {slide.note}</p>}
              </>
            )}

            {slide.type === 'communication' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-communication">
                  <div className="lecture-communication-features">
                    {slide.content.features.map((feature, idx) => (
                      <div key={idx} className="lecture-comm-item">{feature}</div>
                    ))}
                  </div>
                  <div className="lecture-comm-example">
                    <strong>Пример:</strong> {slide.content.example}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'finance' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-finance">
                  <div className="lecture-finance-features">
                    {slide.content.features.map((feature, idx) => (
                      <div key={idx} className="lecture-finance-item">{feature}</div>
                    ))}
                  </div>
                  {slide.content.warning && (
                    <div className="lecture-finance-warning">
                      ⚠️ {slide.content.warning}
                    </div>
                  )}
                </div>
              </>
            )}

            {slide.type === 'automation-examples' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-auto-examples">
                  {Array.isArray(slide.content) && slide.content.map((example, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-auto-item"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <span className="lecture-auto-number">{idx + 1}</span>
                      {example}
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'system' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-system">
                  <div className="lecture-para-method">
                    <h3>PARA Метод</h3>
                    {Object.entries(slide.content.para).map(([key, value]) => (
                      <div key={key} className="lecture-para-item">
                        <strong>{key}:</strong> {value}
                      </div>
                    ))}
                  </div>
                  <div className="lecture-system-ai">
                    {slide.content.ai}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'knowledge' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-knowledge">
                  <div className="lecture-knowledge-tools">
                    <h3>Инструменты</h3>
                    {slide.content.tools.map((tool, idx) => (
                      <div key={idx} className="lecture-knowledge-tool">{tool}</div>
                    ))}
                  </div>
                  <div className="lecture-knowledge-ai">
                    {slide.content.ai}
                  </div>
                </div>
              </>
            )}

            {slide.type === 'trends' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-trends">
                  {Array.isArray(slide.content) && slide.content.map((trend, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-trend-item"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {trend}
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'skills' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-skills">
                  {Array.isArray(slide.content) && slide.content.map((skill, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-skill-item"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <span className="lecture-skill-number">{idx + 1}</span>
                      {skill}
                    </motion.div>
                  ))}
                </div>
                {slide.advice && <p className="lecture-advice">💡 {slide.advice}</p>}
              </>
            )}

            {slide.type === 'ethics' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-ethics">
                  {Array.isArray(slide.content) && slide.content.map((item, idx) => (
                    <div key={idx} className="lecture-ethics-item">{item}</div>
                  ))}
                </div>
                {slide.principle && <p className="lecture-principle">{slide.principle}</p>}
              </>
            )}

            {slide.type === 'plan' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-plan">
                  {Object.entries(slide.content).map(([week, action], idx) => (
                    <motion.div
                      key={week}
                      className="lecture-plan-week"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="lecture-week-label">Неделя {week.replace('week', '')}</div>
                      <div className="lecture-week-action">{action}</div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {slide.type === 'resources' && (
              <>
                <h2 className="lecture-slide-title">{slide.title}</h2>
                <div className="lecture-resources">
                  <div className="lecture-resource-books">
                    <h3>📚 Книги</h3>
                    {slide.content.books.map((book, idx) => (
                      <div key={idx} className="lecture-book-item">{book}</div>
                    ))}
                  </div>
                  <div className="lecture-resource-links">
                    <div className="lecture-resource-item">📢 {slide.content.channels}</div>
                    <div className="lecture-resource-item">🎥 {slide.content.youtube}</div>
                    <div className="lecture-resource-item">👥 {slide.content.community}</div>
                  </div>
                </div>
              </>
            )}

            {slide.type === 'final' && (
              <div className="lecture-final">
                <motion.div
                  className="lecture-final-quote"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  "{slide.content.quote}"
                </motion.div>
                <div className="lecture-final-actions">
                  {slide.content.actions.map((action, idx) => (
                    <motion.div
                      key={idx}
                      className="lecture-final-action"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                    >
                      {action}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timing */}
          {slide.timing && (
            <div className="lecture-timing">⏱ {slide.timing}</div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className={`lecture-nav ${showNav ? 'visible' : 'hidden'}`}>
        <button
          className="lecture-nav-btn lecture-prev-btn"
          onClick={goPrev}
          disabled={currentSlide === 0}
          aria-label="Previous slide"
        >
          <ChevronLeft size={32} />
        </button>

        <button
          className="lecture-nav-btn lecture-next-btn"
          onClick={goNext}
          disabled={currentSlide === lectureSlides.length - 1}
          aria-label="Next slide"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Slide indicators (thumbnails) */}
      <div className="lecture-indicators">
        {lectureSlides.map((_, idx) => (
          <button
            key={idx}
            className={`lecture-indicator ${idx === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default LecturePage;
