import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  LockKeyhole,
  LogOut,
  Sparkles,
} from "lucide-react";
import "./MeditationProjectPage.css";

const phases = [
  {
    id: "01",
    title: "Исследование и архитектура",
    subtitle: "Фундамент продукта",
    hours: 40,
    status: "active",
    deadline: "16 июля",
    tasks: [
      ["Анализ рынка, ЦА и сценариев использования", 8],
      ["Продуктовые требования и user flow", 8],
      ["Политики безопасного контента", 6],
      ["Выбор AI, TTS, storage и платежных сервисов", 8],
      ["Архитектура, схема данных и расчет себестоимости", 10],
    ],
  },
  {
    id: "02",
    title: "YouTube-конвейер",
    subtitle: "Органический канал привлечения",
    hours: 128,
    status: "planned",
    deadline: "28 июля",
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
    deadline: "19 августа",
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
    deadline: "26 августа",
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
    deadline: "6 сентября",
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
    deadline: "15 сентября",
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
    deadline: "6 октября",
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
    deadline: "3 ноября",
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
  const logout = async () => {
    await fetch("/api/projects/meditation/auth", { method: "DELETE" });
    window.location.reload();
  };
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
            <strong>2%</strong>
          </div>
          <div className="med-bar">
            <i style={{ width: "2%" }} />
          </div>
          <p>
            <b>Сейчас:</b> исследование и проектирование
          </p>
          <small>Обновлено 12 июля 2026</small>
        </div>
      </header>
      <section className="med-stats">
        <article>
          <span>Полный проект</span>
          <strong>{totalHours.toLocaleString("ru-RU")} ч</strong>
          <small>
            ${(totalHours * HOURLY_RATE).toLocaleString("en-US")} · до 3 ноября
          </small>
        </article>
        <article>
          <span>Web MVP</span>
          <strong>{mvpHours} ч</strong>
          <small>
            ${(mvpHours * HOURLY_RATE).toLocaleString("en-US")} · до 6 сентября
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
        {phases.map((phase) => (
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
                {(estimate(phase.hours) * HOURLY_RATE).toLocaleString("en-US")}{" "}
                · до {phase.deadline}
              </span>
              <ChevronDown
                className={open === phase.id ? "rotated" : ""}
                size={20}
              />
            </button>
            {open === phase.id && (
              <div className="med-tasks">
                {phase.tasks.map(([task, hours]) => (
                  <div key={task}>
                    <span>{task}</span>
                    <strong>
                      {estimate(hours).toLocaleString("ru-RU")} ч · $
                      {(estimate(hours) * HOURLY_RATE).toLocaleString("en-US")}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>
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
