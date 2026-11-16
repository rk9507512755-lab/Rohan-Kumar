import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { one, type SP } from "../../../_lib/query";
import { categoryTree } from "../../../_lib/categories";
import ProductForm from "../../../_components/ProductForm";
import ProductImages from "../../../_components/ProductImages";
import ProductVariants from "../../../_components/ProductVariants";
import { ActionButton } from "../../../_components/forms";
import { PageHeader } from "../../../_components/ui";
import { deleteProduct, saveProduct } from "../actions";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const [product, categories, orderCount] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }, variants: { orderBy: [{ colour: "asc" }, { size: "asc" }] } } }),
    categoryTree(),
    db.orderItem.count({ where: { productId: id } }),
  ]);
  if (!product) notFound();
  const skuBase = `RW-${product.slug.split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 6)}`;
  return (
    <>
      <PageHeader
        title={product.name}
        back={{ href: "/admin/products", label: "Products" }}
        description={orderCount ? `Ordered ${orderCount} time${orderCount === 1 ? "" : "s"}` : "Not ordered yet"}
        actions={
          <>
            <Link href={`/products/${product.slug}`} target="_blank" className="btn-outline btn-sm">
              View in store ↗
            </Link>
            <ActionButton
              action={deleteProduct.bind(null, product.id)}
              confirm={orderCount ? "This product has orders, so it will be archived (hidden) instead of deleted. Continue?" : "Delete this product permanently? This cannot be undone."}
              className="admin-danger px-2"
            >
              {orderCount ? "Archive product" : "Delete product"}
            </ActionButton>
          </>
        }
      />
      {one(sp.created) && <p className="mb-4 border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Product created. Now add its variants and more images below.</p>}
      <div className="space-y-4">
        <ProductVariants productId={product.id} variants={product.variants} skuBase={skuBase} />
        <ProductImages productId={product.id} images={product.images} />
        <ProductForm action={saveProduct.bind(null, product.id)} product={product} categories={categories} />
      </div>
    </>
  );
}
