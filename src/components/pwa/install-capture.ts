/**
 * Inline script for the root layout: keeps the browser's install prompt if it fires before the
 * app's JavaScript loads; `install-prompt.ts` picks it up. Plain module (the layout is a
 * Server Component). Keep it tiny and dependency-free.
 */
export const EARLY_CAPTURE = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__crackitInstallPrompt=e;});addEventListener("appinstalled",function(){window.__crackitInstallPrompt=null;});`;
