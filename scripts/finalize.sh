#!/bin/bash
# Rebuild all outputs into the repo's data/ folder and refresh README.
set -e
cd /home/user/ups
python3 -I scripts/reprocess_ocr.py || true
python3 -I scripts/bye.py work/bye.csv > work/bye_report.txt
REPO=/home/user/rohan-kumar
rm -rf "$REPO/data"
mkdir -p "$REPO/data"
python3 -I scripts/build.py "$REPO/data"
xz -T4 -6 -f "$REPO/data/UP_Form20.sqlite"
python3 -I scripts/make_readme.py "$REPO"
python3 -I scripts/missing_report.py "$REPO/data"
for f in krutidev loader parse_wide parse_simple parse_triplet parse_rounds extract pdf_table pdf_extract ocr pdf_ocr ocr_extract glyph_knn reprocess_ocr parties bye build make_readme summ insp seats missing_report fetch_missing; do
  cp scripts/$f.py "$REPO/scripts/"
done
cp scripts/bye_manual_transcriptions.csv scripts/finalize.sh "$REPO/scripts/"
du -sh "$REPO/data" "$REPO/data"/* "$REPO/data"/*/ | sort -h | tail -20
echo FINALIZE_DONE
