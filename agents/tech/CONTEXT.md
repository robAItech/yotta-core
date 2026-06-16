# ⚙️ Tech — CONTEXT

## Tehnični sklad Yotta Core

```
┌──────────────────────────────────┐
│         YOTTA CORE DASHBOARD      │
│  React SPA (admin/dist/)         │
├──────────────────────────────────┤
│         EXPRESS SERVER            │
│  serve.mjs (port 3100)          │
├──────────────────────────────────┤
│         PGLite DATABASE           │
│  File-based PostgreSQL W/ seed    │
├──────────────────────────────────┤
│         OS / INFRA                │
│  Node.js (Bun) - WSL/Linux       │
└──────────────────────────────────┘
```

## GBrain
- Express.js + PGLite
- Port 3100
- Auth: password → session token
- 8 PGLite tables

## GStack
- AI agent orchestration layer
- GSTACK loop: Spomin → Načrt → Izvedba → Zapis
- Vodeno prek Yotta Core agentov

## Hermes Agenti
- AI agenti za vsako poslovno funkcijo
- Vsak agent ima AGENT.md + TOOLS.md + CONTEXT.md
- Komunicirajo prek Yotta Core API-ja

## Graphfy
- Arhitekturni spomin sistema
- Skenira kodo in generira graf odvisnosti
- Shranjuje v graph.json

## Skills
- Modularne sposobnosti agentov
- Vsak skill je samostojna enota
- Se dinamično nalagajo
