import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  LockKeyhole,
  LogOut,
  Sparkles,
  X,
} from "lucide-react";
import "./MeditationProjectPage.css";

const phases = [
  {
    id: "01",
    title: "Исследование и архитектура",
    subtitle: "Фундамент продукта",
    hours: 56,
    status: "active",
    deadline: "18 июля",
    tasks: [
      ["Анализ рынка, ЦА и сценариев использования", 8],
      ["Продуктовые требования и user flow", 8],
      ["Политики безопасного контента", 6],
      ["Выбор AI, TTS, storage и платежных сервисов", 8],
      ["Архитектура, схема данных и расчет себестоимости", 10],
      ["Аудит существующей кодовой базы Zhanym Soul", 16],
    ],
  },
  {
    id: "02",
    title: "YouTube-конвейер",
    subtitle: "Органический канал привлечения",
    hours: 128,
    status: "planned",
    deadline: "30 июля",
    tasks: [
      ["Генератор тем, сценариев и SEO-метаданных", 24],
      ["TTS и подготовка фонового аудио", 24],
      ["Автоматическое сведение и нормализация", 20],
      ["Сборка длинных видео, Shorts и обложек", 32],
      ["Контент-календарь и очередь публикаций", 16],
      ["Контроль качества и тестирование", 12],
    ],
  },
  {
    id: "03",
    title: "Персональный генератор",
    subtitle: "Основной MVP",
    hours: 232,
    status: "planned",
    deadline: "21 августа",
    tasks: [
      ["UX/UI лендинга и пошаговой формы", 32],
      ["Аккаунты и профиль пользователя", 24],
      ["Генерация и проверка персонального сценария", 36],
      ["TTS, имя, темп и выбор голоса", 28],
      ["Музыка, микширование и экспорт MP3", 36],
      ["Фоновая очередь и статусы генерации", 28],
      ["Хранилище, доставка и удаление файлов", 16],
      ["Админ-панель, мониторинг и QA", 32],
    ],
  },
  {
    id: "04",
    title: "Монетизация",
    subtitle: "Платные пакеты и аналитика",
    hours: 72,
    status: "planned",
    deadline: "28 августа",
    tasks: [
      ["Разовые платежи и тарифы", 20],
      ["Бесплатный лимит и система кредитов", 12],
      ["Подписка и рекуррентные платежи", 20],
      ["Промокоды и партнерские ссылки", 8],
      ["Воронка, события и продуктовая аналитика", 12],
    ],
  },
  {
    id: "05",
    title: "Удержание и библиотека",
    subtitle: "Повторное использование",
    hours: 120,
    status: "planned",
    deadline: "8 сентября",
    tasks: [
      ["Личная библиотека и аудиоплеер", 28],
      ["Избранное и история прослушивания", 16],
      ["Meditation of the Month", 16],
      ["Email и push-напоминания", 20],
      ["Программы на 7, 21 и 30 дней", 24],
      ["Рекомендации на основе правил", 16],
    ],
  },
  {
    id: "06",
    title: "Локализация",
    subtitle: "Выход на новые рынки",
    hours: 96,
    status: "planned",
    deadline: "17 сентября",
    tasks: [
      ["i18n интерфейса и контентных шаблонов", 24],
      ["Локализация первых трех языков", 30],
      ["Проверка голосов, имен и произношения", 18],
      ["Мультиязычный SEO и YouTube-процесс", 16],
      ["Языковые safety-фильтры", 8],
    ],
  },
  {
    id: "07",
    title: "Мобильное приложение",
    subtitle: "iOS и Android",
    hours: 224,
    status: "planned",
    deadline: "8 октября",
    tasks: [
      ["Мобильный UX/UI и дизайн-система", 32],
      ["Приложение и интеграция с API", 64],
      ["Плеер, background audio и offline", 40],
      ["Push, календарь и ежедневная практика", 32],
      ["Мобильные покупки и подписки", 28],
      ["QA, публикация App Store и Google Play", 28],
    ],
  },
  {
    id: "08",
    title: "B2B и AI 2.0",
    subtitle: "Масштабирование платформы",
    hours: 304,
    status: "planned",
    deadline: "5 ноября",
    tasks: [
      ["Корпоративные аккаунты и роли", 44],
      ["HR-панель и обезличенная аналитика", 36],
      ["Брендированные библиотеки и лицензии", 40],
      ["Партнерский кабинет и API", 32],
      ["Адаптация по настроению и времени суток", 40],
      ["Персональные программы и вариативность", 48],
      ["Рекомендательная система", 40],
      ["Безопасность, нагрузочное тестирование и QA", 24],
    ],
  },
];

