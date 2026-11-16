import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminShell from "../_components/AdminShell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [pendingReturns, newOrders] = await Promise.all([
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.order.count({ where: { status: "CONFIRMED" } }),
  ]);
  return (
    <AdminShell userName={user.name} userEmail={user.email} badges={{ "/admin/returns": pendingReturns, "/admin/orders": newOrders }}>
      {children}
    </AdminShell>
  );
}
