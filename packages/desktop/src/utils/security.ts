// ═══════════════════════════════════════════════════════════════
// Security Guard — Production-only DevTools & Source Protection
// ═══════════════════════════════════════════════════════════════

export function initSecurityGuard() {
  // Only enforce in production
  if (import.meta.env.DEV) return;

  // 1. Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 2. Block right-click context menu
  document.addEventListener('contextmenu', (e: Event) => {
    e.preventDefault();
    return false;
  });

  // 3. Debugger trap — makes DevTools painful to use
  (function antiDebug() {
    setInterval(() => {
      const start = performance.now();
      // This triggers a breakpoint if DevTools is open
      (function() { return false; })['constructor']('debugger')();
      const elapsed = performance.now() - start;
      // If debugger was hit (DevTools open), elapsed > 100ms
      if (elapsed > 100) {
        // DevTools detected — could log, redirect, or just silently continue
        console.clear();
      }
    }, 3000);
  })();
}