const AGENT_SPEED_FACTOR = 0.375;
const HOURLY_RATE = 30;
const estimate = (hours) => hours * AGENT_SPEED_FACTOR;
const totalHours = estimate(
  phases.reduce((sum, phase) => sum + phase.hours, 0),
);
const mvpHours = estimate(
  phases.slice(0, 5).reduce((sum, phase) => sum + phase.hours, 0),
);

const phaseGuides = {
  "01": {
    approach:
      "Интервью, анализ пользовательских сценариев, расчет unit-экономики и фиксация технических ограничений до начала реализации.",
    deliverables: [
      "Product requirements document",
      "Карта пользовательских сценариев",
      "Архитектурная схема и risk register",
      "Аудит переиспользования генератора Zhanym Soul",
    ],
  },
  "02": {
    approach:
      "Модульный pipeline: сценарий → речь → фон → мастеринг → видео → метаданные. Каждый шаг повторяем и контролируется отдельно.",
    deliverables: [
      "Шаблоны контента и промптов",
      "Рабочий media pipeline",
      "Регламент контроля качества",
    ],
  },
  "03": {
    approach:
      "Асинхронная генерация через очередь задач с сохранением статуса, безопасной обработкой персональных параметров и повторным запуском ошибок.",
    deliverables: [
      "Web-приложение MVP",
      "API генерации",
      "Audio pipeline и административный мониторинг",
    ],
  },
  "04": {
    approach:
      "Единая кредитная модель для разовых пакетов и подписок с серверной проверкой лимитов и событиями продуктовой аналитики.",
    deliverables: [
      "Платежный flow",
      "Матрица тарифов и лимитов",
      "Dashboard конверсий",
    ],
  },
  "05": {
    approach:
      "Личная библиотека становится центром удержания: история, избранное, программы и триггерные коммуникации объединяются одним профилем.",
    deliverables: [
      "Библиотека и плеер",
      "Lifecycle-коммуникации",
      "Программы повторного использования",
    ],
  },
  "06": {
    approach:
      "Локализуются не только строки интерфейса, но и промпты, safety-правила, произношение имен и поисковые паттерны каждого рынка.",
    deliverables: [
      "Локализованный интерфейс",
      "Языковые контентные шаблоны",
      "Мультиязычный QA checklist",
    ],
  },
  "07": {
    approach:
      "Приложение использует существующий backend, добавляя нативное воспроизведение, offline-режим, push и store-платежи.",
    deliverables: [
      "iOS и Android builds",
      "Offline/background audio",
      "Материалы и релизы в stores",
    ],
  },
  "08": {
    approach:
      "Корпоративный слой строится с изоляцией данных и ролями, AI-функции подключаются после накопления достаточной истории использования.",
    deliverables: [
      "B2B-кабинет и лицензирование",
      "Партнерский API",
      "Персонализация и рекомендательная система",
    ],
  },
};

