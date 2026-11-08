import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom lacks these browser APIs.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  }),
});

class IO {
  observe = () => undefined;
  disconnect = () => undefined;
  unobserve = () => undefined;
  takeRecords = () => [];
}
Object.defineProperty(window, "IntersectionObserver", { writable: true, value: IO });

window.scrollTo = () => undefined;
Element.prototype.scrollIntoView = () => undefined;
Object.defineProperty(window, "ResizeObserver", { writable: true, value: IO });
