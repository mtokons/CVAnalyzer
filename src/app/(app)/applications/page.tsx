import { Suspense } from "react";
import { ApplicationsTracker } from "./ApplicationsTracker";

export default function ApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsTracker />
    </Suspense>
  );
}
