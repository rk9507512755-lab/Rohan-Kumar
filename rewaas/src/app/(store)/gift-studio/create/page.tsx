import type { Metadata } from "next";
import HamperBuilder from "@/components/gift/HamperBuilder";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Create Your Own Hamper",
  description: "Build a personalised REWAAS gift hamper: choose a keepsake box, fill it with treasures, add a handwritten message and pick your wrapping.",
  alternates: { canonical: "/gift-studio/create" },
};

export default async function CreateHamperPage() {
  const [boxes, components, packaging] = await Promise.all([
    db.hamperBox.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.hamperComponent.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }] }),
    db.packagingOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="container-site py-10 lg:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">REWAAS Gift Studio</p>
        <h1 className="h-display mt-3">Create Your Own Hamper</h1>
        <p className="lead mt-4">Compose a gift that feels entirely theirs — every piece chosen by you, wrapped by hand in our Jaipur studio.</p>
      </div>
      <HamperBuilder
        boxes={boxes.map((b) => ({ id: b.id, name: b.name, description: b.description, image: b.image, price: b.price, capacity: b.capacity, dimensions: b.dimensions, stock: b.stock }))}
        components={components.map((c) => ({ id: c.id, name: c.name, description: c.description, group: c.group, image: c.image, price: c.price, stock: c.stock, max: c.maxPerHamper }))}
        packaging={packaging.map((p) => ({ id: p.id, name: p.name, description: p.description, price: p.price }))}
      />
    </div>
  );
}
