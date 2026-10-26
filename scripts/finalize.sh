#!/bin/bash
# Rebuild every output in data/ from the parsed records in work/ (run from the repo root,
# after scripts/download_drive.py, extract.py, pdf_extract.py and ocr_extract.py).
set -e
cd "$(dirname "$0")/.."
python3 -I scripts/reprocess_ocr.py || true
python3 -I scripts/bye.py work/bye.csv > work/bye_report.txt
rm -rf data && mkdir -p data
python3 -I scripts/build.py data
xz -T4 -6 -f data/UP_Form20.sqlite
python3 -I scripts/make_readme.py .
