#!/usr/bin/env python3
"""
Download external images or convert local generated images (.jpg/.png/.gif) to optimized .webp.
Automatically compares lossy (quality=80, method=6) vs lossless (lossless=True, method=6)
and keeps whichever output is smaller.

Usage:
  python img_to_webp.py <out_dir> <url_or_path_1> [url_or_path_2 ...]
"""
import io
import os
import sys
import urllib.request
from urllib.parse import urlparse
from PIL import Image


def save_best_webp(im: Image.Image, out_path: str) -> int:
    mode = "RGBA" if ("A" in im.mode or "transparency" in im.info) else "RGB"
    im_conv = im.convert(mode)

    buf_lossy = io.BytesIO()
    im_conv.save(buf_lossy, "WEBP", quality=80, method=6)

    buf_lossless = io.BytesIO()
    im_conv.save(buf_lossless, "WEBP", lossless=True, method=6)

    best = (
        buf_lossless.getvalue()
        if len(buf_lossless.getvalue()) < len(buf_lossy.getvalue())
        else buf_lossy.getvalue()
    )
    with open(out_path, "wb") as f:
        f.write(best)
    return len(best)


def process_one(out_dir: str, item: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    is_url = item.startswith("http://") or item.startswith("https://")
    if is_url:
        parsed = urlparse(item)
        fname = os.path.basename(parsed.path)
        base, _ = os.path.splitext(fname)
        tmp_path = os.path.join(out_dir, f"_tmp_{fname}")
        req = urllib.request.Request(item, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(tmp_path, "wb") as f:
            f.write(resp.read())
        orig_size = os.path.getsize(tmp_path)
        out_path = os.path.join(out_dir, f"{base}.webp")
        with Image.open(tmp_path) as im:
            new_size = save_best_webp(im, out_path)
        os.remove(tmp_path)
        print(f"[WebP] {fname}: {orig_size} B -> {new_size} B ({out_path})")
    else:
        if not os.path.exists(item):
            print(f"[Skip] Not found: {item}", file=sys.stderr)
            return
        fname = os.path.basename(item)
        base, _ = os.path.splitext(fname)
        orig_size = os.path.getsize(item)
        out_path = os.path.join(out_dir, f"{base}.webp")
        with Image.open(item) as im:
            new_size = save_best_webp(im, out_path)
        if os.path.abspath(item) != os.path.abspath(out_path):
            os.remove(item)
        print(f"[WebP] {fname}: {orig_size} B -> {new_size} B ({out_path})")


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__.strip())
        sys.exit(1)
    out_dir = sys.argv[1]
    for item in sys.argv[2:]:
        process_one(out_dir, item)


if __name__ == "__main__":
    main()
