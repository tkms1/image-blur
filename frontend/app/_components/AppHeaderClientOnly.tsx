// components/AppHeaderClientOnly.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import UndoIcon from "@mui/icons-material/Undo";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip"; // 👈 追加
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { Ref } from "react"; // 👈 追加
import HomeIcon from "@mui/icons-material/Home";
type BlurRegion = {
  id: string;
  type: "circle" | "line";
  x: number;
  y: number;
  radius: number;
  strength: number;
  x2?: number;
  y2?: number;
};
// type Props = {
// imageSrc: string;
// blurRegions: BlurRegion[];
// onAddBlur: (x: number, y: number) => void;
// onAddLineBlur: (
//   start: { x: number; y: number },
//   end: { x: number; y: number }
// ) => void;
// onUpdateBlur: (id: string, updates: Partial<BlurRegion>) => void;
// onRemoveBlur: (id: string) => void;
// handleDownload: () => void;
// undo: () => void;
// undoStack: BlurRegion[][];
// isProcessing: boolean;
// uploadImage: () => void;
// fileInputRef: React.RefObject<HTMLInputElement>; // ✅ 明示的に RefObject
// blurRegions: BlurRegion[];
// };
const AppHeaderClientOnly = () => {
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
  // console.log("pathname:", pathname);
  return (
    <>
      {pathname !== "/blur-editor" && (
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
          <Box>
            <Link
              href="/"
              className="no-underline text-white flex items-center gap-2"
            >
              <Image
                src="/top-image.png"
                width={50}
                height={40}
                alt="logo"
                priority
              />
              <Typography variant="body1">画像ぼかし</Typography>
            </Link>
          </Box>
          {/* <Tooltip title="もとに戻す" arrow>
          <IconButton
            aria-label="元に戻す"
            onClick={undo}
            disabled={undoStack?.length === 0}
          >
            <UndoIcon />
          </IconButton>
        </Tooltip> */}

          <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 2 }}>
            {navItems.map((item, i) => (
              <Link key={i} href={item.link} prefetch={false}>
                <Button sx={{ color: "white", fontSize: 13 }}>
                  {item.name}
                </Button>
              </Link>
            ))}
          </Box>
          <Box sx={{ display: { xs: "flex", sm: "none" } }}>
            <IconButton aria-label="home" href="/">
              <HomeIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </>
  );
};
export default AppHeaderClientOnly;
