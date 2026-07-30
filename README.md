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

## Server-side only

This SDK takes an API key in its constructor, so it is meant to run on a server.
**Do not use it in a browser.** The key grants full read and write access to an
app's graph; shipping it to a browser hands that to every visitor.

Frontends should call their own backend, which holds the key and proxies to
`webgraph_api`.
