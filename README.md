# @sudobility/webgraph_client

Client SDK for [`webgraph_api`](https://github.com/johnqh/webgraph_api) — the
knowledge-graph service for web applications.

Wraps the observation and routing endpoints:

- `observe(...)` — report a view (URL, region tree, visible links, how you got there)
- `route(...)` — full ordered route between two views
- `nextStep(...)` — the single next hop, for callers that re-plan as they go
- `graph(...)` — views and transitions, for visualization

## Status

Design approved, implementation not started. The design lives in the service repo.

## Stack

TypeScript (strict), Bun. Dependency-injected network client, no direct `fetch`.
