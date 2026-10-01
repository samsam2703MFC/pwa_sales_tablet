// Vitest setup: jsdom has no layout, so window.scrollTo is a no-op instead of a "Not implemented" error log.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
