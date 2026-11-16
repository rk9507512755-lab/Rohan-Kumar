"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone, phoneSchema } from "@/lib/validators";
import { err, fail, fields, ok, zText, type FormState } from "../../_lib/form";

export async function updateCustomer(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z.object({ name: zText("Name", 80), phone: phoneSchema.optional().or(z.literal("")) }).safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  await db.user.update({ where: { id }, data: { name: parsed.data.name, phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null } });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return ok("Customer updated.");
}

export async function setRole(id: string, role: "ADMIN" | "CUSTOMER", _prev: FormState, _fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (me.id === id && role !== "ADMIN") return err("You can't remove your own admin access.");
  if (role === "CUSTOMER") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return err("There must be at least one admin.");
  }
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return ok(role === "ADMIN" ? "This user is now an admin." : "Admin access removed.");
}
