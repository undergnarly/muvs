import React, { useEffect } from 'react';
import { Download, ExternalLink, Mail, ArrowRight, Brain, Code as CodeIcon, Layers } from 'lucide-react';
import { useData } from '../../context/DataContext';

const CVPage = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const skills = [
        {
            category: "AI Development",
            icon: <Brain className="w-6 h-6 text-purple-400" />,
            items: ["Google Antigravity", "Claude Code", "Lovable", "Langchain", "RAG Systems"]
        },
        {
            category: "Platforms",
            icon: <Layers className="w-6 h-6 text-blue-400" />,
            items: ["Squarespace", "Tilda", "Webflow"]
        },
        {
            category: "Custom Development",
            icon: <CodeIcon className="w-6 h-6 text-emerald-400" />,
            items: ["React", "Django", "Full-stack Solutions"]
        }
    ];

    const works = [
        { name: "bimxdv.com", url: "https://bimxdv.com" },
        { name: "pacha-alpaca.com", url: "https://pacha-alpaca.com" },
        { name: "caffitaly.ru", url: "https://caffitaly.ru" },
        { name: "balibolthouses.id", url: "https://balibolthouses.id" },
        { name: "muvs.dev", url: "https://muvs.dev" }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pt-24 pb-20 px-4 md:px-8 lg:px-16 overflow-x-hidden">
            <div className="max-w-4xl mx-auto space-y-24">

                {/* Header Section */}
                <header className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Full-stack Developer <br />
                                & Creative Technologist
                            </h1>
                            <p className="mt-4 text-xl text-muted-foreground font-light max-w-2xl">
                                10 years of experience building everything from startup MVPs to enterprise-scale systems.
                                Now focused on creating innovative, visually striking digital experiences.
                            </p>
                        </div>

                        <a
                            href="/resume/resume.pdf"
                            download
                            className="group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 backdrop-blur-sm"
                        >
                            <span className="text-sm font-medium tracking-wide">Download CV</span>
                            <Download className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                        </a>
                    </div>
                </header>

                {/* AI Systems Highlight */}
                <section className="p-8 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <h2 className="text-sm font-mono text-green-400 tracking-wider uppercase">Current Focus</h2>
                    </div>

                    <h3 className="text-3xl font-bold mb-6">AI Systems & Automation</h3>
                    <div className="grid md:grid-cols-2 gap-8 text-lg text-muted-foreground font-light">
                        <p>
                            Since early 2025, I've been developing AI solutions for businesses - from chatbots to comprehensive automation systems.
                            Currently building AI integrations for travel industry automation (Langchain, RAG, Gemini, OpenAI).
                        </p>
                        <p>
                            I leverage cutting-edge tools like Claude Code and Google Antigravity to rapidly build and test MVP prototypes.
                            Experienced in AI-generated imagery, video content, and automated content pipelines.
                        </p>
                    </div>
                </section>

                {/* Approach */}
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <h2 className="text-2xl font-semibold mb-8 border-l-2 border-white/20 pl-4">My Approach</h2>
                    <p className="text-xl leading-relaxed text-muted-foreground font-light">
                        In the age of AI and rapidly evolving tools, I believe <span className="text-white font-normal">architecture trumps technology</span>.
                        I work with React, Django, and modern stacks, but I'm framework-agnostic — the right solution depends on your project's unique needs.
                    </p>
                </section>

                {/* Toolkit Grid */}
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <h2 className="text-2xl font-semibold mb-10 border-l-2 border-white/20 pl-4">Toolkit</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {skills.map((skill, idx) => (
                            <div key={idx} className="p-6 rounded-xl bg-card/30 border border-border/50 hover:bg-card/50 transition-colors">
                                <div className="mb-4">{skill.icon}</div>
                                <h3 className="text-lg font-medium mb-4 text-white">{skill.category}</h3>
                                <ul className="space-y-2">
                                    {skill.items.map((item, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-white/30" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Selected Work */}
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                    <h2 className="text-2xl font-semibold mb-10 border-l-2 border-white/20 pl-4">Selected Work</h2>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {works.map((work, idx) => (
                            <a
                                key={idx}
                                href={work.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <span className="text-muted-foreground group-hover:text-white transition-colors">{work.name}</span>
                                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                            </a>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16 mt-16 border-t border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                    <div className="text-center space-y-8">
                        <h2 className="text-4xl md:text-5xl font-bold">Let's Create Something</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            I work with existing designs or collaborate from concept to launch. Open to creative projects, experimental web experiences, and innovative applications.
                        </p>
                        <a
                            href="mailto:contact@muvs.dev" // Assuming email needs to be filled or provided, using placeholder generic based on domain
                            className="inline-flex items-center gap-3 text-lg font-medium text-white hover:text-purple-400 transition-colors"
                        >
                            <span>Ready to start? Get in touch</span>
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default CVPage;
