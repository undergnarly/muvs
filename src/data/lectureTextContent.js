export const lectureTextContent = {
    1: {
        title: "Automation and AI Systems: Introduction",
        talk: "We are entering an era where intelligence is no longer a biological monopoly. Today, AI is not just a chatbot; it is 'smart electricity' that can be applied to any task. Most people use it as a flashlight, but you have the opportunity to build a power plant. My goal is to teach you to think at the scale of systems. This isn't about 'prompt engineering' anymore; it's about designing autonomous agents that work 24/7, with access to your entire digital memory and the ability to act on your behalf.",
        practice: "Inventory of Routine: List 3 tasks you perform every week that drain your energy. Note what information someone would need to perform these tasks perfectly for you. This is the foundation for your first AI agent."
    },
    2: {
        title: "The Evolution of AI: From Generation to Action",
        talk: "Understanding the context is vital. 2023 was the year of Generative AI hype—we were amazed by images and text. 2026 is the year of Agential AI. The difference? Generative AI is a 'smart parrot'—it answers. Agential AI has 'hands'. It doesn't just write a travel plan; it navigates Skyscanner, books tickets, and syncs your calendar. We are shifting from the 'Chat' interface to the 'Do' interface. The speed of this transition means that skills from six months ago already require a complete rethink through the lens of autonomy.",
        practice: "Demo: Watch an agent chain actions (e.g., analyzing a fresh PDF → extracting tasks → creating Trello cards → sending a Telegram notification) in a single click."
    },
    3: {
        title: "Shaolin + AI: The Master's Path",
        talk: "Why Shaolin when we talk about AI? Discipline of the mind. AI is an amplifier. If you amplify chaos, you get automated chaos. In Shaolin, we learn 'emptiness'—the ability to see structure without noise. In system design, this is critical. An architect must see the data flow, not just words. The Master's path today is a combination of deep human focus and algorithmic scaling. We delegate everything that doesn't require a soul to AI, keeping the best parts of work and life for ourselves.",
        practice: "Meditation on Structure: Take a complex process (e.g., hiring). Break it down into 'atoms'—the smallest indivisible actions. Where is empathy needed? Where is pure logic? Designate the logical atoms for automation."
    },
    4: {
        title: "Learning Path: 2 Hours to Your First Agent",
        talk: "Our program is structured to break old habits first: prompt engineering is dead. Then we build the system foundation. We will analyze 3 real-world cases implemented in 2025. The practical part isn't just following me—it's building your own project. We'll use Claude 3.5 Sonnet and Cursor as primary tools, as they currently lead in complex logical reasoning.",
        practice: "Setup: API access check. If you don't have a paid Claude account, we'll set up access through the Anthropic API Console—often cheaper and more powerful for system work. Tip: use LangSmith for debugging chains."
    },
    5: {
        title: "My Journey: From Coder to Architect",
        talk: "I was once a programmer who wrote thousands of lines of code manually. I burnt out because the volume of tasks grew faster than my hands could type. Returning to IT through AI was a revelation. I stopped 'coding' and started 'directing'. My story is a transition from a solo performer to a conductor of an AI-agent orchestra. Today, I'll show how one person can handle the workload of an entire department if their 'Second Brain' is configured correctly.",
        practice: "Provocation: If you were forbidden from typing code or text by hand, how would you explain to a computer what needs to be done? This exercise teaches you to think semantically and at a higher level of abstraction."
    },
    6: {
        title: "Morphology of AI: Intelligence as Statistics",
        talk: "Understand this: LLMs don't 'think' like humans. They predict the most likely continuation of a sequence. But because they are trained on 100+ terabytes of human data, that prediction includes logic, cause-and-effect, and even humor. Key insight: AI works best as 'System 1' (intuitive thinking). Our job is to build 'System 2' (logical verification) on top of it using tools and code. We don't ask it to 'solve'; we ask it to 'reason'.",
        practice: "Hallucination Test: Give the model a task with a false premise. Learn to 'ground' it using system prompts, reasoning techniques, and few-shot prompting to ensure reliability."
    },
    7: {
        title: "Architecture of LLMs: Levers and Weights",
        talk: "A neural network is a high-dimensional semantic space. When you type 'write code', you activate one area of that space. Adding 'in the style of functional programming' focuses the model's 'attention beam'. Thinking like an architect means knowing which area of semantic space to point the model toward for a flawless result. We use 'Chain-of-Thought'—forcing the AI to think aloud before answering—which improves accuracy in complex tasks by 40-60%.",
        practice: "CoT Masterclass: Rewrite a simple prompt into the structure: [Role] - [Goal] - [Rules] - [Chain of Thought steps] - [Output Format]. Pro tip: Use XML tags (e.g., <context></context>) to separate variables—it's the standard for Claude."
    },
    8: {
        title: "The Tech Stack of 2026",
        talk: "Why now? Because the cost of compute has dropped 10x in 2 years. Models like Llama 3 can run locally on a laptop, providing privacy. Meanwhile, cloud giants have enabled AI to see, hear, and code. Technology has become 'transparent'—you speak, and it happens. The barrier is no longer software complexity; it's the limit of your imagination. 2026 is the year of multimodality: your agent sees your screen and understands your workflow in real-time.",
        practice: "Comparison: Run one task on GPT-4o (speed) and Claude 3.5 (logic). Observe the difference in depth. Test Google Flash 1.5 for its massive 2M+ token context window."
    },
    9: {
        title: "Concept: From Chat to Agential Systems",
        talk: "This is the most important concept today. An Agent = LLM + Memory (RAG) + Tools (API). Asking AI to 'write an email' is a chat. Creating a system that sees a customer complaint, checks the order database, verifies delivery status, and responds with a discount is an Agent. We build systems. The 'Supervisor-Executor' architecture—where one AI plans and others execute narrow tasks—is the benchmark. Use the 'Reflection' pattern: one agent reviews the work of another.",
        practice: "Design: Map out a Research Agent. What tools does it need? (Google Search, Web Scraper, Markdown Summarizer). Explore frameworks like CrewAI or LangGraph for orchestration."
    },
    10: {
        title: "Case #1: Deep Business Analytics",
        talk: "How we evaluated a new real estate market in an hour. We didn't read articles; we unleashed an agent on 200 competitor websites, extracted prices into structured JSON, and built a demand model. Key insight: AI finds patterns humans miss. Tech: Python (Scraping) + Claude (Analysis) + Antigravity (Automation). We turned 'opinion' into 'data-driven strategy'.",
        practice: "Practice: Use specialized prompts to perform a SWOT analysis based on real customer reviews from Google Maps, collected by an agent in 3 minutes."
    },
    11: {
        title: "Case #2: Deploying Apps in an Evening (Lovable)",
        talk: "Lovable and Bolt are not 'website builders'. They are systems that write clean React/Vite code in real-time based on your description. Say, 'Build me a workout tracking dashboard with charts and Telegram integration,' and in 5 minutes, you have a working app. Success here depends on describing the 'User Flow'. The better you understand the user's journey, the more powerful the result. You are no longer a coder; you are the Product Manager of your AI department.",
        practice: "Live-Build: We'll build a service prototype in 10 minutes, publish it, and access it from a phone. Iterative approach: learn how to fix design bugs through chat."
    },
    12: {
        title: "Case #3: Digital Immortality & Knowledge Bases",
        talk: "RAG (Retrieval-Augmented Generation) saves AI from hallucinations by giving it a 'textbook' of your business. Our Shaolin Camp bot didn't just 'know' about Shaolin; it had access to all regulations, prices, and chat logs. It closed deals because it knew the context. You can clone your expertise by uploading lectures, articles, and even voice messages to Chatbase. The bot becomes your digital extension, scaling your presence infinitely.",
        practice: "Create RAG: We'll upload this transcript to Chatbase, ask tricky questions, and watch the bot precisely cite the architect's thoughts. Hack: use vectorization for searching through video transcripts."
    },
    13: {
        title: "AI Mindset: Systemic Architecture",
        talk: "Systemic thinking is knowing the whole is greater than the sum of its parts. Your AI system must be modular. Don't build a 'monolith'. If one model fails or becomes expensive, you should be able to swap it for another (e.g., GPT to Claude or Groq) in minutes. Think in data: what is the Input, the Process, and the Output. Automation isn't about working less; it's about achieving 10x in the same time. Delegate cognitive load, not just tasks.",
        practice: "Blueprint: Draw a 'content pipeline'—from an idea in a Telegram bot to a finished post on 4 social networks. Analyze the 'Self-Correction' pattern in n8n."
    },
    14: {
        title: "Personal AI Ecosystem (Second Brain)",
        talk: "Your brain is for generating ideas, not storing them. A system of Notion, Obsidian, and AI agents is your external hard drive with semantic search. I use an AI firewall that reads all incoming messages, flags the important ones, and prepares draft replies. By the time I sit down to work, 50% of the routine is done. This enables a 'flow state' hidden from those stuck in email. Your efficiency is now measured by the quality of decisions, not hours worked.",
        practice: "Configuration: Create a 'Personal Analyst' in Claude. Upload your bank statements or screen time statistics and ask it to identify 3 habits that are stealing your future."
    },
    15: {
        title: "Your 30-Day Roadmap",
        talk: "Knowledge without practice is waste. Week 1: Choose the most boring task and automate it at all costs. Week 2: Build your first MVP using Bolt/Lovable. Week 3: Set up an n8n workflow to automatically gather insights from your niche. Week 4: Multi-agent design—architect your 'Creative Studio'. Within a month, your workflow will be unrecognizable. You will never perform the same manual task twice.",
        practice: "Commitment: Write down one specific date and time next week. Learn the '15-minute AI Hygiene' technique to maintain your ecosystem daily."
    },
    16: {
        title: "The Architect's Manifesto",
        talk: "The future doesn't just happen; we build it. AI is the most powerful tool for democratizing expertise in history. A solo operator with AI agents can now compete with corporations. Be the one who asks the questions, not the one who just waits for answers. Become the architect of your own systems. Go and create what previously seemed impossible. In the world of AI, the winner isn't the fastest runner, but the one who built the most efficient engine.",
        practice: "Final Act: The 2026 Architect's Toolkit—a PDF guide with all the links and frameworks. Q&A and launching your first project right now."
    }
};
