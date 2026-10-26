"""Self-trained digit reader for scanned Form-20 tables.

Tesseract misreads isolated small digits (5 -> 9, drops lone 1s). Within one
document the digits share a font, so rows whose OCR already satisfies the
Form-20 arithmetic give labelled digit glyphs; a nearest-neighbour model
trained on them re-reads every cell, and a row keeps the reading under which
its arithmetic holds.
"""
import cv2
import numpy as np

from pdf_table import _int

GW, GH = 12, 18


def cell_glyphs(clean, band, col):
    y0, y1 = band
    a, b = col
    crop = clean[y0 + 3:y1 - 2, a + 4:b - 3]
    if crop.size == 0:
        return []
    _, bw = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    if bw.mean() < 1:  # empty cell
        return []
    n, lab, st, _ = cv2.connectedComponentsWithStats(bw, 8)
    h = crop.shape[0]
    comps = [st[i] for i in range(1, n) if st[i][3] >= 0.3 * h and st[i][4] >= 12 and st[i][2] <= 0.9 * crop.shape[1]]
    if not comps:
        return []
    hmax = max(c[3] for c in comps)
    comps = [c for c in comps if c[3] >= 0.6 * hmax]
    comps.sort(key=lambda c: c[0])
    out = []
    for x, y, w, hh, _ in comps:
        g = bw[y:y + hh, x:x + w]
        side = max(w, hh * GW // GH)
        canvas = np.zeros((hh, side), np.uint8)
        off = (side - w) // 2
        canvas[:, off:off + w] = g
        out.append(cv2.resize(canvas, (GW, GH), interpolation=cv2.INTER_AREA).astype(np.float32).ravel() / 255.0)
    return out


def row_ok(vals):
    for start in range(1, 7):
        for j in range(start + 2, len(vals)):
            if vals[j] is None:
                continue
            head = vals[start:j]
            if None in head:
                continue
            if vals[j] >= 20 and len(head) >= 3 and (sum(head) == vals[j] or sum(head[:-1]) == vals[j]):
                return True
    return False


def knn_refine(pages):
    """pages: parsed OCR pages (with 'ctx' and row 'src'). Updates cells in place.
    Returns (rows_fixed, rows_total)."""
    samples, labels = [], []
    store = []
    for p in pages:
        if not p or "ctx" not in p:
            continue
        clean, cols = p["ctx"]["clean"], p["ctx"]["cols"]
        ncol = len(p["columns"])
        for r in p["rows"]:
            if not r.get("src"):
                continue
            band = r["src"][0]
            gl = {ci: cell_glyphs(clean, band, cols[ci]) for ci in range(ncol)}
            store.append((r, gl, ncol))
            vals = [_int(r["cells"].get(ci, "") or "x") for ci in range(ncol)]
            if r["is_data"] and row_ok(vals):
                for ci in range(ncol):
                    t = r["cells"].get(ci, "")
                    if t.isdigit() and len(t) == len(gl[ci]):
                        for ch, g in zip(t, gl[ci]):
                            samples.append(g)
                            labels.append(int(ch))
    if len(samples) < 50 or len(set(labels)) < 8:
        return 0, len(store)
    X = np.stack(samples)
    y = np.array(labels)
    # cap per class to keep it fast and balanced
    keep = np.concatenate([np.where(y == d)[0][:400] for d in range(10)])
    X, y = X[keep], y[keep]
    Xn = (X * X).sum(1)

    def classify(gs):
        G = np.stack(gs)
        d = (G * G).sum(1)[:, None] + Xn[None, :] - 2 * G @ X.T
        idx = np.argsort(d, axis=1)[:, :3]
        votes = y[idx]
        return [int(np.bincount(v, minlength=10).argmax()) for v in votes]

    fixed = 0
    for r, gl, ncol in store:
        new = dict(r["cells"])
        for ci in range(ncol):
            if gl[ci]:
                new[ci] = "".join(str(dd) for dd in classify(gl[ci]))
        old_vals = [_int(r["cells"].get(ci, "") or "x") for ci in range(ncol)]
        new_vals = [_int(new.get(ci, "") or "x") for ci in range(ncol)]
        if row_ok(old_vals):
            continue
        if row_ok(new_vals):
            r["cells"] = new
            r["knn"] = True
            fixed += 1
            if not r["is_data"] and _int(new.get(0, "") or "x") is not None and sum(v is not None for v in new_vals) >= 5:
                r["is_data"] = True
        else:
            # fill blanks only
            for ci in range(ncol):
                if ci not in r["cells"] and ci in new:
                    r["cells"][ci] = new[ci]
    return fixed, len(store)
