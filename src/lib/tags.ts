import { err, ok, type Result } from "@/lib/result";

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 32;
const TAG = /^[\p{L}\p{N}][\p{L}\p{N} +#./-]*$/u;

/** Canonical form: trimmed, lower-case, single spaces, no leading "#". */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** "React, #hooks,  system design" → ["react", "hooks", "system design"]. */
export function parseTags(raw: string): Result<string[]> {
  const tags = [...new Set(raw.split(/[,\n]/).map(normalizeTag).filter(Boolean))];
  if (tags.length > MAX_TAGS) return err("VALIDATION", `Use at most ${MAX_TAGS} tags.`);
  for (const tag of tags) {
    if (tag.length > MAX_TAG_LENGTH) {
      return err(
        "VALIDATION",
        `"${tag.slice(0, 20)}…" is longer than ${MAX_TAG_LENGTH} characters.`,
      );
    }
    if (!TAG.test(tag)) {
      return err(
        "VALIDATION",
        `"${tag}" has unsupported characters (letters, numbers, + # . / -).`,
      );
    }
  }
  return ok(tags);
}
