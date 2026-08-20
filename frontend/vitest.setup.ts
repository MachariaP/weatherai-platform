/**
 * jsdom's default URL is http://localhost:3000/. If a form submit is not
 * cancelled, jsdom navigates to the Next.js dev server and the worker hangs.
 */
import { afterEach, beforeEach } from "vitest";

function preventSubmitNavigation(event: Event) {
  event.preventDefault();
}

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("submit", preventSubmitNavigation, true);
  }
});

afterEach(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("submit", preventSubmitNavigation, true);
  }
});

if (typeof HTMLFormElement !== "undefined") {
  HTMLFormElement.prototype.submit = function submit() {
    /* no navigation in tests */
  };
}
