"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, rateLimit, startSession, verifyPassword } from "@/lib/auth";
import { emailSchema } from "@/lib/validators";
import { fail, err } from "./_lib/form";
import type { FormState } from "./_lib/types";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export async function adminLogin(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fail(parsed.error, "Please enter your email and password.");
  const { email, password } = parsed.data;
  if (!rateLimit(`admin-login:${email}`, 6)) return err("Too many attempts. Please wait 10 minutes and try again.");
  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid || user.role !== "ADMIN") return err("Incorrect email or password, or this account does not have admin access.");
  await startSession({ id: user.id, role: user.role, name: user.name });
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function adminLogout() {
  await endSession();
  redirect("/admin/login");
}
