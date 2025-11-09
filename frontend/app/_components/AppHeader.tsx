// components/AppHeader.tsx （Server Component）
import { Suspense } from "react";
import AppHeaderClientOnly from "./AppHeaderClientOnly";

// ローディング用フォールバック
function HeaderFallback() {
  return (
    <header
      style={{
        backgroundColor: "#1976d2",
        height: "56px",
        width: "100%",
      }}
    />
  );
}

export default function AppHeader() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <AppHeaderClientOnly />
    </Suspense>
  );
}
