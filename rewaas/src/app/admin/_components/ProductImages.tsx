import type { ProductImage } from "@prisma/client";
import { ActionButton, ActionForm, Submit } from "./forms";
import { Section } from "./fields";
import { Thumb } from "./ui";
import { deleteImage, moveImage, updateImage, uploadImages } from "../(panel)/products/actions";

export default function ProductImages({ productId, images }: { productId: string; images: ProductImage[] }) {
  return (
    <Section title={`Images (${images.length})`} description="The first image is the main photo. Use the arrows to reorder.">
      {images.length > 0 && (
        <ul className="mb-6 divide-y divide-ink-200/60 border-y border-ink-200/60">
          {images.map((img, i) => (
            <li key={img.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
              <Thumb src={img.url} alt={img.alt ?? ""} size={72} />
              <ActionForm action={updateImage.bind(null, img.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input name="alt" defaultValue={img.alt ?? ""} placeholder="Alt text (describe the photo)" aria-label="Alt text" className="field min-w-[180px] flex-1 !py-2" />
                <input name="colour" defaultValue={img.colour ?? ""} placeholder="Colour (optional)" aria-label="Colour" className="field w-36 !py-2" />
                <Submit className="!px-3">Save</Submit>
              </ActionForm>
              <div className="flex items-center gap-3">
                {i === 0 ? <span className="text-[10px] uppercase tracking-wider text-gold-600">Main</span> : null}
                <ActionButton action={moveImage.bind(null, img.id, "up")} title="Move up" className={i === 0 ? "invisible" : ""}>
                  ↑
                </ActionButton>
                <ActionButton action={moveImage.bind(null, img.id, "down")} title="Move down" className={i === images.length - 1 ? "invisible" : ""}>
                  ↓
                </ActionButton>
                <ActionButton action={deleteImage.bind(null, img.id)} confirm="Remove this image from the product?" className="admin-danger">
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={uploadImages.bind(null, productId)} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="up-images">
            Upload images
          </label>
          <input id="up-images" type="file" name="images" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm file:mr-3 file:border-0 file:bg-wine file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-wider file:text-ivory" />
          <p className="mt-1 text-xs text-ink-400">Select several files at once. JPG, PNG, WebP, AVIF · 10 MB max each.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="up-url">
            …or add by URL
          </label>
          <input id="up-url" name="url" placeholder="https://… or /photos/…" className="field" />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="field-label" htmlFor="up-alt">
              Alt text for new images
            </label>
            <input id="up-alt" name="alt" placeholder="Defaults to product name" className="field" />
          </div>
          <Submit pendingLabel="Uploading…">Add images</Submit>
        </div>
      </ActionForm>
    </Section>
  );
}
