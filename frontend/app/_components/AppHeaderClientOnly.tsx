// components/AppHeaderClientOnly.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import Image from "next/image";

export default function AppHeaderClientOnly() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const existingRedirectTo = searchParams.get("redirect_to");
  const targetUrl =
    existingRedirectTo ||
    `${pathname}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

  const loginLink =
    targetUrl === "/"
      ? "/login"
      : `/login?redirect_to=${encodeURIComponent(targetUrl)}`;
  const signupLink =
    targetUrl === "/"
      ? "/signup"
      : `/signup?redirect_to=${encodeURIComponent(targetUrl)}`;

  const navItems = [{ name: "ホーム", link: "/blur-editor" }];

  return (
    <>
      <Box
        component="header"
        sx={{
          bgcolor: "#1976d2",
          color: "white",
          py: 1,
          px: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" >
          <Link href="/" className="no-underline text-white flex">
            <Image
              src="/top-image.png"
              width={50}
              height={22}
              alt="logo"
              priority
            />
            画像ぼかし
          </Link>
        </Typography>

        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 2 }}>
          {navItems.map((item, i) => (
            <Link key={i} href={item.link} prefetch={false}>
              <Button sx={{ color: "white", fontSize: 13 }}>{item.name}</Button>
            </Link>
          ))}
        </Box>
      </Box>
    </>
  );
}
