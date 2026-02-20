export const lectureTextContent = {
    1: {
        title: "OpenClaw Workshop",
        talk: "Hey everyone, welcome. Today we're going to talk about AI agents — what they are, why they matter, and how you can start using them right now. This isn't a theory class. By the end of this session, you'll have your own AI agent running on a server. The shift is happening right now, and the good news is — you're not too late. Let's get into it.",
        practice: null
    },
    2: {
        title: "We're at a Turning Point",
        talk: "Let me give you the big picture. From 2010 to 2019, it was all about mobile and cloud — iPhone, Uber, Airbnb, Instagram. Platforms changed how we consume everything. Then 2020 to 2024 — AI broke through. GPT-3, ChatGPT, Copilot. Suddenly AI was everywhere. Text, images, video — all generated. The pandemic pushed everything digital even faster. Now, 2025-2026 — this is the age of AI agents. AI doesn't just answer questions anymore. It acts. It books your flights, sends your emails, manages your calendar. It's a brain that finally got hands. And looking ahead to 2027-2035, we're talking robotics plus AI, biotech, quantum computing. The meaning of work itself will change. Here's the key: 2024 was chatbots. 2025 was copilots. 2026 is agents. People who learn this now become architects of the future. People who wait become users.",
        practice: null
    },
    3: {
        title: "The Speed Is Insane",
        talk: "Let me throw some numbers at you. The AI agent market is at 7.8 billion dollars right now. By 2030 it'll be 52 billion. That's 7x growth in 4 years. Gartner says 40 percent of business apps will have AI agents by end of 2026. Last year it was under 5 percent. OpenClaw — the platform we're going to use today — went from 9,000 to over 150,000 GitHub stars in weeks. Over 3,000 community-built skills. This isn't hype. This is real infrastructure being built right in front of us. And by the end of this session, you'll have your own agent working for you 24/7.",
        practice: null
    },
    4: {
        title: "My Story",
        talk: "Quick bit about me. I started coding in Python back in 2016. By 2018 I was working in startups, building real products in fast teams. Then 2023 — I burned out. Traditional IT just drained me. I left and started my own business. But in 2024, I came back to tech through AI. Everything changed. I stopped writing code line by line and started directing AI to do it. By 2025, I was fully integrated — my development speed multiplied several times over. I'm not a genius programmer. I just learned to use AI as a partner, not a tool.",
        practice: null
    },
    5: {
        title: "Three Waves of AI",
        talk: "OK, let's understand what's actually happening. Think about it — we went from 'write me an email' to 'send that email, check if they replied, and follow up if they didn't' — in just two years. Wave 1 was chatbots. ChatGPT, Claude, Gemini. You type something, it answers. Great for questions and brainstorming. But close the tab and it forgets you exist. No memory between sessions. Wave 2 — copilots. GitHub Copilot, Cursor, Microsoft Copilot. They live inside your tools. They suggest code, summarize documents, draft emails. But you're still driving. Without you, nothing happens. Wave 3 — agents. This is the big shift. An agent doesn't just help — it acts for you. You say 'move my meeting with Alex to Thursday' and it checks both calendars, finds a free slot, sends the invite, and confirms. No copy-paste. It just does it. And then there's AGI — general AI — expected around 2027-2028. Systems that can solve any intellectual task at human level or above.",
        practice: null
    },
    6: {
        title: "How AI Works",
        talk: "Let me explain how this actually works, in simple terms. A neural network is an algorithm that learns from examples, kind of like how your brain works. Data goes in, gets processed through layers of weights, and a result comes out. Here's the timeline. 2012 — deep learning took off because GPUs got powerful enough. 2017 — the Transformer architecture changed everything. That's the foundation of every modern AI. 2022 — ChatGPT brought it to the masses. 2024 — multimodality, meaning AI can now see images, hear audio, and speak. 2026 — agency, AI acts on its own. Why is all this happening now? Four reasons. GPUs like H100 are available everywhere. We have high-quality synthetic data. New architectures are going beyond Transformers. And big tech is pouring trillions into this. The infrastructure is ready. The only missing piece is people who know how to use it.",
        practice: null
    },
    7: {
        title: "Who's In The Game Right Now",
        talk: "Let me walk you through the main players. First — OpenClaw. This is what we'll use today. It's open-source, free, runs on your own server. You own the data. You pick the AI model. Nobody can change the price or take away your access. It works through Telegram, WhatsApp, Slack, Discord — whatever you use. For text and logic — Claude 4 is the gold standard for reasoning and code. GPT-5.2 is the best all-around assistant with great voice features. Gemini 3 has a crazy 10-million-plus token context window. For coding — Claude Code is an autonomous terminal agent. Cursor is the IDE that became the standard. Devin codes like a junior developer. For automation — Make.com lets you visually connect services. n8n is open-source workflow automation. LangChain is the standard for building complex agent systems. You don't need all of these. Pick the ones that fit your work.",
        practice: null
    },
    8: {
        title: "Prompt Engineering 2.0",
        talk: "Here's the formula for talking to AI effectively. Role plus Context plus Instructions plus Constraints plus Format. That's it. Let me give you an example. Bad prompt: 'Write a marketing strategy.' Good prompt: 'You're a startup CMO. Analyze the attached competitor PDFs. Create a 30-day plan focused on LinkedIn. Use table format.' See the difference? Same task, completely different result. Three techniques you should know. Chain-of-Thought — ask AI to think out loud before answering. This cuts logic errors by 60 percent. Self-Consistency — make AI generate 3 options and pick the best one. Great for complex decisions. RAG Thinking — always give AI your actual files and data. Don't make it guess or hallucinate facts. Feed it real information.",
        practice: "Try this right now: take a prompt you usually use and rewrite it with the formula. Role, context, instructions, constraints, format. Compare the results."
    },
    9: {
        title: "Case #1: Business Analytics",
        talk: "Here's a real case. How to replace an analytics department with one AI agent. Step one — collect raw data. Revenue reports, product descriptions, price lists, CRM exports, ad platform data. The more context you give the agent, the deeper it understands your business. Step two — organize and name everything properly. Put files in one folder. Name them clearly — like 'revenue_2025_q4.csv'. Good structure means the agent finds information fast. Step three — feed it to an AI agent. Use Claude Code or Antigravity. First, ask the agent to analyze the files and tell you what it learned. This is context alignment — making sure it understands your data correctly. Step four — set a concrete task. Tell it about your business, your pain points, what outcome you want. Now it works with real numbers, not guesses. Step five — verify and dig deeper. Look for things humans miss — like the relationship between product type and purchase timing. AI sees the whole system, not fragments. The key formula: Content plus Context equals Deep Insight.",
        practice: "Pick a real dataset from your business. Upload it to Claude. Ask it to analyze and tell you what it sees. Then ask a specific business question."
    },
    10: {
        title: "Case #2: Websites in an Evening",
        talk: "Second case — building a website from zero to production in one evening. Step one — concept. Describe what you want, the style, the mood. Look at sites you like for inspiration. You can brainstorm with multiple AIs at the same time and pick the best ideas. Step two — create a master prompt. Take all your best ideas and write one detailed description. Every section, every visual detail, the whole user flow. This is the blueprint. Step three — give it to Lovable or Bolt. The agent writes code, installs libraries, fixes bugs in real time. You don't write code anymore — you manage the process. Step four — deploy and iterate. Launch directly from Lovable, connect your domain, and keep improving with prompts. Lovable is great for beautiful landing pages and MVPs. Bolt is fast for React apps. Antigravity handles complex custom logic. The point is — you can launch an idea tonight without hiring a team.",
        practice: "Think of a simple app or landing page you've been putting off. Describe it in 5 sentences. That's your master prompt. Try it in Lovable."
    },
    11: {
        title: "Case #3: Digital Twin",
        talk: "Third case — creating a digital copy of yourself. A bot that talks like you and knows everything about your business. Step one — personality. Copy your real chats where your style is visible. Ask Claude or ChatGPT to analyze them and describe your communication style, your favorite words, your tone. You define the character, the bot executes it. Step two — knowledge base using RAG. Upload your files, documents, FAQs to Chatbase. The bot doesn't invent answers — it uses Retrieval-Augmented Generation. It knows every detail of your product. Step three — automation. Set up logic so the bot can guide clients through a funnel, book meetings on your calendar, send payment links. Use n8n for full flexibility. Step four — integration. Launch the twin on your website, WhatsApp, Instagram. It works 24/7, keeping your style and expertise while you do other things. Real result: our bot processed over 500 leads without any human involvement. 99 percent answer accuracy thanks to a solid knowledge base.",
        practice: "Export 20 of your recent chats. Feed them to Claude. Ask it to describe your communication style in 5 bullet points. That's the start of your digital twin."
    },
    12: {
        title: "What's Coming: 2027-2028",
        talk: "Let's look ahead. First — agents will talk to each other. Your scheduling agent will negotiate with your colleague's agent to find a meeting time. Your purchasing agent will find the best deal by talking to vendor agents. No humans needed for the boring stuff. Second — the protocols are being built right now. Anthropic made MCP — Model Context Protocol. Google made A2A — Agent-to-Agent. IBM made ACP. The Linux Foundation created an Agentic AI Foundation. Think of these like HTTP and TCP/IP in the 90s. It's the plumbing that makes everything work together. Third — agents get cheaper. Models are getting smarter AND smaller. Running a solid agent will cost pennies per day, not dollars. Local models on your phone will handle 80 percent of tasks without internet. Fourth — every app becomes an agent endpoint. Your email, calendar, bank, project manager — they'll all have APIs built for agents. Why open your banking app when your agent can make a transfer from a Telegram message?",
        practice: null
    },
    13: {
        title: "What's Coming: 2028-2030",
        talk: "Looking further out. Your personal AI becomes your operating system. Instead of opening 15 apps, you talk to one agent that handles everything. It knows your schedule, your habits, your goals. 'You have a flight tomorrow. I've checked you in, your packing list is ready, I moved your morning meeting, and your taxi is booked for 6am.' Teams of agents will run whole businesses. Not one agent doing one task — but teams of agents managing marketing, customer support, accounting, HR. Start to finish. Humans make the big decisions. McKinsey estimates AI agents could add 2.9 trillion dollars in economic value by 2030. This isn't about replacing people. It's about people doing 10x more with AI teammates. Here's something to think about — half the jobs that will exist in 2030 haven't been invented yet. Same thing happened before. In 2005, there was no 'social media manager', no 'mobile app developer', no 'influencer'. The people who learn the tools early fill the new roles first.",
        practice: null
    },
    14: {
        title: "The Wave Is Building",
        talk: "The people who won with the internet, with mobile, with cloud — they weren't the smartest. They were the ones who started early and learned by doing. Remember the iPhone in 2007? People said 'why would I need internet on my phone, I have a computer.' The people who started building mobile apps then became millionaires within five years. Remember early YouTube? People laughed at bloggers filming videos in their bedrooms. Now it's a multi-billion dollar industry. We're in that exact moment right now with AI agents. Most people are stuck at the chatbot stage. They use ChatGPT to write emails and think that's what AI is. They're standing on the beach watching the wave. You're about to start paddling.",
        practice: null
    },
    15: {
        title: "Four Things You Can Do RIGHT NOW",
        talk: "OK, let's get practical. Four things you can start today. One — automate your daily overhead. How much time do you spend on email, scheduling, reminders, organizing files? An hour a day? Two? That's over 500 hours a year. An AI agent can handle 70 percent of that starting today. Two — build your AI muscle. Working with agents — giving them context, setting up workflows, reviewing output — that's a new skill. Like learning to code was 10 years ago. It became useful for everyone. Same thing will happen with AI. Three — think in systems, not tasks. Don't use AI for just one thing. Connect it to your email AND calendar AND task manager AND notes. The magic is in the connections. When an agent sees the full picture, it can do things no single tool can do alone. Four — own your infrastructure. When you build on someone else's platform, they control the price, the features, the data. Tomorrow they could double their price. When you run your own agent on your own server — that's yours. Nobody can take it away. Remember: every minute invested in automation returns 10x. A month with AI equals a year without it.",
        practice: "Write down the 3 most boring tasks you do every week. Pick one. That's your first automation target."
    },
    16: {
        title: "The Future Belongs to Architects",
        talk: "Last slide. The big idea. Become a centaur — half human, half AI. Don't compete with the algorithm. Amplify yourself with it. Your intuition, taste, and human understanding combined with AI's computing power — that's a superpower. Questions are the new currency. In a world where answers are almost free, the value shifts to meaning. The ability to see the right problem and ask the right question — that's the skill that won't lose its value. The gap between people using AI and people not using it grows exponentially. Not a little bit each day — it doubles. Every day you wait is a lost advantage. We're moving from 'people who type code' to architects who design logic, meaning, and connections. That's a return to true creativity. The future is already here — it's just not evenly distributed. With AI, you're in its densest part. OK — open your laptops. Go to digitalocean.com. We're about to deploy your first AI agent. Let's go.",
        practice: "Open digitalocean.com. We're deploying your OpenClaw agent right now."
    }
};
