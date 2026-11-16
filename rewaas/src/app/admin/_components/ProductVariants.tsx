import type { Variant } from "@prisma/client";
import { ActionButton, ActionForm, Submit } from "./forms";
import { Section } from "./fields";
import { deleteVariant, saveVariant } from "../(panel)/products/actions";
import { cn } from "@/lib/utils";

const COLS = "grid gap-2 md:grid-cols-[1fr_1.2fr_72px_1.3fr_90px_110px_auto] md:items-center";

function Row({ productId, v, defaultSku }: { productId: string; v?: Variant; defaultSku?: string }) {
  const price = v?.price == null ? "" : (v.price / 100).toString();
  return (
    <ActionForm action={saveVariant.bind(null, productId, v?.id ?? null)} resetOnSuccess={!v} className={cn(COLS, "border-b border-ink-200/60 py-3")}>
      <input name="size" defaultValue={v?.size ?? ""} placeholder="Size e.g. M / Free Size" aria-label="Size" className="field !py-2" />
      <input name="colour" defaultValue={v?.colour ?? ""} placeholder="Colour" aria-label="Colour" className="field !py-2" />
      <input name="colourHex" type="color" defaultValue={v?.colourHex ?? "#a3423c"} aria-label="Colour swatch" className="h-10 w-full cursor-pointer border border-ink-200 bg-white p-1" />
      <input name="sku" defaultValue={v?.sku ?? defaultSku ?? ""} placeholder="SKU" aria-label="SKU" className="field !py-2 font-mono text-xs uppercase" />
      <input name="stock" inputMode="numeric" defaultValue={v?.stock ?? 0} aria-label="Stock" className={cn("field !py-2", v && v.stock <= 3 && "border-amber-400 bg-amber-50")} />
      <input name="price" inputMode="decimal" defaultValue={price} placeholder="₹ (optional)" aria-label="Price override in rupees" className="field !py-2" />
      <div className="flex items-center gap-3">
        <Submit className="!px-3">{v ? "Save" : "Add"}</Submit>
        {v && (
          <ActionButton action={deleteVariant.bind(null, v.id)} confirm={`Delete variant ${v.sku}?`} className="admin-danger">
            Delete
          </ActionButton>
        )}
      </div>
    </ActionForm>
  );
}

export default function ProductVariants({ productId, variants, skuBase }: { productId: string; variants: Variant[]; skuBase: string }) {
  const total = variants.reduce((a, v) => a + v.stock, 0);
  return (
    <Section title={`Variants (${variants.length})`} description={`Sizes and colours customers can choose. Total stock: ${total}.`}>
      <div id="variants" className={cn(COLS, "hidden border-b border-ink-200 pb-2 text-[11px] uppercase tracking-[0.1em] text-ink-400 md:grid")}>
        <span>Size</span>
        <span>Colour</span>
        <span>Hex</span>
        <span>SKU</span>
        <span>Stock</span>
        <span>Price override</span>
        <span />
      </div>
      {variants.map((v) => (
        <Row key={v.id} productId={productId} v={v} />
      ))}
      <p className="mt-5 text-xs uppercase tracking-[0.12em] text-ink-400">Add a variant</p>
      <Row productId={productId} defaultSku={`${skuBase}-${variants.length + 1}`} />
    </Section>
  );
}
