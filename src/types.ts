/** Identifies one view of a web app: its path plus its control-shape signature. */
export interface ViewRef {
  urlPath: string;
  signature?: string;
}

export interface ControlInput {
  tag: string;
  role?: string;
  name?: string;
  /** click | fill | select | navigate | radio_select. Part of view identity. */
  actionKind?: string;
}

export interface RegionInput {
  key: string;
  role?: string;
  controls?: ControlInput[];
  children?: RegionInput[];
}

/**
 * One request a page made.
 *
 * Send the COMPLETE request. The service redacts at ingest and never stores a
 * header value, a body value, or a credential — only names, types and the
 * shape of the endpoint.
 */
export interface NetworkRequestInput {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
}

export interface ObserveRequest {
  urlPath: string;
  regions: RegionInput[];
  links?: { toUrlPath: string; label?: string }[];
  from?: { urlPath: string; signature: string } | null;
  trigger?: { kind: string; label?: string } | null;
  /** Title of the view, when the observer has one. */
  title?: string;
  /** Ordered heading text, for outline-first goal matching. */
  headings?: string[];
  /** Markdown projection of the view's content. Never HTML. */
  contentMd?: string;
  /** Traffic the page produced, for learning the app's API surface. */
  networkRequests?: NetworkRequestInput[];
}

export interface Transition {
  id: number;
  fromViewId: number;
  toViewId: number;
  toUrlPath: string;
  kind: 'declared' | 'observed';
  triggerKind: string;
  triggerLabel: string | null;
}

export interface ObserveResponse {
  observationId: number;
  view: { id: number; urlPath: string; signature: string; isNew: boolean };
  patterns: string[];
  variableRegions: string[];
  transitions: { observed: number; declaredUpserted: number; retired: number };
  suspectEmptyRender?: boolean;
  fromViewUnresolved?: boolean;
  truncated?: { regions: number };
  /** Endpoints learned from `networkRequests`, and entries skipped. */
  api?: { learned: number; skipped: number };
}

export interface RouteResponse {
  route: Transition[] | null;
  cost: number | null;
  reason?: string;
}

export interface NextStepResponse {
  transition: Transition | null;
  reason: string | null;
}

export type PlanAction =
  | {
      kind: 'goto';
      toUrlPath: string;
      toViewId: number | null;
      label: string | null;
    }
  | {
      kind: 'click';
      controlName: string;
      onViewId: number;
      toViewId: number | null;
      label: string | null;
      /**
       * Text identifying WHICH row, when the control repeats in a list. A list
       * has one control name however many rows it holds, so this is how a plan
       * says which one.
       */
      within?: string;
    }
  /** Typing never navigates, so there is no resulting view. */
  | {
      kind: 'fill';
      controlName: string;
      value: string;
      onViewId: number;
      within?: string;
    }
  /**
   * Call the app's own API instead of driving its interface.
   *
   * Ends a plan: nothing is known about what the interface shows afterwards.
   * `authHeaderNames` are the headers whose values were withheld — the caller
   * must supply a live one for each, which is what makes an authenticated
   * replay possible. `bodyJson` is the planner's draft and is NOT verified
   * against the graph, exactly as a fill's value is not.
   *
   * A consumer that cannot issue HTTP requests must SKIP these rather than
   * treat them as a control: they carry no controlName and no target path.
   */
  | {
      kind: 'call';
      endpointId: number;
      method: string;
      url: string;
      bodyJson?: string;
      authHeaderNames: string[];
    };

export interface PlanResponse {
  startView: { id: number; urlPath: string; signature: string } | null;
  actions: PlanAction[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  /**
   * `explore` means the plan acts on the page the caller reported seeing
   * rather than on a recorded route — verified against the controls they
   * supplied, not against the graph. `startView` then describes where they
   * already are, and there is no approach to walk.
   */
  source: 'llm' | 'graph-fallback' | 'explore';
}
