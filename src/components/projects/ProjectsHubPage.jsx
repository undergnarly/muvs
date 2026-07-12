import { ArrowUpRight, Clock3, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import "./ProjectsHubPage.css";

const projects = [
  {
    number: "01",
    title: "AI Meditation Studio",
    description:
      "Персональные медитации, YouTube-конвейер и подписочная wellness-платформа.",
    status: "В работе",
    progress: 2,
    hours: 456,
    href: "/projects/meditation",
    tone: "sage",
    private: true,
  },
];

export default function ProjectsHubPage() {
  return (
    <main className="projects-hub">
      <nav className="projects-nav">
        <Link to="/">muvs</Link>
        <span>PROJECT INDEX / 2026</span>
      </nav>
      <header className="projects-header">
        <p>CLIENT WORKSPACE</p>
        <h1>
          Projects in
          <br />
          <em>motion.</em>
        </h1>
        <div>
          <span>{String(projects.length).padStart(2, "0")}</span>
          <p>
            Активные проекты, этапы разработки и прозрачный прогресс в одном
            месте.
          </p>
        </div>
      </header>
      <section className="projects-grid">
        {projects.map((project) => (
          <Link
            className={`project-tile ${project.tone}`}
            to={project.href}
            key={project.href}
          >
            <div className="project-tile-top">
              <span>{project.number}</span>
              <span className="project-status">
                <i /> {project.status}
              </span>
              <ArrowUpRight />
            </div>
            <div className="project-shape">
              <i />
              <i />
              <i />
            </div>
            <div className="project-tile-copy">
              <div className="project-meta">
                {project.private && (
                  <span>
                    <LockKeyhole size={12} /> PRIVATE
                  </span>
                )}
                <span>
                  <Clock3 size={12} /> {project.hours} H
                </span>
              </div>
              <h2>{project.title}</h2>
              <p>{project.description}</p>
              <div className="project-progress">
                <div>
                  <i style={{ width: `${project.progress}%` }} />
                </div>
                <strong>{project.progress}%</strong>
              </div>
            </div>
          </Link>
        ))}
        <article className="project-placeholder">
          <span>NEXT</span>
          <p>Новый проект появится здесь</p>
        </article>
      </section>
      <footer>
        <span>Selected development projects</span>
        <b>muvs.dev</b>
      </footer>
    </main>
  );
}
