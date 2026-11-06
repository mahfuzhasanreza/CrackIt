import type { DefaultTopic } from "./defaults";

/**
 * Topic outlines typed into a textarea, one topic per line, indented for subtopics:
 *
 *   Data Structures
 *     Arrays
 *     - Linked lists        ← "-", "*" or "•" bullets are optional
 *   System Design
 *
 * Indentation is relative (any consistent amount of spaces; a tab counts as 2), at most
 * `MAX_DEPTH + 1` levels, sibling names unique (case-insensitive) — the DB requires it.
 */

export const OUTLINE_MAX_DEPTH = 3; // same as MAX_TOPIC_DEPTH: Track › Area › Topic › Subtopic
export const OUTLINE_MAX_TOPICS = 300;
const MAX_NAME = 120;

export class OutlineError extends Error {}

export function parseOutline(text: string): DefaultTopic[] {
  const roots: DefaultTopic[] = [];
  // Open ancestors: indent width of the line and the node it created.
  const stack: { indent: number; node: DefaultTopic; siblings: DefaultTopic[] }[] = [];
  let count = 0;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/\t/g, "  ");
    if (!line.trim()) return;
    const indent = line.length - line.trimStart().length;
    const name = line
      .trim()
      .replace(/^[-*•]\s+/, "")
      .replace(/\s+/g, " ");
    const where = `Line ${i + 1}`;
    if (!name) return;
    if (name.length > MAX_NAME)
      throw new OutlineError(`${where}: keep topic names under ${MAX_NAME} characters.`);

    while (stack.length && stack.at(-1)!.indent >= indent) stack.pop();
    const depth = stack.length;
    if (depth > OUTLINE_MAX_DEPTH) {
      throw new OutlineError(
        `${where}: topics can be nested at most ${OUTLINE_MAX_DEPTH + 1} levels deep.`,
      );
    }
    const siblings = depth === 0 ? roots : (stack.at(-1)!.node.children ??= []);
    if (siblings.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      throw new OutlineError(`${where}: “${name}” is listed twice at the same level.`);
    }
    if (++count > OUTLINE_MAX_TOPICS) {
      throw new OutlineError(`At most ${OUTLINE_MAX_TOPICS} topics at once.`);
    }
    const node: DefaultTopic = { name };
    siblings.push(node);
    stack.push({ indent, node, siblings });
  });
  return roots;
}

/** The reverse, 2 spaces per level — used to prefill the textarea from a starter template. */
export function formatOutline(topics: DefaultTopic[], depth = 0): string {
  return topics
    .map((t) => {
      const line = `${"  ".repeat(depth)}${t.name}`;
      return t.children?.length ? `${line}\n${formatOutline(t.children, depth + 1)}` : line;
    })
    .join("\n");
}

export function countTopics(topics: DefaultTopic[]): number {
  return topics.reduce((n, t) => n + 1 + countTopics(t.children ?? []), 0);
}
