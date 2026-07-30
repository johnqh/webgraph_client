/**
 * Client SDK for webgraph_api.
 *
 * Implementation follows the design in the service repo; this module currently
 * exports only the shared identity type so consumers can compile against it.
 */

/** Identifies one view of a web app: its path plus its control-shape signature. */
export interface ViewRef {
  urlPath: string;
  signature: string;
}
