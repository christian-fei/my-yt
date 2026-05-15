// Silence Lit dev mode warnings in CI/testing.
// @open-wc/testing re-exports `html` from lit-html, which loads Lit and
// emits the dev-mode warning. This setup file runs before all tests.

if (typeof window !== 'undefined') {
  // https://lit.dev/msg/dev-mode — set to 0 in production/testing.
  window.LIT_MODE = 0
}
