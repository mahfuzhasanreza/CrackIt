/** Flatten a topic tree into select options labelled "Parent › Child", in tree order. */
export type TopicNode = { id: string; parentId: string | null; name: string; sortOrder: number };
export type TopicOption = { id: string; label: string; depth: number };

export function buildTopicOptions(topics: TopicNode[]): TopicOption[] {
  const children = new Map<string | null, TopicNode[]>();
  for (const t of topics) {
    const list = children.get(t.parentId) ?? [];
    list.push(t);
    children.set(t.parentId, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const out: TopicOption[] = [];
  const visit = (parentId: string | null, prefix: string, depth: number) => {
    for (const t of children.get(parentId) ?? []) {
      const label = prefix ? `${prefix} › ${t.name}` : t.name;
      out.push({ id: t.id, label, depth });
      visit(t.id, label, depth + 1);
    }
  };
  visit(null, "", 0);
  return out;
}
