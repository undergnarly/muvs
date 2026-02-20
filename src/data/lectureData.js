export const lectureSlides = [
    // BLOCK 1: INTRODUCTION
    {
        block: 'intro',
        id: 1,
        title: 'OpenClaw Workshop',
        subtitle: 'The Shift Is Happening Right Now — And You\'re Not Too Late',
        type: 'title'
    },
    {
        block: "intro",
        id: 2,
        title: "We\'re at a Turning Point",
        content: {
            phases: [
                {
                    period: "2010-2019",
                    icon: "Globe",
                    title: "Mobile & Cloud Era",
                    expanded: "iPhone, Airbnb, Uber, Instagram. Platforms changed consumption. Cloud and pre-AI phase."
                },
                {
                    period: "2020-2024",
                    icon: "Bot",
                    title: "AI Breakthrough (Generative)",
                    expanded: "GPT-3, ChatGPT, Copilot. AI hit the mainstream. Code, text, video — everything generated. The pandemic accelerated digital."
                },
                {
                    period: "2025-2026",
                    icon: "Zap",
                    title: "The Age of AI Agents",
                    expanded: "AI doesn't just answer — it acts. Autonomous agents, routine automation, and creative amplification. A brain that finally got hands."
                },
                {
                    period: "2027-2035",
                    icon: "Rocket",
                    title: "Post-AGI Transformation",
                    expanded: "Robotics + AI = physical automation. Biotech, quantum computing, and the new meaning of work."
                }
            ],
            current_moment: "2024 was the year of chatbots. 2025 was the year of copilots. 2026 is the year of agents.",
            implication: "Those who master AI now are the architects of the future. Those who wait become mere users."
        },
        type: "timeline",
        timing: "5 min"
    },
    {
        block: 'intro',
        id: 3,
        title: 'The Speed Is Insane',
        content: [
            { text: 'AI agent market: $7.8B now → $52B by 2030 (7x growth in 4 years)' },
            { text: 'Gartner: 40% of business apps will have AI agents by end of 2026 (was under 5% last year)' },
            { text: 'OpenClaw: 9K → 150K+ GitHub stars in weeks. 3,000+ community-built skills.' },
            { text: 'This isn\'t hype. This is real infrastructure being built right in front of us.' },
            { text: 'By the end of this session, you\'ll have your own AI agent working for you 24/7.' }
        ],
        type: 'checklist',
        timing: '3 min'
    },
    {
        block: 'intro',
        id: 4,
        title: 'My Story',
        content: {
            phases: [
                { period: "2016", icon: "Code", title: "Beginning", expanded: "Started programming in Python, first steps into the world of code." },
                { period: "2018", icon: "Briefcase", title: "Startups", expanded: "Working in fast-paced teams, building real products." },
                { period: "2023", icon: "Flame", title: "Burnout", expanded: "Burned out from traditional IT, left for my own business." },
                { period: "2024", icon: "Zap", title: "Comeback", expanded: "Returned to IT through the lens of AI, started using it as a partner." },
                { period: "2025", icon: "Rocket", title: "Acceleration", expanded: "Full AI integration, development speed multiplied several times." }
            ]
        },
        type: 'timeline',
        timing: '3 min'
    },

    // BLOCK 2: AI FUNDAMENTALS
    {
        block: 'fundamentals',
        id: 5,
        title: 'Three Waves of AI',
        content: {
            definition: 'We went from "write me an email" to "send that email, check if they replied, and follow up if they didn\'t" — in two years.',
            types: [
                {
                    title: 'Wave 1: Chatbots',
                    icon: 'MessageSquare',
                    expanded: 'ChatGPT, Claude, Gemini. You type, it answers. Great for questions, writing, brainstorming. But no memory between sessions. Close the tab — it forgets you exist.'
                },
                {
                    title: 'Wave 2: Copilots',
                    icon: 'Wrench',
                    expanded: 'GitHub Copilot, Microsoft Copilot, Cursor. They live inside your tools and help you work faster. Suggest code, summarize docs, draft emails. But you\'re still driving. Without you — nothing happens.'
                },
                {
                    title: 'Wave 3: Agents',
                    icon: 'Workflow',
                    expanded: 'The big shift. An agent doesn\'t just help — it acts for you. "Move my meeting with Alex to Thursday." It checks calendars, finds a slot, sends the invite, confirms. No copy-paste. It just does it.'
                },
                {
                    title: 'AGI (General AI)',
                    icon: 'Brain',
                    expanded: '2027–2028 — the expected threshold. Systems capable of solving any intellectual task at or above human level.'
                }
            ]
        },
        type: 'concept',
        timing: '8 min'
    },
    {
        block: 'fundamentals',
        id: 6,
        title: 'How AI Works',
        subtitle: 'Why this became possible now',
        content: {
            what_is_nn: 'A neural network is an algorithm that "learns" from examples, mimicking how the human brain works.',
            how_works: 'Input → Processing (weights) → Output.',
            timeline: [
                { year: '2012', title: 'Deep Learning', icon: 'Flame', desc: 'GPUs + massive datasets' },
                { year: '2017', title: 'Transformer', icon: 'Zap', desc: 'The architecture that changed everything' },
                { year: '2022', title: 'ChatGPT', icon: 'MessageSquare', desc: 'Mass adoption' },
                { year: '2024', title: 'Multimodality', icon: 'Eye', desc: 'AI sees, hears, and speaks' },
                { year: '2026', title: 'Agency', icon: 'Rocket', desc: 'AI acts autonomously' }
            ],
            why_now: [
                { text: 'GPUs (H100/v4) available everywhere', icon: 'Cpu' },
                { text: 'High-quality data (Synthetic Data)', icon: 'Database' },
                { text: 'New architectures (Beyond Transformers)', icon: 'Layout' },
                { text: 'Trillions in big tech investment', icon: 'DollarSign' }
            ]
        },
        type: 'neural-simple',
        timing: '7 min'
    },
    {
        block: 'fundamentals',
        id: 7,
        title: 'Who\'s In The Game Right Now',
        content: {
            'OpenClaw': {
                icon: 'Workflow',
                tools: [
                    { name: 'GitHub', url: 'https://github.com' }
                ],
                expanded: 'Open-source, free, runs on your own server. You own the data. You pick the AI model. Nobody can change the price or take away access. Works through Telegram, WhatsApp, Slack, Discord.'
            },
            'Text & Logic': {
                icon: 'FileText',
                tools: [
                    { name: 'Claude 4', url: 'https://claude.ai' },
                    { name: 'GPT-5.2', url: 'https://openai.com' },
                    { name: 'Gemini 3 Ultra', url: 'https://gemini.google.com' }
                ],
                expanded: 'Claude 4 — the gold standard for logic and code. GPT-5.2 — universal assistant with the best voice features. Gemini 3 — seamless 10M+ token context window.'
            },
            'Code & Engineering': {
                icon: 'Code',
                tools: [
                    { name: 'Claude Code', url: 'https://claude.ai/code' },
                    { name: 'Cursor', url: 'https://cursor.sh' },
                    { name: 'Devin', url: 'https://devin.ai' }
                ],
                expanded: 'Claude Code — autonomous terminal agent. Cursor — the IDE that became the standard. Devin — codes like a junior developer. Replit Agent builds apps from scratch.'
            },
            'Automation': {
                icon: 'Workflow',
                tools: [
                    { name: 'Make.com', url: 'https://make.com' },
                    { name: 'n8n', url: 'https://n8n.io' },
                    { name: 'LangChain', url: 'https://langchain.com' }
                ],
                expanded: 'Make — visual service linking. n8n — open-source workflow automation. LangChain — the standard for complex agent systems.'
            }
        },
        type: 'tools',
        timing: '10 min'
    },
    {
        block: 'fundamentals',
        id: 8,
        title: 'Prompt Engineering 2.0',
        content: {
            formula: 'Role + Context + Instructions + Constraints + Format',
            techniques: [
                {
                    title: 'Chain-of-Thought',
                    icon: 'Brain',
                    expanded: 'Ask AI to "think out loud" before answering. This reduces logic errors by 60%.'
                },
                {
                    title: 'Self-Consistency',
                    icon: 'CheckCircle2',
                    expanded: 'Make AI generate 3 variants and pick the best one. Ideal for complex tasks.'
                },
                {
                    title: 'RAG Thinking',
                    icon: 'Database',
                    expanded: 'Always give AI current files or data. Don\'t make it hallucinate facts.'
                }
            ],
            example: {
                bad: '"Write a marketing strategy"',
                good: '"You\'re a startup CMO. Analyze the attached competitor PDFs. Create a 30-day plan focused on LinkedIn. Use table format."'
            }
        },
        type: 'prompt-advanced',
        timing: '8 min'
    },

    // BLOCK 3: PRACTICAL CASES
    {
        block: 'everyday',
        id: 9,
        title: 'Case #1: Business Analytics',
        subtitle: 'How to replace an analytics department with one AI agent',
        content: {
            process: [
                {
                    title: 'Collect Raw Data',
                    icon: 'Database',
                    expanded: 'Gather everything: revenue, product descriptions, price lists, website exports, CRM and ad platform data. The more context we give the AI agent, the deeper it understands the business and the more accurate its advice.'
                },
                {
                    title: 'Organize and Name',
                    icon: 'FolderTree',
                    expanded: 'Collect all data in one folder. Properly name files (e.g., "revenue_2025_q4.csv", "product_catalog.pdf"). Clear structure helps the agent avoid context confusion and find information quickly.'
                },
                {
                    title: 'Analyze Through AI Agents',
                    icon: 'BrainCircuit',
                    expanded: 'Use Claude Code or Antigravity. Ask the agent to first analyze the files and tell you what it learned. This is "context alignment" — making sure AI understands your data correctly.'
                },
                {
                    title: 'Set the Task',
                    icon: 'Target',
                    expanded: 'Based on the analysis, set a concrete task. Tell it about your business, current pain points, and expected outcomes. Now the agent works on a solution backed by real numbers.'
                },
                {
                    title: 'Verify and Extract Insights',
                    icon: 'SearchCheck',
                    expanded: 'Review the agent\'s work. Refine prompts, look for non-obvious correlations (e.g., relationship between product type and purchase timing) that are hard to spot with regular human analysis.'
                }
            ],
            insights: [
                'AI sees the whole system, not fragments',
                'Automatic anomaly detection in data',
                'Personalized recommendations based on history'
            ],
            tools: ['Claude Code', 'Antigravity', 'Advanced Data Analysis'],
            key: 'Content + Context = Deep Insight'
        },
        type: 'case-study',
        timing: '10 min'
    },
    {
        block: 'everyday',
        id: 10,
        title: 'Case #2: Websites in an Evening',
        subtitle: 'Zero to Production with AI agents',
        content: {
            process: [
                {
                    title: 'Concept and Inspiration',
                    icon: 'Lightbulb',
                    expanded: 'Describe the idea, style, and examples. Look at other sites for inspiration and use AI to refine the concept and structure: what should be on the site and how it should look. You can brainstorm with multiple AIs simultaneously, picking the best.'
                },
                {
                    title: 'Master Prompt',
                    icon: 'FileCode',
                    expanded: 'From your chosen ideas, create one powerful master prompt. This is the foundation of your future site — every detail from section logic to visual mood is described in it.'
                },
                {
                    title: 'Build in Lovable or Bolt',
                    icon: 'Cpu',
                    expanded: 'Give the agent the task and watch the result. AI writes code, installs libraries, and fixes bugs in real time. We no longer write code — we manage the process.'
                },
                {
                    title: 'Deploy and Iterate',
                    icon: 'Rocket',
                    expanded: 'Launch the site directly in Lovable, connect a domain, and keep editing with prompts. This covers everything from simple landing pages to advanced projects including e-commerce.'
                }
            ],
            tools_comparison: [
                { name: 'Lovable', use: 'Beautiful landing pages, MVPs, and stores' },
                { name: 'Bolt.new', use: 'Quick React app assembly' },
                { name: 'Antigravity', use: 'Complex systems and custom logic' }
            ],
            mindset: 'The genius solution for instantly launching ideas without hiring entire teams.'
        },
        type: 'case-study',
        timing: '7 min'
    },
    {
        block: 'everyday',
        id: 11,
        title: 'Case #3: Digital Twin',
        subtitle: 'Automating communication and expertise',
        content: {
            process: [
                {
                    title: 'Creating a Personality',
                    icon: 'UserCheck',
                    expanded: 'Copy your chats where your unique style is visible. Ask Claude or ChatGPT to analyze them and create a "digital twin" — describing your communication style, favorite words, and tone. You set the character — the bot executes it.'
                },
                {
                    title: 'Knowledge Base (RAG)',
                    icon: 'Database',
                    expanded: 'Use Chatbase. Upload files, documents, and data. The bot doesn\'t invent answers — it uses RAG (Retrieval-Augmented Generation), knowing every detail of your product or service.'
                },
                {
                    title: 'Task Automation',
                    icon: 'Zap',
                    expanded: 'Set up logic: the bot can lead clients through the funnel, book calendar meetings, or send payment links. Use ready services or build your own solution with n8n for full flexibility.'
                },
                {
                    title: 'Integration',
                    icon: 'MessageSquare',
                    expanded: 'Launch the twin on your website, WhatsApp, or Instagram. It works 24/7, maintaining your style and expertise while you handle other things.'
                }
            ],
            insights: [
                'Our Shaolin Camp bot processed 500+ leads without human involvement',
                '99% answer accuracy thanks to a quality knowledge base',
                'Full integration with Nuanu and booking systems'
            ],
            tools: ['Chatbase', 'n8n', 'Claude 3.5', 'WhatsApp API']
        },
        type: 'case-study',
        timing: '8 min'
    },

    // BLOCK 4: WHAT'S COMING
    {
        block: 'future',
        id: 12,
        title: 'What\'s Coming: 2027–2028',
        content: {
            process: [
                {
                    title: 'Agents Will Talk to Each Other',
                    icon: 'Users',
                    expanded: 'Your scheduling agent negotiates with your colleague\'s scheduling agent to find a meeting time. Your purchasing agent finds the best deal by talking to vendor agents. No humans needed for the boring stuff.'
                },
                {
                    title: 'The Protocols Are Being Built Now',
                    icon: 'Network',
                    expanded: 'Anthropic made MCP — Model Context Protocol. Google made A2A — Agent-to-Agent. IBM made ACP. The Linux Foundation created an Agentic AI Foundation. These are like HTTP and TCP/IP in the 90s — the plumbing that makes everything work together.'
                },
                {
                    title: 'Agents Get Cheaper and Efficient',
                    icon: 'DollarSign',
                    expanded: 'Models are getting not just smarter but smaller. Running a solid agent will cost pennies per day, not dollars. Local models on your phone will handle 80% of tasks without internet.'
                },
                {
                    title: 'Every App Becomes an Agent Endpoint',
                    icon: 'Smartphone',
                    expanded: 'Your email, calendar, bank, project manager — they\'ll all have APIs designed specifically for agents. Why open your banking app when your agent can make a transfer from a Telegram message?'
                }
            ]
        },
        type: 'case-study',
        timing: '5 min'
    },
    {
        block: 'future',
        id: 13,
        title: 'What\'s Coming: 2028–2030',
        content: {
            process: [
                {
                    title: 'Your Personal AI Becomes Your OS',
                    icon: 'Cpu',
                    expanded: 'Instead of opening 15 apps, you talk to one agent that handles everything. It knows your schedule, habits, goals. "You have a flight tomorrow. I\'ve checked you in, your packing list is ready, I moved your morning meeting, and your taxi is booked for 6am."'
                },
                {
                    title: 'Teams of Agents Run Businesses',
                    icon: 'Building',
                    expanded: 'Not one agent doing one task — but teams of agents running whole processes. Marketing, customer support, accounting, HR — start to finish, with humans making the big decisions.'
                },
                {
                    title: '$2.9 Trillion Economic Impact',
                    icon: 'TrendingUp',
                    expanded: 'McKinsey estimates AI agents could create $2.9 trillion in extra economic value by 2030. Not about replacing people — about people doing 10x more with AI teammates.'
                }
            ],
            insights: [
                'Half the jobs that will exist in 2030 haven\'t been invented yet',
                'Like in 2005 — no "social media manager", no "mobile app developer", no "influencer"',
                'People who started learning the tools early will fill those new roles first'
            ]
        },
        type: 'case-study',
        timing: '5 min'
    },

    // BLOCK 5: WHY THIS MATTERS & ACTION
    {
        block: 'action',
        id: 14,
        title: 'The Wave Is Building',
        content: {
            definition: 'The people who won with the internet, mobile, cloud — they weren\'t the smartest. They were the ones who started early and learned by doing.',
            types: [
                {
                    title: 'iPhone Moment (2007)',
                    icon: 'Smartphone',
                    expanded: '"Why would I need internet on my phone, I have a computer." The people who started building mobile apps then became millionaires within five years.'
                },
                {
                    title: 'YouTube Moment',
                    icon: 'Video',
                    expanded: 'People laughed at bloggers filming videos in their bedrooms. Now it\'s a multi-billion dollar industry.'
                },
                {
                    title: 'We\'re in That Moment Right Now',
                    icon: 'Zap',
                    expanded: 'Most people are stuck at the chatbot stage. They use ChatGPT to write emails and think that\'s what AI is. They\'re standing on the beach watching the wave. You\'re about to start paddling.'
                }
            ]
        },
        type: 'concept',
        timing: '3 min'
    },
    {
        block: 'action',
        id: 15,
        title: 'Four Things You Can Do RIGHT NOW',
        content: {
            process: [
                {
                    title: '1. Automate Your Daily Overhead',
                    icon: 'Zap',
                    expanded: 'How much time on email, scheduling, reminders, organizing files? An hour a day? Two? That\'s 500+ hours a year. An AI agent can handle 70% of that starting today.'
                },
                {
                    title: '2. Build Your AI Muscle',
                    icon: 'Dumbbell',
                    expanded: 'Working with AI agents — giving them context, setting up workflows, reviewing output — that\'s a new skill. Like learning to code was 10 years ago. It became useful for everyone. Same will happen with AI.'
                },
                {
                    title: '3. Think in Systems, Not Tasks',
                    icon: 'Network',
                    expanded: 'Don\'t use AI for one thing. Connect it to your email AND calendar AND task manager AND notes. The magic is in the connections. When an agent sees the full picture, it can do things impossible with separate tools.'
                },
                {
                    title: '4. Own Your Infrastructure',
                    icon: 'Server',
                    expanded: 'When you build on someone else\'s platform, they control the price, features, data. Tomorrow OpenAI could double their price. When you run your own agent on your own server — that\'s yours. Nobody can take it away.'
                }
            ],
            insights: [
                'Every minute invested in automation returns 10x',
                'Your progress in a month with AI equals a year without it',
                'The main thing is not a perfect result, but a working system'
            ]
        },
        type: 'case-study',
        timing: '5 min'
    },
    {
        block: 'action',
        id: 16,
        title: 'The Future Belongs to Architects',
        subtitle: 'Your path from executor to system creator',
        content: {
            message: [
                {
                    title: 'Become a Centaur',
                    icon: 'Zap',
                    expanded: 'Don\'t compete with the algorithm — amplify yourself with it. Your intuition, taste, and human context combined with AI\'s computing power create superpowers.'
                },
                {
                    title: 'Questions Are the New Currency',
                    icon: 'HelpCircle',
                    expanded: 'In a world where answers are nearly free, value shifts to meaning. The ability to see the problem and ask the right questions is the only skill that won\'t depreciate.'
                },
                {
                    title: 'The Exponential Gap',
                    icon: 'TrendingUp',
                    expanded: 'The gap between those using AI as leverage and the rest grows not linearly, but exponentially. Every day of delay is a lost advantage.'
                },
                {
                    title: 'From Code to System Design',
                    icon: 'Layers',
                    expanded: 'We stop being those who "pound the keyboard." We become architects who design logic, meaning, and connections. A return to true creativity.'
                }
            ],
            final_quote: '"The future is already here — it\'s just not evenly distributed." With AI, you\'re in its densest part.',
            call_to_action: 'Open your laptops. Go to digitalocean.com. We\'re about to deploy your first AI agent. Let\'s go. 🦞'
        },
        type: 'case-study',
        timing: '5 min'
    }
];
