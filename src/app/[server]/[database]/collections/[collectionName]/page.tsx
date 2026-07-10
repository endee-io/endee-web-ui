import { Suspense } from "react";
import CollectionPage from "@/views/CollectionPage";

// useSearchParams (for the ?tab= state) requires a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <CollectionPage />
    </Suspense>
  );
}
