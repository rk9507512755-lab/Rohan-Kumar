import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { categoryTree } from "../../../_lib/categories";
import ProductForm from "../../../_components/ProductForm";
import { PageHeader } from "../../../_components/ui";
import { saveProduct } from "../actions";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await categoryTree();
  return (
    <>
      <PageHeader title="New product" back={{ href: "/admin/products", label: "Products" }} description="Create the product first; variants (sizes, colours, stock) are added on the next screen." />
      <ProductForm action={saveProduct.bind(null, null)} categories={categories} />
    </>
  );
}
