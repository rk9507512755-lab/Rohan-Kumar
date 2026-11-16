import type { Metadata } from "next";
import StoreLayout from "./(store)/layout";
import StoreNotFound from "./(store)/not-found";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Unmatched URLs render here (outside any route group), so wrap the store chrome around the shared 404.
export default function NotFound() {
  return (
    <StoreLayout>
      <StoreNotFound />
    </StoreLayout>
  );
}
