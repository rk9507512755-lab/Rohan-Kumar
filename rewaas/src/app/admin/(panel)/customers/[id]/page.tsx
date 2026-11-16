import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { fmtDate } from "@/lib/utils";
import { ActionButton, ActionForm, Submit } from "../../../_components/forms";
import { Section, TextField } from "../../../_components/fields";
import { Empty, OrderStatusPill, PageHeader, PaymentPill, Pill } from "../../../_components/ui";
import { setRole, updateCustomer } from "../actions";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }, orders: { orderBy: { createdAt: "desc" } }, _count: { select: { wishlistItems: true, reviews: true, returns: true } } },
  });
  if (!user) notFound();
  const spent = user.orders.filter((o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED").reduce((a, o) => a + o.total, 0);
  const isMe = me.id === user.id;

  return (
    <>
      <PageHeader
        title={user.name}
        back={{ href: "/admin/customers", label: "Customers" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {user.email} · joined {fmtDate(user.createdAt)} {user.role === "ADMIN" && <Pill tone="info">Admin</Pill>}
          </span>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Orders", user.orders.length],
          ["Total spent", inr(spent)],
          ["Wishlist", user._count.wishlistItems],
          ["Returns", user._count.returns],
        ].map(([l, v]) => (
          <div key={l} className="admin-card !p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">{l}</p>
            <p className="mt-1 font-display text-2xl">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Order history">
            {user.orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <div className="admin-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="text-wine hover:underline">
                            {o.number}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap text-ink-400">{fmtDate(o.createdAt)}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            <OrderStatusPill status={o.status} />
                            <PaymentPill status={o.paymentStatus} />
                          </div>
                        </td>
                        <td className="text-right tabular-nums">{inr(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
          <Section title={`Saved addresses (${user.addresses.length})`}>
            {user.addresses.length === 0 ? (
              <p className="text-sm text-ink-400">No saved addresses.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {user.addresses.map((a) => (
                  <li key={a.id} className="border border-ink-200/70 p-3 text-sm leading-relaxed">
                    <p className="font-medium">
                      {a.name} {a.isDefault && <Pill tone="good">Default</Pill>}
                    </p>
                    <p>
                      {a.line1}
                      {a.line2 && `, ${a.line2}`}
                    </p>
                    {a.landmark && <p>Near {a.landmark}</p>}
                    <p>
                      {a.city}, {a.state} {a.pincode}
                    </p>
                    <p className="text-ink-400">{a.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Profile">
            <ActionForm action={updateCustomer.bind(null, user.id)} className="space-y-3">
              <TextField name="name" label="Name" defaultValue={user.name} required />
              <TextField name="phone" label="Phone" type="tel" defaultValue={user.phone} />
              <p className="text-xs text-ink-400">
                Email: {user.email}
                <br />
                Marketing emails: {user.marketingOptIn ? "opted in" : "not opted in"}
              </p>
              <Submit>Save</Submit>
            </ActionForm>
          </Section>
          <Section title="Access" description={user.role === "ADMIN" ? "This account can sign in to the admin panel." : "Regular customer account."}>
            {isMe ? (
              <p className="text-sm text-ink-400">This is your account — you can&apos;t change your own role.</p>
            ) : user.role === "ADMIN" ? (
              <ActionButton action={setRole.bind(null, user.id, "CUSTOMER")} confirm={`Remove admin access from ${user.name}?`} className="admin-danger">
                Remove admin access
              </ActionButton>
            ) : (
              <ActionButton action={setRole.bind(null, user.id, "ADMIN")} confirm={`Give ${user.name} full admin access? They will be able to manage orders, products and settings.`}>
                Make admin
              </ActionButton>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
