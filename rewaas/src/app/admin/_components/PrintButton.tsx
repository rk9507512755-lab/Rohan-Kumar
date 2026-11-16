"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
      Print invoice
    </button>
  );
}
