import { Err } from "./forms";
import { Thumb } from "./ui";

/** Upload-or-URL image control. Server reads `<name>File` (wins) or `<name>Url` via imageFrom(). Clear the URL to remove. */
export default function ImageInput({ name, label, current, required, hint }: { name: string; label: string; current?: string | null; required?: boolean; hint?: string }) {
  return (
    <fieldset>
      <legend className="field-label">
        {label}
        {required && " *"}
      </legend>
      <div className="flex items-start gap-4">
        <Thumb src={current} size={88} />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="file"
            name={`${name}File`}
            aria-label={`${label}: upload a file`}
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-sm file:mr-3 file:border-0 file:bg-wine file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-wider file:text-ivory"
          />
          <input name={`${name}Url`} defaultValue={current ?? ""} placeholder="…or paste an image URL / path" aria-label={`${label}: image URL`} className="field !py-2 text-sm" />
          <p className="text-xs text-ink-400">{hint ?? "An uploaded file replaces the URL."}{!required && " Clear the URL to remove the image."}</p>
        </div>
      </div>
      <Err name={name} />
    </fieldset>
  );
}
