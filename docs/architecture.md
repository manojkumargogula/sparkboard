# Architecture

## Request path

```mermaid
sequenceDiagram
  participant U as Browser
  participant E as Edge (Vercel CDN / Ingress + nginx)
  participant A as API (FastAPI)
  participant D as Postgres

  U->>E: GET /            (SPA, cached assets)
  U->>E: GET /api/ideas?sort=trending  (X-Device-Token)
  E->>A: proxied / rewritten
  A->>D: SELECT ideas + "voted by me" (EXISTS subquery)
  D-->>A: rows
  A-->>U: JSON array (X-Next-Offset when another page exists)
  U->>E: PUT /api/ideas/7/vote (optimistic UI already updated)
  A->>D: INSERT vote ON CONFLICT DO NOTHING; UPDATE vote_count
  A-->>U: {vote_count, voted}
```

## API layering

Each layer has one job, and dependencies only point downward.

```
api/routers/*     HTTP shape: params, status codes, dependencies (rate limits, identity, admin)
services/*        use-cases and transactions; raise domain errors (NotFoundError)
repositories/*    every SQL statement lives here
models.py         SQLAlchemy tables      schemas.py   Pydantic contracts (validation at the edge)
ai/*              LLMProvider protocol → anthropic | openai-compatible | null
core/*            config, db engine, logging, rate limiter, device-token hashing
```

`create_app(settings)` is a factory, so tests build an isolated app per test against a real Postgres. Nothing reads global state.

## Data model

```mermaid
erDiagram
  authors ||--o{ ideas : posts
  authors ||--o{ votes : casts
  authors ||--o{ comments : writes
  ideas ||--o{ votes : receives
  ideas ||--o{ comments : has

  ideas {
    int id PK
    text content "3..1000 chars (brief: required)"
    timestamptz created_at "(brief: required)"
    varchar title "optional headline"
    varchar[] tags "GIN index"
    idea_status status "open|planned|building|shipped"
    uuid author_id FK "nullable: anonymous posts allowed"
    int vote_count "denormalised for fast sorting"
    int comment_count
  }
  votes {
    int id PK
    int idea_id FK
    uuid author_id FK
  }
  authors {
    uuid id PK
    char device_hash "sha256 of the device token, unique"
    varchar display_name
    varchar avatar_seed
  }
```

There is a unique constraint on `votes(idea_id, author_id)`. The `pg_trgm` GIN index on `ideas.content` powers search and duplicate detection.

## Deploy sequence (production, Vercel)

```mermaid
sequenceDiagram
  participant GH as GitHub Actions
  participant AI as aiops (Claude)
  participant V as Vercel
  participant N as Neon

  GH->>GH: CI quality gates
  GH->>V: smoke current production → baseline.json
  GH->>N: alembic upgrade head (direct connection, backward-compatible)
  GH->>V: vercel deploy --prebuilt --prod --skip-domain
  GH->>V: smoke new deployment URL → current.json
  GH->>V: vercel logs → runtime.log
  GH->>AI: health(current, baseline, logs)
  alt SLOs ok and AI not confidently unhealthy
    GH->>V: vercel promote (domain moves, zero downtime)
  else breach or AI ≥ 0.8 confident it's broken
    GH->>GH: domain never moved · open incident issue with AI summary · fail run
  end
```

## Deploy sequence (Kubernetes, any cloud)

```mermaid
sequenceDiagram
  participant GH as GitHub Actions
  participant C as Cloud (OIDC)
  participant TF as Terraform
  participant K as Cluster
  participant AI as aiops

  GH->>C: federated login (no static keys)
  GH->>C: docker push registry_url/sparkboard-{api,web}:SHA
  GH->>TF: apply (image_tag=SHA, generated tfvars)
  TF->>K: helm_release (atomic): migrate Job hook → rolling update
  Note over K: failed rollout ⇒ Helm rolls back by itself
  GH->>K: probe ingress + kubectl logs
  GH->>AI: health gate
  alt unhealthy
    GH->>K: helm rollback · incident issue
  end
```
