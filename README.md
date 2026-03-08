# WAR — Global Conflict Monitor

A real-time global conflict monitoring dashboard that aggregates multi-lingual news sources, maps active conflict zones, and provides AI-powered intelligence analysis.

**Live:** [war-pied-two.vercel.app](https://war-pied-two.vercel.app)

## Credits

This project is inspired by and built upon [NewFeeds](https://github.com/ktoetotam/NewFeeds) by **Maria Sukhareva** ([@ktoetotam](https://github.com/ktoetotam)).

Maria originally built a public monitoring website to track the war in Iran, aggregating diverse multi-lingual sources — Farsi, Hebrew, Arabic, Russian, Chinese — including Telegram channels and state-controlled media. Her philosophy: monitoring lies can reveal truth, and source diversity is essential during conflict.

Read her original write-up: [I Built a Public Monitoring Website For The War in Iran](https://msukhareva.substack.com/p/i-built-a-public-monitoring-website) — AI Realist, March 2026.

## What We Added

Starting from the NewFeeds foundation, we extended the project with a full AI-powered intelligence layer using Retrieval-Augmented Generation (RAG) and a multi-agent system.

### Interactive Conflict Map
- Real-time world map with clustered markers (Leaflet + MarkerCluster)
- Severity-based color coding (Low, Medium, High, Critical, Major)
- Clickable filter badges to toggle conflict severity levels
- Floating transparent header that overlays the map

### AI Intelligence Chat (Multi-Agent RAG)
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

## Architecture

### RAG Pipeline (Retrieval-Augmented Generation)

The core intelligence system uses RAG to ground AI responses in real, up-to-date news data rather than relying on the LLM's training data alone.

```
News Sources → Fetch & Translate → Embed → Store in pgvector
                                                    ↓
User Query → Embed Query → Semantic Search → Context → LLM → Response
```

**How it works:**

1. **Ingestion (Cron Job):** A scheduled cron job fetches articles from diverse multi-lingual news sources. Each article is:
   - Translated to English (if needed) and summarized using Groq LLM (`llama-3.1-8b-instant`)
   - Classified for conflict relevance — the LLM extracts attack type, severity, location
   - Geocoded via OpenStreetMap Nominatim for map placement
   - Embedded into a 1024-dimensional vector using a custom vLLM embedding model
   - Stored in Neon PostgreSQL with the pgvector extension

2. **Retrieval:** When a user asks a question, the query is embedded with the same model and a cosine similarity search (`<=>` operator) finds the most relevant articles in the database.

3. **Generation:** The retrieved articles are passed as context to the LLM, which generates a grounded, source-cited response.

### Multi-Agent System

Built with **LlamaIndex TS** (`LLMAgent`), the system uses 4 specialized agents, each with access to different tool combinations:

| Agent | Purpose | Tools |
|-------|---------|-------|
| **Intel Agent** | Main chat — answers any geopolitical question | All 5 tools |
| **Bias Agent** | Compares how different sources frame the same event | search_news, get_recent_news, analyze_bias |
| **Fact-Check Agent** | Verifies claims against multiple sources | search_news, get_attacks, fact_check |
| **Briefing Agent** | Generates situational intelligence briefings | get_recent_news, get_attacks, search_news |

**Agent Tools:**

| Tool | Description | Technique |
|------|-------------|-----------|
| `search_news` | Semantic search over articles | pgvector cosine similarity |
| `get_recent_news` | Latest articles by region | Recency-based SQL query |
| `get_attacks` | Recent military/security incidents | Time-windowed attack data |
| `analyze_bias` | Compare source framing | LLM analysis over multi-source articles |
| `fact_check` | Verify claims with evidence | Cross-reference search + LLM verdict |

Agents are powered by **Groq** (free tier) with two models:
- `llama-3.1-8b-instant` — fast model for bulk tasks (translation, classification, summarization)
- `llama-4-scout-17b-16e-instruct` — quality model for agent reasoning and chat responses

### Streaming Architecture

Chat responses use a **2-phase streaming** approach via Server-Sent Events (SSE):

1. **Phase 1 — Agent Gathering:** The LlamaIndex agent calls its tools (search, attacks, bias analysis) to gather intelligence. During this phase, the UI shows a status message ("Gathering intelligence...").

2. **Phase 2 — Streamed Formatting:** The raw agent output is passed to Groq's streaming API, which reformats it into clean markdown and streams it token-by-token to the client.

```
Client ←SSE← [sources] [status: "Gathering..."] [token][token][token]... [done]
```

### Database Schema

PostgreSQL (Neon) with pgvector extension:

- **sources** — news source registry (name, URL, region, language, category)
- **articles** — fetched articles with `embedding vector(1024)` column for semantic search
- **attacks** — classified conflict events with lat/lon for map markers
- **bias_analyses** — cached bias analysis results
- **fact_checks** — cached fact-check verdicts with evidence

### Rate Limiting

A custom queue-based rate limiter with exponential backoff handles Groq's free tier limits (RPM, RPD, TPM per model). All LLM calls are routed through this limiter to prevent 429 errors.

## Tech Stack

- **Framework:** Next.js 15 + React 19 + TypeScript
- **AI/LLM:** LlamaIndex TS, Groq (Llama 3.1 / Llama 4 Scout)
- **RAG:** pgvector semantic search + custom embeddings (1024-dim)
- **Database:** Neon PostgreSQL + pgvector
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