function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/projects/meditation/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (response.ok) onSuccess();
    else setError(data.error || "Не удалось войти");
  };
  return (
    <main className="med-login">
      <div className="med-orb med-orb-one" />
      <div className="med-orb med-orb-two" />
      <form className="med-login-card" onSubmit={submit}>
        <div className="med-lock">
          <LockKeyhole size={20} />
        </div>
        <p className="med-kicker">PRIVATE PROJECT SPACE</p>
        <h1>
          AI Meditation
          <br />
          Studio
        </h1>
        <p className="med-muted">
          Roadmap, трудозатраты и текущий прогресс разработки.
        </p>
        <label>Пароль клиента</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          required
          placeholder="Введите пароль"
        />
        {error && <p className="med-error">{error}</p>}
        <button disabled={loading}>
          {loading ? "Проверяем..." : "Открыть проект"} <ArrowRight size={17} />
        </button>
      </form>
    </main>
  );
}

function Roadmap() {
  const [open, setOpen] = useState("01");
  const [selectedTask, setSelectedTask] = useState(null);
  const [progress, setProgress] = useState({
    tasks: {},
    activity: [],
    updatedAt: null,
  });
  useEffect(() => {
    fetch("/api/projects/meditation/progress")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setProgress)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!selectedTask) return undefined;
    const close = (event) => event.key === "Escape" && setSelectedTask(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [selectedTask]);
  const logout = async () => {
    await fetch("/api/projects/meditation/auth", { method: "DELETE" });
    window.location.reload();
  };
  const actualHours = Object.values(progress.tasks).reduce(
    (sum, task) => sum + (Number(task.actualHours) || 0),
    0,
  );
  const progressPercent = Math.min(
    100,
    Math.round((actualHours / totalHours) * 100),
  );
  return (
    <main className="med-project">
      <nav className="med-nav">
        <div className="med-brand">
          <span>muvs</span>
          <i /> client space
        </div>
        <button onClick={logout} aria-label="Выйти">
          <LogOut size={18} />
        </button>
      </nav>
      <header className="med-hero">
        <div className="med-hero-copy">
          <p className="med-kicker">
            <Sparkles size={14} /> DEVELOPMENT ROADMAP
          </p>
          <h1>
            AI Meditation
            <br />
            <em>Studio</em>
          </h1>
          <p>
            Персональные медитации, автоматизированный контент и подписочная
            wellness-платформа.
          </p>
        </div>
        <div className="med-progress-card">
          <div className="med-progress-top">
            <span>Текущий прогресс</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="med-bar">
            <i style={{ width: `${progressPercent}%` }} />
          </div>
          <p>
            <b>Сейчас:</b> исследование и проектирование
          </p>
          <small>
            {progress.updatedAt
              ? `Обновлено ${new Date(progress.updatedAt).toLocaleString("ru-RU")}`
              : "Учет времени еще не начат"}
          </small>
        </div>
      </header>
      <section className="med-stats">
        <article>
          <span>Полный проект</span>
          <strong>{totalHours.toLocaleString("ru-RU")} ч</strong>
          <small>
            ${(totalHours * HOURLY_RATE).toLocaleString("en-US")} · до 5 ноября
          </small>
        </article>
        <article>
          <span>Web MVP</span>
          <strong>{mvpHours} ч</strong>
          <small>
            ${(mvpHours * HOURLY_RATE).toLocaleString("en-US")} · до 8 сентября
          </small>
        </article>
        <article>
          <span>Ставка</span>
          <strong>$30/ч</strong>
          <small>4 часа в день · старт 13 июля</small>
        </article>
      </section>
      <section className="med-intro">
        <div>
          <p className="med-kicker">ПЛАН РАБОТ</p>
          <h2>От идеи до платформы</h2>
        </div>
        <p>
          Оценка рассчитана для одного разработчика с AI-агентами при загрузке 4
          часа каждый календарный день. Старт — 13 июля 2026. Включает
          разработку, интеграции, тестирование и исправления.
        </p>
      </section>
      <section className="med-phases">
        {phases.map((phase) => {
          const phaseActual = phase.tasks.reduce((sum, _task, taskIndex) => {
            const taskId = `${phase.id}-${String(taskIndex + 1).padStart(2, "0")}`;
            return sum + (Number(progress.tasks[taskId]?.actualHours) || 0);
          }, 0);
          const phasePlanned = estimate(phase.hours);
          const phasePercent = Math.min(
            100,
            Math.round((phaseActual / phasePlanned) * 100),
          );
          return (
            <article className={`med-phase ${phase.status}`} key={phase.id}>
              <button
                className="med-phase-head"
                onClick={() => setOpen(open === phase.id ? "" : phase.id)}
              >
                <span className="med-phase-number">
                  {phase.status === "active" ? <Check size={16} /> : phase.id}
                </span>
                <span className="med-phase-title">
                  <small>Фаза {phase.id}</small>
                  <strong>{phase.title}</strong>
                  <em>{phase.subtitle}</em>
                </span>
                <span className="med-hours">
                  <Clock3 size={15} /> {estimate(phase.hours)} ч · $
                  {(estimate(phase.hours) * HOURLY_RATE).toLocaleString(
                    "en-US",
                  )}{" "}
                  · до {phase.deadline}
                </span>
                <ChevronDown
                  className={open === phase.id ? "rotated" : ""}
                  size={20}
                />
              </button>
              <div className="med-phase-progress">
                <div>
                  <i style={{ width: `${phasePercent}%` }} />
                </div>
                <span>
                  {phasePercent}% · {phaseActual.toLocaleString("ru-RU")} из{" "}
                  {phasePlanned} ч
                </span>
              </div>
              {open === phase.id && (
                <div className="med-tasks">
                  <div className="med-tasks-header" aria-hidden="true">
                    <span>Задача</span>
                    <span>План и бюджет</span>
                    <span>Факт</span>
                    <span>Материалы</span>
                  </div>
                  {phase.tasks.map(([task, hours], taskIndex) => {
                    const taskId = `${phase.id}-${String(taskIndex + 1).padStart(2, "0")}`;
                    const actual =
                      Number(progress.tasks[taskId]?.actualHours) || 0;
                    return (
                      <button
                        type="button"
                        key={task}
                        onClick={() =>
                          setSelectedTask({ phase, task, hours, taskId })
                        }
                      >
                        <span>{task}</span>
                        <strong>
                          План {estimate(hours).toLocaleString("ru-RU")} ч · $
                          {(estimate(hours) * HOURLY_RATE).toLocaleString(
                            "en-US",
                          )}
                        </strong>
                        <span className="med-actual">
                          Факт {actual.toLocaleString("ru-RU")} ч
                        </span>
                        <span className="med-task-open">
                          Подробнее <ArrowRight size={13} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>
      <section className="med-report">
        <div className="med-report-head">
          <div>
            <p className="med-kicker">ОТЧЕТНОСТЬ</p>
            <h2>Фактическая работа</h2>
          </div>
          <div>
            <strong>{actualHours.toLocaleString("ru-RU")} ч</strong>
            <span>
              из {totalHours} ч · $
              {(actualHours * HOURLY_RATE).toLocaleString("en-US")}
            </span>
          </div>
        </div>
        <div className="med-activity">
          {progress.activity.length ? (
            progress.activity.slice(0, 8).map((item, index) => (
              <article key={`${item.endedAt}-${index}`}>
                <time>
                  {new Date(item.endedAt).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                  })}
                </time>
                <div>
                  <strong>{item.taskTitle || item.taskId}</strong>
                  <p>{item.note || "Рабочая сессия"}</p>
                </div>
                <span>{Number(item.hours).toLocaleString("ru-RU")} ч</span>
              </article>
            ))
          ) : (
            <div className="med-empty-report">
              Сессий пока нет. Они появятся автоматически после запуска трекера
              в папке проекта.
            </div>
          )}
        </div>
      </section>
      {selectedTask && (
        <div
          className="med-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedTask(null)
          }
        >
          <section
            className="med-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="med-modal-title"
          >
            <button
              className="med-modal-close"
              onClick={() => setSelectedTask(null)}
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
            <p className="med-kicker">
              ФАЗА {selectedTask.phase.id} · ДО{" "}
              {selectedTask.phase.deadline.toUpperCase()}
            </p>
            <h2 id="med-modal-title">{selectedTask.task}</h2>
            <div className="med-modal-metrics">
              <span>
                План {estimate(selectedTask.hours).toLocaleString("ru-RU")} ч
              </span>
              <span>
                Факт{" "}
                {(
                  Number(progress.tasks[selectedTask.taskId]?.actualHours) || 0
                ).toLocaleString("ru-RU")}{" "}
                ч
              </span>
              <span>
                $
                {(estimate(selectedTask.hours) * HOURLY_RATE).toLocaleString(
                  "en-US",
                )}
              </span>
              <span>
                {selectedTask.phase.status === "active"
                  ? "В работе"
                  : "Запланировано"}
              </span>
            </div>
            <div className="med-modal-block">
              <small>РЕШЕНИЕ</small>
              <p>{phaseGuides[selectedTask.phase.id].approach}</p>
            </div>
            <div className="med-modal-block">
              <small>РЕЗУЛЬТАТЫ ФАЗЫ</small>
              <ul>
                {phaseGuides[selectedTask.phase.id].deliverables.map((item) => (
                  <li key={item}>
                    <Check size={14} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="med-modal-docs">
              <div>
                <FileText size={18} />
                <span>
                  <strong>Документы задачи</strong>
                  <small>
                    {(progress.tasks[selectedTask.taskId]?.documents || [])
                      .length
                      ? "Готовые материалы и решения"
                      : selectedTask.phase.status === "active"
                        ? "Материалы добавляются по мере готовности"
                        : "Появятся после начала задачи"}
                  </small>
                </span>
              </div>
              <span className="med-doc-status">
                {(progress.tasks[selectedTask.taskId]?.documents || []).length
                  ? `${progress.tasks[selectedTask.taskId].documents.length} файлов`
                  : selectedTask.phase.status === "active"
                    ? "В подготовке"
                    : "Запланировано"}
              </span>
            </div>
            {(progress.tasks[selectedTask.taskId]?.documents || []).map(
              (document) => (
                <a
                  className="med-document-link"
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  key={`${document.url}-${document.title}`}
                >
                  <FileText size={16} />
                  <span>{document.title}</span>
                  <ExternalLink size={14} />
                </a>
              ),
            )}
            {(progress.tasks[selectedTask.taskId]?.sessions || []).length >
              0 && (
              <div className="med-modal-block">
                <small>ИСТОРИЯ РАБОТ</small>
                <ul>
                  {progress.tasks[selectedTask.taskId].sessions
                    .slice()
                    .reverse()
                    .map((session, index) => (
                      <li key={`${session.endedAt}-${index}`}>
                        <Clock3 size={14} />{" "}
                        {new Date(session.endedAt).toLocaleDateString("ru-RU")}{" "}
                        · {Number(session.hours).toLocaleString("ru-RU")} ч ·{" "}
                        {session.note || "Рабочая сессия"}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
      <footer>
        <span>
          Оценка предварительная и уточняется после завершения фазы 01.
        </span>
        <b>muvs.dev · 2026</b>
      </footer>
    </main>
  );
}

export default function MeditationProjectPage() {
  const [state, setState] = useState("loading");
  useEffect(() => {
    fetch("/api/projects/meditation/auth")
      .then((res) => res.json())
      .then((data) => setState(data.authenticated ? "ready" : "login"))
      .catch(() => setState("login"));
  }, []);
  if (state === "loading")
    return (
      <main className="med-loading">
        <span />
      </main>
    );
  return state === "ready" ? (
    <Roadmap />
  ) : (
    <Login onSuccess={() => setState("ready")} />
  );
}
