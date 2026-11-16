"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";
import { err, fail, fields, isUnique, msg, ok, zBool, zDate, zOpt, zOptInt, zOptRupees, type FormState } from "../../_lib/form";

const schema = z
  .object({
    code: z.string().trim().toUpperCase().min(3, "Code must be at least 3 characters").max(30).regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only"),
    description: zOpt(200),
    type: z.enum(["PERCENT", "FLAT"]),
    value: z.string().trim().min(1, "Enter a value"),
    minSubtotal: zOptRupees("Minimum order"),
    maxDiscount: zOptRupees("Maximum discount"),
    startsAt: zDate,
    endsAt: zDate,
    usageLimit: zOptInt("Usage limit", 1, 10_000_000),
    active: zBool,
  })
  .superRefine((d, ctx) => {
    const n = Number(d.value.replace(/[,₹\s]/g, ""));
    if (!Number.isFinite(n) || n <= 0) ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a positive number" });
    else if (d.type === "PERCENT" && (n > 90 || !Number.isInteger(n))) ctx.addIssue({ code: "custom", path: ["value"], message: "Percent must be a whole number from 1 to 90" });
    if (d.startsAt && d.endsAt && d.endsAt <= d.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be after the start date" });
  });

export async function saveCoupon(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = schema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const data = {
    code: d.code,
    description: d.description,
    type: d.type,
    value: d.type === "PERCENT" ? Math.round(Number(d.value)) : rupeesToPaise(d.value),
    minSubtotal: d.minSubtotal ?? 0,
    maxDiscount: d.type === "PERCENT" ? d.maxDiscount : null,
    startsAt: d.startsAt,
    // an end *date* means "through the end of that day"
    endsAt: d.endsAt ? new Date(d.endsAt.getTime() + 24 * 3600 * 1000 - 1000) : null,
    usageLimit: d.usageLimit,
    active: d.active,
  };
  let newId = id;
  try {
    if (id) await db.coupon.update({ where: { id }, data });
    else newId = (await db.coupon.create({ data })).id;
  } catch (e) {
    if (isUnique(e, "code")) return err("Please fix the highlighted fields.", { code: "This code already exists" });
    return err(msg(e));
  }
  revalidatePath("/admin/coupons");
  if (!id) redirect(`/admin/coupons/${newId}?saved=1`);
  return ok("Coupon saved.");
}

export async function deleteCoupon(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.coupon.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}
