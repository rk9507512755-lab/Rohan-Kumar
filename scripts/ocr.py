"""OCR helpers for scanned Form-20 pages: orientation, deskew, line removal,
and tesseract word boxes in the format pdf_table.parse_page expects."""
import re

import cv2
import fitz
import numpy as np
import pytesseract

DPI = 300


def render(page, dpi=DPI):
    pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    return img.copy()


def orientation(img):
    small = cv2.resize(img, None, fx=0.5, fy=0.5)
    try:
        osd = pytesseract.image_to_osd(small, config="--psm 0 -c min_characters_to_try=20")
        rot = int(re.search(r"Rotate: (\d+)", osd).group(1))
        conf = float(re.search(r"Orientation confidence: ([\d.]+)", osd).group(1))
        return rot, conf
    except Exception:
        return 0, 0.0


def rotate_img(img, rot):
    if rot == 90:
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    if rot == 180:
        return cv2.rotate(img, cv2.ROTATE_180)
    if rot == 270:
        return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return img


def line_masks(bw):
    h, w = bw.shape
    hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, w // 40), 1))
    vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, h // 40)))
    horiz = cv2.morphologyEx(bw, cv2.MORPH_OPEN, hk)
    vert = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vk)
    return horiz, vert


def skew_angle(bw):
    horiz, _ = line_masks(bw)
    lines = cv2.HoughLinesP(horiz, 1, np.pi / 1800, threshold=200, minLineLength=bw.shape[1] // 6, maxLineGap=20)
    if lines is None:
        return 0.0
    angs = []
    for x1, y1, x2, y2 in np.asarray(lines).reshape(-1, 4):
        if x2 != x1:
            a = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if abs(a) < 8:
                angs.append(a)
    return float(np.median(angs)) if angs else 0.0


def prepare(img):
    """Return (clean image for OCR, info)."""
    bw = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
    ang = skew_angle(bw)
    if abs(ang) > 0.05:
        h, w = img.shape
        M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=255)
        bw = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
    horiz, vert = line_masks(bw)
    lines = cv2.dilate(cv2.bitwise_or(horiz, vert), np.ones((3, 3), np.uint8))
    clean = 255 - cv2.bitwise_and(bw, cv2.bitwise_not(lines))
    return clean, dict(skew=round(ang, 2))


def ocr_words(img, lang="eng+hin", psm=11):
    d = pytesseract.image_to_data(img, lang=lang, config=f"--psm {psm} --oem 1",
                                  output_type=pytesseract.Output.DICT)
    out = []
    for i, t in enumerate(d["text"]):
        t = (t or "").strip()
        if not t or float(d["conf"][i]) < 0:
            continue
        x, y, w, h = d["left"][i], d["top"][i], d["width"][i], d["height"][i]
        out.append((x, y, x + w, y + h, t, None, float(d["conf"][i])))
    return out


def page_words(page, force_rot=None):
    img = render(page)
    rot, conf = (force_rot, 99.0) if force_rot is not None else orientation(img)
    img = rotate_img(img, rot)
    clean, info = prepare(img)
    words = ocr_words(clean)
    info.update(rot=rot, rot_conf=conf)
    return words, info


def _peaks(profile, thresh, min_gap):
    idx = np.where(profile > thresh)[0]
    if len(idx) == 0:
        return []
    groups, cur = [], [idx[0]]
    for i in idx[1:]:
        if i - cur[-1] <= 3:
            cur.append(i)
        else:
            groups.append(cur)
            cur = [i]
    groups.append(cur)
    pos = [int(np.mean(g)) for g in groups]
    out = []
    for p in pos:
        if not out or p - out[-1] >= min_gap:
            out.append(p)
    return out


def grid(img):
    """Detect table grid lines on a deskewed page. Returns (ys, xs, bw)."""
    bw = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
    horiz, vert = line_masks(bw)
    h, w = bw.shape
    hp = horiz.sum(axis=1) / 255
    ys = _peaks(hp, max(0.15 * w, 0.45 * hp.max()), 8)
    if len(ys) >= 2:
        top, bot = ys[0], ys[-1]
        # close small breaks in thin / faint column rules before isolating them
        bwc = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 9)))
        _, vert = line_masks(bwc)
        vp = vert[top:bot].sum(axis=0) / 255
        xs = _peaks(vp, max(0.15 * (bot - top), 0.25 * vp.max()), 8)
    else:
        xs = []
    return ys, xs, bw


def ocr_strip(img, lang, psm, whitelist=None, scale=2.0):
    if img.size == 0:
        return []
    im = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    im = cv2.copyMakeBorder(im, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
    cfg = f"--psm {psm} --oem 1"
    if whitelist:
        cfg += f" -c tessedit_char_whitelist={whitelist}"
    if im.shape[0] < 30 or im.shape[1] < 30:
        return []
    try:
        d = pytesseract.image_to_data(im, lang=lang, config=cfg, output_type=pytesseract.Output.DICT)
    except pytesseract.TesseractError:
        return []
    out = []
    for i, t in enumerate(d["text"]):
        t = (t or "").strip()
        if t and float(d["conf"][i]) >= 0:
            yc = (d["top"][i] + d["height"][i] / 2 - 20) / scale
            xc = (d["left"][i] + d["width"][i] / 2 - 20) / scale
            out.append((xc, yc, t, float(d["conf"][i])))
    return out
