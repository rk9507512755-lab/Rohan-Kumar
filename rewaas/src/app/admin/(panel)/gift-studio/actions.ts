"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { err, fail, fields, imageFrom, msg, ok, zBool, zInt, zOpt, zRupees, zText, type FormState } from "../../_lib/form";

export type Kind = "box" | "component" | "packaging";

const common = {
  name: zText("Name", 120),
  description: zText("Description", 1000),
  price: zRupees("Price"),
  sortOrder: zInt("Sort order", -1000, 100000),
  active: zBool,
};
const schemas = {
  box: z.object({ ...common, capacity: zInt("Capacity", 1, 100), dimensions: zOpt(80), stock: zInt("Stock", 0) }),
  component: z.object({ ...common, group: zText("Group", 60), maxPerHamper: zInt("Max per hamper", 1, 20), stock: zInt("Stock", 0) }),
  packaging: z.object({ ...common, description: zText("Description", 1000) }),
};

function done() {
  revalidatePath("/admin/gift-studio");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function saveGiftItem(kind: Kind, id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const wasNew = !id;
  const schema = schemas[kind];
  if (!schema) return err("Unknown item type.");
  const parsed = schema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  let image: string | null;
  try {
    image = await imageFrom(fd, "image");
  } catch (e) {
    return err(msg(e), { image: msg(e) });
  }
  if (!image && kind !== "packaging") return err("Please fix the highlighted fields.", { image: "Add an image (upload or URL)" });
  try {
    if (kind === "box") {
      const data = { ...(parsed.data as z.infer<typeof schemas.box>), image: image! };
      if (id) await db.hamperBox.update({ where: { id }, data });
      else id = (await db.hamperBox.create({ data })).id;
    } else if (kind === "component") {
      const data = { ...(parsed.data as z.infer<typeof schemas.component>), image: image! };
      if (id) await db.hamperComponent.update({ where: { id }, data });
      else id = (await db.hamperComponent.create({ data })).id;
    } else {
      const data = { ...(parsed.data as z.infer<typeof schemas.packaging>), image };
      if (id) await db.packagingOption.update({ where: { id }, data });
      else id = (await db.packagingOption.create({ data })).id;
    }
  } catch (e) {
    return err(msg(e));
  }
  done();
  if (wasNew) redirect(`/admin/gift-studio/${kind}/${id}`);
  return ok("Saved.");
}

export async function deleteGiftItem(kind: Kind, id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    if (kind === "box") await db.hamperBox.delete({ where: { id } });
    else if (kind === "component") await db.hamperComponent.delete({ where: { id } });
    else await db.packagingOption.delete({ where: { id } });
  } catch (e) {
    return err(msg(e));
  }
  done();
  redirect("/admin/gift-studio");
}
