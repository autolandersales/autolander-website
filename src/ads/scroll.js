// Smooth scrolls honour the visitor's reduced-motion setting: 'auto' follows index.css, which turns smooth
// scrolling off under prefers-reduced-motion. A local copy (src/ai/scroll.js is the same), so this chunk imports
// nothing from the AEO page.
export const scrollBehavior = () => (typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
