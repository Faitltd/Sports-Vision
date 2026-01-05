# NCAAF Slate Handicapper

## Overview
A framework-driven college football betting analysis tool that emphasizes transparency, audit trails, and data provenance. The application helps handicappers analyze games systematically using customizable frameworks with weighted factors and conditional rules.

## Tech Stack
- **Frontend:** React with TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI Integrations:** OpenAI (OCR/extraction), Perplexity (research with citations)
- **Styling:** Carbon Design System aesthetics with IBM Plex fonts

## Key Features

### Slate Management
- Create and manage betting slates with multiple games
- Upload screenshots for OCR-based game extraction
- Batch enrichment with Perplexity research
- CSV export of locked picks

### Per-Game Workspace
- Three-panel layout: Recommendation, Evidence/Why, Data Snapshots
- Lock/unlock picks for export
- Override recommendations with reason tracking
- Flag games for review

### Framework Builder
- Customizable weight sliders for analysis factors (QB, Defense, SOS, etc.)
- Conditional rules with enable/disable toggles
- Version history with restore capability
- Active framework selection

### Evidence System
- Perplexity-powered research with citations
- Categorized findings (QB, Injuries, Portal, Coaching, Motivation)
- Relevance scoring for each piece of evidence
- Source URL tracking for audit trails

## Project Structure
```
├── client/src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── app-sidebar.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── pages/           # Route pages
│   │   ├── slates.tsx         # Slate grid
│   │   ├── slate-detail.tsx   # Slate games table
│   │   ├── game-workspace.tsx # Per-game analysis
│   │   ├── frameworks.tsx     # Framework editor
│   │   ├── history.tsx        # Analysis history
│   │   └── settings.tsx       # App settings
│   ├── lib/             # Utilities
│   └── hooks/           # Custom hooks
├── server/
│   ├── services/        # Business logic
│   │   ├── ocr.ts       # OpenAI OCR extraction
│   │   └── perplexity.ts # Research with citations
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database operations
│   └── db.ts           # Drizzle connection
└── shared/
    └── schema.ts        # Database models & types
```

## API Routes

### Slates
- `GET /api/slates` - List all slates
- `POST /api/slates` - Create slate
- `GET /api/slates/:id` - Get slate details
- `PATCH /api/slates/:id` - Update slate
- `DELETE /api/slates/:id` - Delete slate
- `POST /api/slates/:id/enrich` - Run research on all games
- `GET /api/slates/:id/export` - Export locked picks as CSV

### Games
- `GET /api/slates/:slateId/games` - List games in slate
- `POST /api/slates/:slateId/games` - Add game
- `POST /api/slates/:slateId/games/batch` - Add multiple games
- `GET /api/games/:id` - Get game details
- `PATCH /api/games/:id` - Update game
- `POST /api/games/:id/lock` - Lock pick
- `POST /api/games/:id/unlock` - Unlock pick
- `POST /api/games/:id/override` - Override recommendation
- `POST /api/games/:id/research` - Run research for game

### Frameworks
- `GET /api/frameworks` - List frameworks
- `GET /api/frameworks/active` - Get active framework
- `POST /api/frameworks` - Create framework
- `PATCH /api/frameworks/:id` - Update framework
- `GET /api/frameworks/:id/rules` - Get framework rules
- `POST /api/frameworks/:id/rules` - Add rule
- `PATCH /api/framework-rules/:id` - Update rule

### OCR
- `POST /api/ocr/image` - Extract games from screenshot
- `POST /api/ocr/text` - Parse games from text

## Database Models
- **slates** - Betting slates with status tracking
- **games** - Individual games with picks and confidence
- **frameworks** - Analysis frameworks with weights
- **framework_rules** - Conditional rules
- **framework_versions** - Version history
- **evidence** - Research findings with citations
- **data_snapshots** - Point-in-time data captures
- **why_factors** - Analysis factor breakdowns
- **audit_log** - Change tracking

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `PERPLEXITY_API_KEY` - For research/evidence gathering
- `AI_INTEGRATIONS_OPENAI_API_KEY` - For OCR (managed by Replit)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (managed by Replit)

## Development
```bash
npm run dev          # Start development server
npm run db:push      # Push schema changes to database
```

## User Preferences
- Carbon Design System with professional, data-focused aesthetics
- IBM Plex Sans for UI, IBM Plex Mono for data
- Dark mode support
- Emphasis on transparency and audit trails
