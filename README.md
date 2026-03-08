# WAR — Global Conflict Monitor

A real-time global conflict monitoring dashboard that aggregates multi-lingual news sources, maps active conflict zones, and provides AI-powered intelligence analysis.

**Live:** [war-pied-two.vercel.app](https://war-pied-two.vercel.app)

## Credits

This project is inspired by and built upon [NewFeeds](https://github.com/ktoetotam/NewFeeds) by **Maria Sukhareva** ([@ktoetotam](https://github.com/ktoetotam)).

Maria originally built a public monitoring website to track the war in Iran, aggregating diverse multi-lingual sources — Farsi, Hebrew, Arabic, Russian, Chinese — including Telegram channels and state-controlled media. Her philosophy: monitoring lies can reveal truth, and source diversity is essential during conflict.

Read her original write-up: [I Built a Public Monitoring Website For The War in Iran](https://msukhareva.substack.com/p/i-built-a-public-monitoring-website) — AI Realist, March 2026.

## What We Added

Starting from the NewFeeds foundation, we extended the project with:

### Interactive Conflict Map
- Real-time world map with clustered markers (Leaflet + MarkerCluster)
- Severity-based color coding (Low, Medium, High, Critical, Major)
- Clickable filter badges to toggle conflict severity levels
- Floating transparent header that overlays the map

### AI Intelligence Chat
- Multi-agent RAG system powered by **LlamaIndex** and **Groq**
- 4 specialized agents: Intel, Bias Analysis, Fact-Check, Briefing
- Real-time streaming responses with markdown formatting
- Suggested questions for quick exploration

### Bias Analyzer
- AI-driven media bias detection across sources
- Compares framing, tone, and emphasis across different outlets
- Highlights potential propaganda and state-controlled narratives

### Fact Checker
- Cross-references claims against multiple sources
- Provides evidence-based verdicts with source citations

### News Feed
- Aggregated news from diverse global sources
- Category and region tagging with pastel color system
- Relative timestamps and source attribution

## Tech Stack

- **Framework:** Next.js 15 + React 19 + TypeScript
- **AI/LLM:** LlamaIndex TS, Groq (Llama 3.1 / Llama 4 Scout)
- **Database:** Neon PostgreSQL + pgvector for semantic search
- **Embeddings:** Custom vLLM embedding server
- **Map:** Leaflet + MarkerCluster (CDN)
- **Styling:** Bootstrap 5, custom dark theme with pastel accents
- **Deployment:** Vercel

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # AI chat endpoint (streaming SSE)
│   │   ├── bias/          # Bias analysis endpoint
│   │   ├── factcheck/     # Fact-checking endpoint
│   │   ├── news/          # News aggregation endpoint
│   │   └── cron/          # Scheduled news fetching
│   ├── globals.css        # Dark theme + pastel design system
│   ├── layout.tsx
│   └── page.tsx           # Main app with tab navigation
├── components/
│   ├── ConflictMap.tsx     # Interactive map with clustering
│   ├── ChatPanel.tsx       # AI chat with streaming markdown
│   ├── NewsFeed.tsx        # News aggregation feed
│   ├── BiasAnalyzer.tsx    # Media bias analysis
│   └── FactChecker.tsx     # Fact-checking interface
└── lib/
    ├── llamaindex/
    │   ├── config.ts       # LLM configuration (Groq)
    │   ├── agents.ts       # Multi-agent system (4 agents)
    │   └── tools.ts        # Agent tools (search, analyze, etc.)
    ├── services/           # Business logic services
    ├── db.ts               # PostgreSQL + pgvector
    ├── embeddings.ts       # Vector embeddings
    └── groq.ts             # Groq client + rate limiter
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL with pgvector extension (e.g., Neon)
- Groq API key
- (Optional) Custom embedding server

### Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
EMBEDDING_API_URL=        # Optional: custom embedding server
EMBEDDING_API_KEY=        # Optional
EMBEDDING_MODEL=          # Optional
NEWSDATA_API_KEY=         # For news fetching
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

MIT — same as the original [NewFeeds](https://github.com/ktoetotam/NewFeeds) project.
