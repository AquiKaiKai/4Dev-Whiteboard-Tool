import type { Api } from "./api/types";
import { mockApi } from "./mock";

/** Switch implementations with VITE_API_MODE=mock|rest. Components import `api` only. */
function createApi(): Api {
  if (import.meta.env.VITE_API_MODE === "rest") {
    throw new Error("REST services are not implemented yet. Provide an Api implementation in services/rest.");
  }
  return mockApi;
}
export const api = createApi();
