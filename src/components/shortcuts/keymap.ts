/** Global keyboard shortcuts. "g" then a letter goes to a page (like GitHub / Gmail). */

export const GO_TO: { key: string; href: string; label: string }[] = [
  { key: "d", href: "/dashboard", label: "Dashboard" },
  { key: "t", href: "/timer", label: "Timer" },
  { key: "l", href: "/timeline", label: "Timeline" },
  { key: "j", href: "/journal", label: "Journal" },
  { key: "o", href: "/topics", label: "Topics" },
  { key: "c", href: "/checklists", label: "Checklists" },
  { key: "p", href: "/problems", label: "Problems" },
  { key: "k", href: "/projects", label: "Projects" },
  { key: "u", href: "/lecturer", label: "Lecturer" },
  { key: "r", href: "/resources", label: "Resources" },
  { key: "a", href: "/applications", label: "Applications" },
  { key: "i", href: "/interviews", label: "Interviews" },
  { key: "y", href: "/analytics", label: "Analytics" },
  { key: "s", href: "/settings", label: "Settings" },
];

export const ACTIONS: { keys: string[]; label: string }[] = [
  { keys: ["s"], label: "Stop the running timer (or open the timer)" },
  { keys: ["?"], label: "Show these shortcuts" },
];

export type ShortcutCommand =
  { type: "navigate"; href: string } | { type: "timer" } | { type: "help" };

/** How long after "g" the second key still counts. */
export const SEQUENCE_MS = 1500;

/**
 * Pure key-sequence matcher. Feed it keys (with a timestamp); it returns a command when a
 * shortcut completes. "g" arms the go-to prefix; anything else cancels it.
 */
export function createMatcher() {
  let armedAt: number | null = null;
  return (key: string, at: number): ShortcutCommand | null => {
    const armed = armedAt !== null && at - armedAt <= SEQUENCE_MS;
    armedAt = null;
    if (armed) {
      const target = GO_TO.find((g) => g.key === key.toLowerCase());
      return target ? { type: "navigate", href: target.href } : null;
    }
    if (key === "g") {
      armedAt = at;
      return null;
    }
    if (key === "?") return { type: "help" };
    if (key === "s") return { type: "timer" };
    return null;
  };
}

/** Keys typed into fields, or with modifiers, are never shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
