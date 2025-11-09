// app/not-found.tsx
// "use client";

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
// import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
// import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
// import { useState } from "react";
import Box from "@mui/material/Box";
// import IconButton from "@mui/material/IconButton";

export default function NotFound() {
  // const [searchQuery, setSearchQuery] = useState("");

  // const handleSearch = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (searchQuery.trim()) {
  //     // note の検索へリダイレクト（例）
  //     window.location.href = `https://note.com/search?q=${encodeURIComponent(
  //       searchQuery
  //     )}`;
  //   }
  // };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      {/* <Box
        component="header"
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Typography variant="h6" color="text.primary" fontWeight="bold">
            note
          </Typography>
        </Link>
      </Box> */}

      {/* Main Content */}
      <Container
        maxWidth="xs"
        sx={{ flex: 1, display: "flex", alignItems: "center" }}
      >
        <Paper
          sx={{
            width: "100%",
            // p: 3,
            textAlign: "center",
            borderRadius: 2,
            boxShadow: 0,
            bgcolor: "#fff",
          }}
        >
          {/* Title */}
          <Typography
            variant="h5"
            fontWeight="bold"
            color="text.primary"
            gutterBottom
          >
            お探しのページが見つかりません。
          </Typography>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              whiteSpace: "pre-line",
              mb: 3,
              fontSize: "0.875rem",
              lineHeight: 1.5,
            }}
          >
            あなたがアクセスしたページは削除されたか、URLが変更されているため表示することができません。
          </Typography>

          {/* Search Form */}
          {/* <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ position: "relative", mx: "auto", maxWidth: "320px", mb: 3 }}
          >
            <TextField
              fullWidth
              placeholder="キーワードやクリエイターで検索"
              aria-label="キーワードやクリエイターで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 20,
                  pr: 1,
                  pl: 2,
                  bgcolor: "grey.50",
                  "&:hover": { bgcolor: "grey.100" },
                  "&.Mui-focused": {
                    bgcolor: "common.white",
                    boxShadow: "0 0 0 2px rgba(144, 202, 249, 0.5)",
                  },
                },
              }}
            />
            <IconButton
              type="submit"
              aria-label="検索"
              sx={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                color: "text.secondary",
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Box> */}

          {/* Back to Home Button */}
          <Button
            component={Link}
            href="/"
            variant="outlined"
            sx={{
              borderRadius: 20,
              px: 3,
              color: "text.primary",
              borderColor: "grey.300",
              "&:hover": {
                borderColor: "grey.400",
                bgcolor: "grey.50",
              },
            }}
          >
            トップへ戻る
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
