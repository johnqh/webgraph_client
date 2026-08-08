import type {
  NextStepResponse,
  ObserveRequest,
  ObserveResponse,
  PlanResponse,
  RouteResponse,
  ViewRef,
} from './types.js';

export interface WebgraphClientOptions {
  baseUrl: string;
  apiKey: string;
  /** Injected so the SDK is testable without network access. */
  fetchImpl?: typeof fetch;
}

export class WebgraphClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WebgraphClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        ...(init?.headers ?? {}),
      },
    });
    return (await res.json()) as T;
  }

  createApp(body: {
    key: string;
    title?: string;
    entryUrlPath?: string;
    /**
     * The site this app is. Identity, not decoration: two consumers that send
     * the same host share one graph, which is the whole point of storing one.
     * Without it NO API traffic is captured either.
     *
     * Send it on EVERY registration — omitting it on a later call addresses a
     * different app.
     */
    host?: string;
  }) {
    // The returned key is canonical and may differ from the one sent. Use
    // `app.key` for every later call; a locally-invented key addresses a
    // private graph nobody else can contribute to.
    return this.request<{ app: { key: string } }>('/apps', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  observe(appKey: string, body: ObserveRequest) {
    return this.request<ObserveResponse>(`/apps/${appKey}/observations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  route(
    appKey: string,
    refs: { from?: ViewRef; to: ViewRef; maxDepth?: number }
  ) {
    return this.request<RouteResponse>(`/apps/${appKey}/route?${query(refs)}`);
  }

  /**
   * The single next hop toward a target.
   *
   * Callers loop observe -> nextStep -> execute -> observe. Re-planning is
   * implicit: each call plans from where the caller actually is, against a graph
   * the previous observation just updated.
   */
  nextStep(appKey: string, refs: { from?: ViewRef; to: ViewRef }) {
    return this.request<NextStepResponse>(
      `/apps/${appKey}/next-step?${query(refs)}`
    );
  }

  graph(appKey: string) {
    return this.request<{ views: unknown[]; transitions: unknown[] }>(
      `/apps/${appKey}/graph`
    );
  }

  /**
   * Forward a caller's query string to a read endpoint unchanged.
   *
   * Exists for API gateways that proxy these endpoints without re-typing them:
   * the typed helpers above build a query from refs, which is reshaping the
   * caller's request. `endpoint` is a closed set rather than a free string so a
   * caller cannot steer the path.
   */
  proxyGet(
    appKey: string,
    endpoint: 'graph' | 'route' | 'next-step',
    search: string
  ) {
    const qs = search ? `?${search}` : '';
    return this.request<unknown>(`/apps/${appKey}/${endpoint}${qs}`);
  }

  /**
   * Plan a route to a goal.
   *
   * The response may be `source: 'graph-fallback'` — the service returns a
   * plain graph route whenever the planner is absent, failed, or proposed an
   * action the graph could not verify. Callers should treat that as a weaker
   * plan, not an error.
   */
  plan(
    appKey: string,
    body: {
      goal: string;
      from?: ViewRef;
      maxDepth?: number;
      maxCandidates?: number;
      /**
       * Whether the caller already holds a session.
       *
       * Defaults to false server-side, which routes AROUND login walls. Set it
       * true only when a session really is held: a route planned through a
       * wall works for nobody else.
       */
      authenticated?: boolean;
      /**
       * What the caller is looking at right now.
       *
       * `contentMd` answers goals that depend on live data — "the cheapest
       * one" cannot come from what was stored at some past observation.
       *
       * `controls` additionally lets the plan ACT on this page even when the
       * graph has never recorded it. Supplying them is what makes a next step
       * possible on an unknown screen; the reply then has `source: "explore"`.
       */
      observed?: {
        contentMd?: string;
        urlPath?: string;
        controls?: Array<{ name: string; actionKind?: string }>;
      };
    }
  ) {
    return this.request<PlanResponse>(`/apps/${appKey}/plan`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Re-plan after hitting a problem, reporting what failed so the graph can
   * route around it for everyone.
   */
  replan(
    appKey: string,
    body: {
      goal: string;
      from: ViewRef;
      failed?: { transitionId?: number; controlName?: string; reason: string };
      maxDepth?: number;
      observed?: { contentMd?: string };
    }
  ) {
    return this.request<PlanResponse>(`/apps/${appKey}/replan`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

function query(refs: {
  from?: ViewRef;
  to: ViewRef;
  maxDepth?: number;
}): string {
  const params = new URLSearchParams();
  if (refs.from?.urlPath) params.set('fromUrlPath', refs.from.urlPath);
  if (refs.from?.signature) params.set('fromSignature', refs.from.signature);
  params.set('toUrlPath', refs.to.urlPath);
  if (refs.to.signature) params.set('toSignature', refs.to.signature);
  if (refs.maxDepth != null) params.set('maxDepth', String(refs.maxDepth));
  return params.toString();
}
