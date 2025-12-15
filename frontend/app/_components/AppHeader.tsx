// components/AppHeader.tsx （Server Component）
import { Suspense } from "react";
import AppHeaderClientOnly from "./AppHeaderClientOnly";
import { headers } from "next/headers";
// import AppHeaderClientBlur from "./AppHeaderClientBlur";
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

export default async function AppHeader() {
  const headersList = await headers();

  const referer = headersList.get("referer") || null;

  console.log("AccountPage referer:", referer);
  return (
    <Suspense fallback={<HeaderFallback />}>
      <AppHeaderClientOnly />
      {/* <AppHeaderClientOnly /> */}
    </Suspense>
  );
}
