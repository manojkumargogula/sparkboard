# Product

Sparkboard keeps the original brief's contract exactly (`GET /api/ideas`, `POST /api/ideas` with `{"content": "..."}`, and an `ideas` table with `id, content, created_at`) and builds a consumer-grade product around it.

## Features

- **The landing page is the product.** Night and paper sections on a drafting grid, huge uppercase grotesk type, one cobalt accent. The hero prints the three most-wanted ideas as perforated tickets, and the "sticker" stats are computed live from the board.
- **Top 10.** The most-voted ideas as a ranked grid, each with a topic, rank, votes and a **heat score** (0–100, from votes and discussion).
- **All ideas table.** Search, topic and status filters, and Heat / Rising / Newest sorting, all kept in the URL so every view is shareable. One vote per person is enforced in the database. Votes update instantly with a spark burst, and confetti fires at 10 / 25 / 50 / 100 votes.
- **Problems worth solving.** 114 curated problem statements across 20 industries (`apps/api/data/problems.json`, loaded by `python -m sparkboard_api.importers.problems`, safe to re-run). They start at zero votes, so the board's users re-rank them.
- **Duplicates caught while typing.** The composer shows similar ideas as you type (Postgres trigram similarity), so people vote instead of reposting.
- **AI "Sharpen".** One click suggests a clearer headline, a tighter description and tags, which you accept or dismiss. Hidden when no AI key is configured.
- **Idea sheet.** A shareable `/i/:id` side sheet (a bottom sheet on phones) with discussion and native share.
- **Roadmap.** Open → Planned → Building → Shipped. Status changes are admin-only (`X-Admin-Token`).
- **Keyboard first.** `N` posts an idea; `/` or `⌘K` opens the command palette.
- **Continue with Google.** In production (`AUTH_REQUIRED=true`) posting, voting and commenting need a Google account, so every vote is one real person. Google One Tap appears on the first visit. The API verifies the Google ID token's signature, audience, issuer, expiry and verified email; no client secret is involved. An anonymous profile is upgraded in place on sign-in, so its votes carry over. Reading stays public. With `AUTH_REQUIRED=false` (the local default) anonymous display names work, which keeps the brief's plain `curl` contract.
- **Polish.** Staggered reveals, skeletons, designed empty and error states, reduced-motion support, a PWA manifest, an OG card and a 390 px-first responsive layout.

## Tech stack

| Part | Stack |
|---|---|
| Web | React 19, TypeScript (strict), Vite, Tailwind v4, Motion, TanStack Query, Radix, cmdk. Fonts: Host Grotesk, Anton, JetBrains Mono |
| API | FastAPI, SQLAlchemy 2 (async) + asyncpg, Alembic, Pydantic v2, PyJWT |
| Database | PostgreSQL 17 (Neon in production) |
