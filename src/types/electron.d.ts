import type { RendererApi } from "../shared/types";

declare global {
  interface Window {
    observer: RendererApi;
  }
}

export {};
