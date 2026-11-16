import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import HeaderClient, { type NavItem } from "./HeaderClient";

export default async function Header() {
  const [menu, announcements, session] = await Promise.all([
    db.menuItem.findMany({ where: { parentId: null, active: true }, orderBy: { sortOrder: "asc" }, include: { children: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }),
    db.announcement.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSession(),
  ]);
  const nav: NavItem[] = menu.map((m) => ({ label: m.label, href: m.href, image: m.image, children: m.children.map((c) => ({ label: c.label, href: c.href })) }));
  return <HeaderClient nav={nav} announcements={announcements.map((a) => ({ text: a.text, href: a.href }))} userName={session?.name ?? null} />;
}
