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
    };

export interface PlanResponse {
  startView: { id: number; urlPath: string; signature: string } | null;
  actions: PlanAction[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  source: 'llm' | 'graph-fallback';
}
