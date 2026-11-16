import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ShopProvider from "@/components/ShopProvider";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { cartCount } from "@/lib/cart";
import { getOwner } from "@/lib/visitor";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwner();
  const [count, wish, settings] = await Promise.all([
    cartCount(),
    owner.userId || owner.visitorId
      ? db.wishlistItem.findMany({ where: owner.userId ? { userId: owner.userId } : { visitorId: owner.visitorId }, select: { productId: true } })
      : Promise.resolve([]),
    getSettings(),
  ]);
  return (
    <ShopProvider initialCount={count} initialWishlist={wish.map((w) => w.productId)}>
      <Header />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton number={settings.whatsappNumber} />
    </ShopProvider>
  );
}
