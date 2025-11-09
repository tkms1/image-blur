"use client";
import {
  // AppBar,
  Box,
  Button,
  Divider,
  // Drawer,
  IconButton,
  // List,
  // ListItem,
  // ListItemButton,
  // ListItemText,
  Toolbar,
  Tooltip,
  Avatar,
  // ThemeProvider,
  // Toolbar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  // createTheme,
  // CssBaseline
} from "@mui/material";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { CustomAppBar } from "./CustomComponents";

import { usePathname, useSearchParams } from "next/navigation";

import StarRateIcon from "@mui/icons-material/StarRate";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";




export default function AppHeader() {
  // export default function AppBeforLoginHeader(props: Props) {
  // const { window } = props;
  // const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  // const params = useParams();
  // console.log(pathname, params.ID);
  // const pageContext = useAppContext();
  // const { user, setUser, currentAuthenticatedUser } = pageContext;
  // const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const searchParams = useSearchParams();
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 1. まず、現在のURLに redirect_to が含まれているか確認
  const existingRedirectTo = searchParams.get("redirect_to");

  // 2. 既存の redirect_to があればそれを使用、なければ現在のページURLをフォールバック
  const targetUrl =
    existingRedirectTo ||
    `${pathname}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

  // redirect_to を付けるのは、targetUrl が "/" でないときだけ
  const baseLoginUrl = "/login";
  const baseSignupUrl = "/signup";

  const loginLink =
    targetUrl === "/"
      ? baseLoginUrl
      : `${baseLoginUrl}?redirect_to=${encodeURIComponent(targetUrl)}`;

  const signupLink =
    targetUrl === "/"
      ? baseSignupUrl
      : `${baseSignupUrl}?redirect_to=${encodeURIComponent(targetUrl)}`;
  // const handleDrawerToggle = () => {
  //   setMobileOpen((prevState) => !prevState);
  // };
  const handleClose = () => {
    setAnchorEl(null);
  };
 const navItems =
   // user
   //   ? [
   //       { name: "ホーム", link: "/" },
   //       { name: "使い方", link: "/about" },
   //       { name: "ブックマーク", link: "/bookmarks" },
   //     ]
   //  :
   [
     { name: "ホーム", link: "/blur-editor" },
     // { name: "使い方", link: "/about" },
     // { name: "ログイン", link: loginLink },
     // { name: "ログイン", link: "/login" },
     // { name: "ユーザー登録", link: signupLink },
   ];

  // const handleSignOut = async () => {
  //   try {
  //     await signOut();
  //     currentAuthenticatedUser();
  //   } catch (error) {
  //     console.log('error signing out: ', error);
  //   }
  // };
  // const drawer = (
  //   <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
  //     <Typography variant="h6" sx={{ my: 2 }}>
  //       ラク六
  //     </Typography>
  //     <Divider />
  //     <List>
  //       {navItems.map((item, index) =>
  //         item.name == "検索" ? (
  //           <Box key={index}></Box>
  //         ) : (
  //           <Link href={item.link} prefetch={false} key={index}>
  //             <ListItem disablePadding>
  //               <ListItemButton sx={{ textAlign: "center" }}>
  //                 <ListItemText
  //                   className="no-underline text-black"
  //                   primary={item.name}
  //                 />
  //               </ListItemButton>
  //             </ListItem>
  //           </Link>
  //         )
  //       )}
  //     </List>
  //   </Box>
  // );

  // const container =
  //   window !== undefined ? () => window().document.body : undefined;
  return (
    <>
      <CustomAppBar component="nav" position="sticky">
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" }, color: "#000000" }}
          >
            <MenuIcon />
          </IconButton> */}
          <Typography
            variant="h6"
            component="div"
            // sx={{ display: { xs: "none", sm: "block" } }}
            className="cursor-pointer"
          >
            <Link href="/" prefetch={false} className="no-underline text-white">
              <Image
                src="/top-image.png"
                width={50}
                height={22}
                alt="top-logo.jpg"
              />
            </Link>
          </Typography>

            <Box
              sx={{
                alignItems: "center",
                flexGrow: 1,
                justifyContent: "right",
                display: { xs: "none", sm: "flex" },
              }}
            >
              {navItems.map((item, index) => (
                <Link href={item.link} prefetch={false} key={index}>
                  <Button
                    sx={{
                      color: "white",
                      fontSize: { xs: 14, sm: 13 },
                    }}
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
   
            </Box>

          {/* {user && (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Tooltip title="Account settings">
                  <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{ ml: 2 }}
                    aria-controls={open ? "account-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? "true" : undefined}
                  >

                    <Avatar />
                  </IconButton>
                </Tooltip>
              </Box>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                slotProps={{
                  paper: {
                    elevation: 0,
                    sx: {
                      overflow: "visible",
                      filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                      mt: 1.5,
                      "& .MuiAvatar-root": {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      "&:before": {
                        content: '""',
                        display: "block",
                        position: "absolute",
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: "background.paper",
                        transform: "translateY(-50%) rotate(45deg)",
                        zIndex: 0,
                      },
                    },
                  },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                disableScrollLock={true} // この行を追加
              >
                <MenuItem
                  className="cursor-text"
                  sx={{
                    ":hover": {
                      borderColor: "#000",
                      color: "#0F0F0F",
                      background: "#fff",
                    },
                  }}
                >

                  <Avatar />

                  {user.user_metadata.display_name}
                </MenuItem>
                <Divider />
                <Link href={`/bookmarks`}>
                  <MenuItem onClick={handleClose}>
                    <ListItemIcon>
                      <StarRateIcon fontSize="small" />
                    </ListItemIcon>
                    お気に入り
                  </MenuItem>
                </Link>
                <Link href="/account">
                  <MenuItem>
                    <ListItemIcon>
                      <Settings fontSize="small" />
                    </ListItemIcon>
                    設定
                  </MenuItem>
                </Link>
                <MenuItem onClick={signOut}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  ログアウト
                </MenuItem>
              </Menu>
            </>
          )} */}
        </Toolbar>
      </CustomAppBar>

    </>
  );
}
