import type {
  NextStepResponse,
  ObserveRequest,
  ObserveResponse,
  RouteResponse,
  ViewRef,
} from './types';

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

  createApp(body: { key: string; title?: string; entryUrlPath?: string }) {
    return this.request<{ app: unknown }>('/apps', {
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
