export interface RouteHandle {
  title: string;
  /** When set, the crumb shows the named entity (looked up via the route param) instead of `title`. */
  entity?: "project" | "board";
}
