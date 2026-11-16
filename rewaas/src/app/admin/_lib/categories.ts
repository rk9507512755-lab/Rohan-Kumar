import "server-only";
import { db } from "@/lib/db";

export type CatNode = { id: string; name: string; slug: string; parentId: string | null; sortOrder: number; depth: number; path: string };

/** All categories flattened in tree order, with a "Parent › Child" path label. */
export async function categoryTree(): Promise<CatNode[]> {
  const all = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, parentId: true, sortOrder: true } });
  const out: CatNode[] = [];
  const walk = (parentId: string | null, depth: number, prefix: string, seen: Set<string>) => {
    for (const c of all.filter((x) => x.parentId === parentId)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const path = prefix ? `${prefix} › ${c.name}` : c.name;
      out.push({ ...c, depth, path });
      walk(c.id, depth + 1, path, seen);
    }
  };
  walk(null, 0, "", new Set());
  // orphans (parent missing) at the end
  for (const c of all) if (!out.find((o) => o.id === c.id)) out.push({ ...c, depth: 0, path: c.name });
  return out;
}
