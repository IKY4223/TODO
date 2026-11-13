// Runs before the page is painted, so a light theme does not flash dark first. The app's own
// copy of this choice is src/theme.ts, which takes over once it loads; keep the two in step.
try {
  const saved = window.localStorage.getItem('theme')
  const light =
    saved === 'light' ||
    (saved !== 'dark' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
} catch {
  // Storage blocked: the app decides once it loads.
}
