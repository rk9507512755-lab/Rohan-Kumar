import { readFile, stat } from "fs/promises";
import path from "path";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/storage";

export const runtime = "nodejs";

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

/** Serves files written by saveUpload() from UPLOAD_DIR. Never serves anything outside it. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!segments?.length || segments.some((s) => !SAFE_SEGMENT.test(s) || s.includes(".."))) return notFound();
  const root = path.resolve(UPLOAD_DIR);
  const file = path.resolve(root, ...segments);
  if (!file.startsWith(root + path.sep)) return notFound();
  const type = MIME_BY_EXT[path.extname(file).toLowerCase()];
  if (!type) return notFound();
  try {
    const st = await stat(file);
    if (!st.isFile()) return notFound();
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(st.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Last-Modified": st.mtime.toUTCString(),
      },
    });
  } catch {
    return notFound();
  }
}
