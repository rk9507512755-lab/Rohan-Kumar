"""Grid-based OCR of scanned Form-20 pages.

Ruled table lines give row and column boundaries; every column strip is
OCR'd once (digits only) and each recognised number is placed in the row
whose band contains it. Output matches pdf_table.parse_page.
"""
import re

import cv2
import numpy as np

from ocr import grid, line_masks, ocr_strip, orientation, render, rotate_img, skew_angle
from pdf_table import _int


def deskew(img):
    small = cv2.resize(img, None, fx=0.35, fy=0.35, interpolation=cv2.INTER_AREA)
    bw = cv2.adaptiveThreshold(small, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)
    ang = skew_angle(bw)
    if abs(ang) > 0.05:
        h, w = img.shape
        M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=255)
    return img, ang


def clean_lines(img):
    bw = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
    horiz, vert = line_masks(bw)
    lines = cv2.dilate(cv2.bitwise_or(horiz, vert), np.ones((5, 5), np.uint8))
    out = img.copy()
    out[lines > 0] = 255
    return out


def best_rotation(img):
    """Pick the rotation whose central crop OCRs into the most confident numbers."""
    import pytesseract
    h, w = img.shape
    crop = img[h // 3: 2 * h // 3, w // 3: 2 * w // 3]
    crop = cv2.resize(crop, None, fx=0.6, fy=0.6)
    best, score = 0, -1
    scores = {}
    for r in (0, 180, 90, 270):
        im = rotate_img(crop, r)
        d = pytesseract.image_to_data(im, lang="eng", config="--psm 6 --oem 1",
                                      output_type=pytesseract.Output.DICT)
        s = sum(float(c) for t, c in zip(d["text"], d["conf"])
                if t and t.strip().isdigit() and float(c) > 60)
        scores[r] = s
        if s > score:
            best, score = r, s
    return best


def _line_ends(mask, comp_stats, labels, idx):
    x, y, w, h, _ = comp_stats[idx]
    sub = labels[y:y + h, x:x + w] == idx
    cols = np.where(sub.any(axis=0))[0]
    left, right = cols.min(), cols.max()
    yl = y + np.mean(np.where(sub[:, max(0, left):left + 15].any(axis=1))[0])
    yr = y + np.mean(np.where(sub[:, max(0, right - 15):right + 1].any(axis=1))[0])
    return (x + left, yl), (x + right, yr)


def dewarp(img):
    """Perspective-correct a photographed table using its outermost long
    horizontal rules. Returns (img, changed)."""
    bw = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
    horiz, _ = line_masks(bw)
    horiz = cv2.dilate(horiz, np.ones((3, 9), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(horiz, 8)
    W = img.shape[1]
    long_ = [i for i in range(1, n) if stats[i][2] > 0.45 * W]
    if len(long_) < 2:
        return img, False
    top = min(long_, key=lambda i: stats[i][1])
    bot = max(long_, key=lambda i: stats[i][1] + stats[i][3])
    (tlx, tly), (trx, try_) = _line_ends(horiz, stats, labels, top)
    (blx, bly), (brx, bry) = _line_ends(horiz, stats, labels, bot)
    src = np.float32([[tlx, tly], [trx, try_], [brx, bry], [blx, bly]])
    xl, xr = min(tlx, blx), max(trx, brx)
    yt, yb = min(tly, try_), max(bly, bry)
    dst = np.float32([[xl, yt], [xr, yt], [xr, yb], [xl, yb]])
    if np.abs(src - dst).max() < 6:
        return img, False
    M = cv2.getPerspectiveTransform(src, dst)
    out = cv2.warpPerspective(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderValue=255)
    return out, True


def _seq_run(nums):
    """Longest chain of +1 steps (equal neighbours allowed but not counted)."""
    best = cur = 0
    for a, b in zip(nums, nums[1:]):
        if b == a + 1:
            cur += 1
            best = max(best, cur)
        elif b != a:
            cur = 0
    return best


def rotation_by_table(img):
    """Rotation under which the left edge of the table reads as a run of
    consecutive polling-station numbers (the serial column)."""
    best, score = None, 0
    img = cv2.resize(img, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    for r in (0, 90, 270, 180):
        im = rotate_img(img, r)
        bw = cv2.adaptiveThreshold(im, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)
        horiz, _ = line_masks(bw)
        rows = np.where(horiz.sum(axis=1) / 255 > 0.3 * im.shape[1])[0]
        if len(rows) < 2:
            continue
        cols = np.where(horiz[rows].any(axis=0))[0]
        xl, xr = cols.min(), cols.max()
        if xr - xl < 0.3 * im.shape[1]:
            continue
        top, bot = rows.min(), rows.max()
        cl = clean_lines(im)
        strip = cl[top:bot, xl + 2: xl + max(20, int(0.07 * (xr - xl)))]
        ws = ocr_strip(strip, "eng", 6, "0123456789", scale=2.5)
        nums = [int(w[2]) for w in sorted(ws, key=lambda w: w[1]) if w[2].isdigit() and len(w[2]) <= 4]
        sc = _seq_run(nums)
        if sc > score:
            best, score = r, sc
    return best if score >= 3 else None


def rotation_scores(img):
    """Digit-confidence score per rotation (higher = more likely upright)."""
    import pytesseract
    h, w = img.shape
    crop = img[h // 4: 3 * h // 4, w // 4: 3 * w // 4]
    crop = cv2.resize(crop, None, fx=0.6, fy=0.6)
    out = {}
    for r in (0, 180, 90, 270):
        d = pytesseract.image_to_data(rotate_img(crop, r), lang="eng", config="--psm 6 --oem 1",
                                      output_type=pytesseract.Output.DICT)
        out[r] = sum(float(c) for t, c in zip(d["text"], d["conf"])
                     if t and t.strip().isdigit() and float(c) > 60)
    return out


def first_col_score(prep):
    """Run length of consecutive booth numbers in the first grid column."""
    img, ys, xs, info = prep
    if len(ys) < 6 or len(xs) < 4:
        return 0
    cl = clean_lines(img[ys[0]:ys[-1], xs[0]:xs[1]])
    ws = ocr_strip(cl[:, 3:-3], "eng", 6, "0123456789", scale=1.5)
    nums = [int(w[2]) for w in sorted(ws, key=lambda w: w[1]) if w[2].isdigit() and len(w[2]) <= 4]
    return _seq_run(nums)


def page_quality(pg):
    """Share of data rows where some column equals the sum of the candidate
    columns before it (candidates start at column 1 or 2) - true for any
    correctly read Form-20 row."""
    if not pg:
        return 0.0
    ok = n = 0
    for r in pg["rows"]:
        if not r["is_data"]:
            continue
        n += 1
        c = [_int(r["cells"].get(i, "") or "x") for i in range(len(pg["columns"]))]
        hit = False
        for start in (1, 2):
            for j in range(start + 2, len(c)):
                if c[j] is None:
                    continue
                head = c[start:j]
                if None in head:
                    continue
                if sum(head) == c[j] or (len(head) > 2 and sum(head[:-1]) == c[j]):
                    hit = True
                    break
            if hit:
                break
        ok += hit
    return ok / n if n else 0.0


def prepare_page(page, rot=None, img=None):
    if img is None:
        img = render(page)
    if rot is None:
        sc = rotation_scores(img)
        rot = max(sc, key=sc.get)
    img = rotate_img(img, rot)
    img, ang = deskew(img)
    ys, xs, bw = grid(img)
    warped = False
    if len(ys) >= 2:
        img2, warped = dewarp(img)
        if warped:
            ys2, xs2, bw2 = grid(img2)
            if len(xs2) >= len(xs) and len(ys2) >= 0.8 * len(ys):
                img, ys, xs, bw = img2, ys2, xs2, bw2
            else:
                warped = False
    ext = None
    if len(ys) >= 2:
        horiz, _ = line_masks(bw)
        mid = horiz[ys[len(ys) // 2] - 3: ys[len(ys) // 2] + 4].any(axis=0)
        idx = np.where(mid)[0]
        if len(idx):
            ext = (int(idx.min()), int(idx.max()))
    return img, ys, xs, dict(rot=rot, skew=round(ang, 2), hlines=len(ys), vlines=len(xs), ext=ext, dewarped=warped)


def ocr_grid_page(page, rot=None, want_header=True, prepared=None, xs_override=None):
    if prepared is None:
        prepared = prepare_page(page)
    img, ys, xs, info = prepared
    info = dict(info)
    if xs_override is not None:
        xs = xs_override
        info["xs_projected"] = True
    if len(ys) < 6 or len(xs) < 6:
        return None, info
    clean = clean_lines(img)
    bands = [(a, b) for a, b in zip(ys, ys[1:]) if b - a >= 12]
    heights = sorted(b - a for a, b in bands)
    rh = heights[len(heights) // 3] if heights else 0
    cols = [(a, b) for a, b in zip(xs, xs[1:]) if b - a >= 15]
    if len(cols) < 5:
        return None, info
    # first column decides which bands are data rows
    x0, x1 = cols[0]
    col0 = ocr_strip(clean[ys[0]:ys[-1], x0 + 3:x1 - 3], "eng", 6, "0123456789")
    data_bands = set()
    for xc, yc, t, cf in col0:
        y = yc + ys[0]
        for k, (a, b) in enumerate(bands):
            if a <= y < b and _int(t) is not None and (b - a) <= 2.2 * rh:
                data_bands.add(k)
    if len(data_bands) < 2:
        return None, info
    first = min(data_bands)
    y_top, y_bot = bands[first][0], bands[-1][1]
    cells = {}
    for ci, (a, b) in enumerate(cols):
        words = ocr_strip(clean[y_top:y_bot, a + 3:b - 3], "eng", 6, "0123456789")
        for xc, yc, t, cf in words:
            y = yc + y_top
            for k in range(first, len(bands)):
                if bands[k][0] <= y < bands[k][1]:
                    key = (k, ci)
                    cells[key] = cells.get(key, "") + t
                    break
    # header text per column (Hindi + English)
    header_img = clean[ys[0]:y_top]
    columns = []
    for ci, (a, b) in enumerate(cols):
        txt = ""
        if want_header and header_img.shape[0] > 10:
            ws = ocr_strip(header_img[:, a + 2:b - 2], "hin+eng", 6, None, scale=1.5)
            ws = sorted(ws, key=lambda w: (round(w[1] / 25), w[0]))
            txt = " ".join(w[2] for w in ws if w[3] > 30)
        columns.append(dict(x=(a + b) / 2, lo=a, hi=b, header=re.sub(r"\s+", " ", txt).strip(), kind=""))
    rows = []
    for k in range(first, len(bands)):
        c = {ci: v for (kk, ci), v in cells.items() if kk == k}
        if not c:
            continue
        nnum = sum(1 for v in c.values() if _int(v) is not None)
        is_data = k in data_bands and nnum >= 5
        rows.append(dict(y=bands[k][0], cells=c, label="" if is_data else "total", is_data=is_data,
                         src=(bands[k], )))
    ctx = dict(clean=clean, cols=cols)
    return dict(columns=columns, rows=rows, h=rh, ctx=ctx), info


def reocr_cell(ctx, band, ci):
    a, b = ctx["cols"][ci]
    y0, y1 = band
    crop = ctx["clean"][max(0, y0 + 2):y1 - 2, a + 3:b - 3]
    for psm in (7, 8):
        ws = ocr_strip(crop, "eng", psm, "0123456789", scale=3.0)
        txt = "".join(w[2] for w in ws)
        if _int(txt) is not None:
            return txt
    return None
