# Graph Report - .  (2026-07-08)

## Corpus Check
- Corpus is ~16,332 words - fits in a single context window. You may not need a graph.

## Summary
- 320 nodes · 467 edges · 26 communities (21 shown, 5 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Pages|Frontend Pages]]
- [[_COMMUNITY_Backend API & Models|Backend API & Models]]
- [[_COMMUNITY_Auth Module|Auth Module]]
- [[_COMMUNITY_Business CRUD Endpoints|Business CRUD Endpoints]]
- [[_COMMUNITY_Decision Engine|Decision Engine]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Salt Edge Integration|Salt Edge Integration]]
- [[_COMMUNITY_App Layout & Error Handling|App Layout & Error Handling]]
- [[_COMMUNITY_Vercel Deployment Config|Vercel Deployment Config]]
- [[_COMMUNITY_App Settings & Config|App Settings & Config]]
- [[_COMMUNITY_Dashboard Form Component|Dashboard Form Component]]
- [[_COMMUNITY_OpenCode Config|OpenCode Config]]
- [[_COMMUNITY_E2E Auth Test|E2E Auth Test]]
- [[_COMMUNITY_OpenCode Plugin Deps|OpenCode Plugin Deps]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 19 edges
2. `compilerOptions` - 16 edges
3. `evaluate_purchase()` - 15 edges
4. `Salt Edge Migration Initiative` - 13 edges
5. `FastAPI Backend` - 11 edges
6. `fmt()` - 10 edges
7. `SQLAlchemy Async ORM` - 10 edges
8. `register()` - 8 edges
9. `evaluate()` - 8 edges
10. `Salt Edge API Router` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Auth Dependencies` ----> `FastAPI Backend`  [INFERRED]
  backend/app/api/deps.py → AGENTS.md
- `Salt Edge Migration Initiative` ----> `Plaid API Router (Deleted)`  [EXTRACTED]
  docs/superpowers/plans/2026-07-08-salt-edge-migration.md → backend/app/api/plaid.py
- `Salt Edge Migration Initiative` ----> `Plaid Service (Deleted)`  [EXTRACTED]
  docs/superpowers/plans/2026-07-08-salt-edge-migration.md → backend/app/services/plaid_service.py
- `Salt Edge Migration Initiative` ----> `Plaid Link Button (Deleted)`  [EXTRACTED]
  docs/superpowers/plans/2026-07-08-salt-edge-migration.md → frontend/src/components/PlaidLinkButton.tsx
- `Salt Edge Migration Initiative` ----> `Salt Edge API Router`  [INFERRED]
  docs/superpowers/plans/2026-07-08-salt-edge-migration.md → backend/app/api/saltedge.py

## Import Cycles
- None detected.

## Communities (26 total, 5 thin omitted)

### Community 0 - "Frontend Pages"
Cohesion: 0.08
Nodes (35): Dashboard(), Result, LoginPage(), RegisterPage(), OnboardingPage(), childVariants, decisionColors, decisionIcon (+27 more)

### Community 1 - "Backend API & Models"
Cohesion: 0.07
Nodes (41): Backend Requirements, Business REST API, Plaid API Router (Deleted), Async Database Session, FastAPI App Entrypoint, Business SQLAlchemy Model, Transaction SQLAlchemy Model, Business Pydantic Schema (+33 more)

### Community 2 - "Auth Module"
Cohesion: 0.08
Nodes (32): login(), AsyncSession, register(), get_current_user(), AsyncSession, User, evaluate(), AsyncSession (+24 more)

### Community 3 - "Business CRUD Endpoints"
Cohesion: 0.08
Nodes (21): Auth Dependencies, get_my_business(), AsyncSession, User, update_my_business(), list_transactions(), AsyncSession, User (+13 more)

### Community 4 - "Decision Engine"
Cohesion: 0.09
Nodes (31): _calc_daily_rate(), evaluate_purchase(), _generate_synthetic_data(), Any, check_reason_has_numbers(), Accuracy tests for the decision engine.  Each test case defines a scenario and a, $3k cash, $0 reserve, net positive → buy $2k should be YES (no reserve constrain, $12k cash, $5k reserve, net flat → buy $6k should be YES (stays above reserve). (+23 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, framer-motion, lucide-react, next, react, react-dom, react-plaid-link, recharts (+20 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Salt Edge Integration"
Cohesion: 0.30
Nodes (14): ConnectSessionResponse, get_connect_session(), import_transactions(), AsyncSession, User, store_connection(), create_connect_session(), create_customer() (+6 more)

### Community 8 - "App Layout & Error Handling"
Cohesion: 0.20
Nodes (6): geistSans, metadata, ErrorBoundary, Props, State, AuthProvider()

### Community 9 - "Vercel Deployment Config"
Cohesion: 0.25
Nodes (7): root, framework, root, rewrites, services, backend, frontend

### Community 10 - "App Settings & Config"
Cohesion: 0.33
Nodes (4): Config, Settings, BaseSettings, eslintConfig

### Community 12 - "OpenCode Config"
Cohesion: 0.40
Nodes (4): plugin, $schema, skills, paths

## Knowledge Gaps
- **100 isolated node(s):** `$schema`, `paths`, `plugin`, `@opencode-ai/plugin`, `Config` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SQLAlchemy Async ORM` connect `Business CRUD Endpoints` to `Backend API & Models`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **Why does `Salt Edge Connect Button` connect `Backend API & Models` to `Frontend Pages`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Why does `Bank Settings Page` connect `Frontend Pages` to `Backend API & Models`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `evaluate_purchase()` (e.g. with `evaluate()` and `test_chart_data_monotonic()`) actually correct?**
  _`evaluate_purchase()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Salt Edge Migration Initiative` (e.g. with `Salt Edge API Router` and `Salt Edge Connect Button`) actually correct?**
  _`Salt Edge Migration Initiative` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `paths`, `plugin` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07890070921985816 - nodes in this community are weakly interconnected._