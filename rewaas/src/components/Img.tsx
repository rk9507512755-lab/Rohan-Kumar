import Image, { type ImageProps } from "next/image";

/** next/image wrapper: local uploads & SVG art are served as-is, photos are optimised (AVIF/WebP, responsive sizes). */
export default function Img(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const unoptimized = props.unoptimized ?? (src.endsWith(".svg") || src.startsWith("/api/media/"));
  return <Image {...props} alt={props.alt ?? ""} unoptimized={unoptimized} />;
}
