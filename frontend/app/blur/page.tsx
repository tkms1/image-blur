"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Slider,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  Grid,
  Container,
  AppBar,
  Toolbar,
  alpha,
  Zoom,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "@mui/icons-material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import NextImage from "next/image";
import Link from "next/link";

const BlurTool = () => {
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ▼▼▼ ズーム機能用のStateとRef ▼▼▼
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // ▲▲▲ 追加終わり ▲▲▲

  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(50);
  const [lastDrawTime, setLastDrawTime] = useState(0);
  const [previewCircle, setPreviewCircle] = useState<{
    radius: number;
    visible: boolean;
  } | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dpr, setDpr] = useState(1);

  // Optimized undo/redo system
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 50;

  // ===== キャンバス状態を保存 =====
  const saveCanvasState = useCallback(() => {
    if (!workingCanvasRef.current) return;

    const workingCanvas = workingCanvasRef.current;
    const dataUrl = workingCanvas.toDataURL();

    setCanvasHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);

      if (newHistory.length > maxHistorySteps) {
        newHistory.shift();
      }

      return newHistory;
    });

    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // ===== 元に戻す =====
  const undoLastAction = useCallback(() => {
    setCanvasHistory((prevHistory) => {
      const newIndex = historyIndex - 1;
      if (newIndex < 0) return prevHistory;

      const previousState = prevHistory[newIndex];

      if (!workingCanvasRef.current || !canvasRef.current) return prevHistory;

      const workingCanvas = workingCanvasRef.current;
      const workingCtx = workingCanvas.getContext("2d");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!workingCtx || !ctx) return prevHistory;

      const img = new Image();
      img.onload = () => {
        workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
        workingCtx.drawImage(img, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(workingCanvas, 0, 0);

        setHistoryIndex(newIndex);
      };
      img.src = previousState;

      return prevHistory;
    });
  }, [historyIndex]);

  // ===== やり直し =====
  const redoLastAction = useCallback(() => {
    setCanvasHistory((prevHistory) => {
      const newIndex = historyIndex + 1;
      if (newIndex >= prevHistory.length) return prevHistory;

      const nextState = prevHistory[newIndex];

      if (!workingCanvasRef.current || !canvasRef.current) return prevHistory;

      const workingCanvas = workingCanvasRef.current;
      const workingCtx = workingCanvas.getContext("2d");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!workingCtx || !ctx) return prevHistory;

      const img = new Image();
      img.onload = () => {
        workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
        workingCtx.drawImage(img, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(workingCanvas, 0, 0);

        setHistoryIndex(newIndex);
      };
      img.src = nextState;

      return prevHistory;
    });
  }, [historyIndex]);

  // キャンバス初期化と描画
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      originalImageRef.current = img;

      if (!workingCanvasRef.current) {
        workingCanvasRef.current = document.createElement("canvas");
      }
      const workingCanvas = workingCanvasRef.current;
      workingCanvas.width = canvas.width;
      workingCanvas.height = canvas.height;
      const workingCtx = workingCanvas.getContext("2d");
      if (!workingCtx) return;

      workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
      workingCtx.drawImage(img, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);

      saveCanvasState();
    };

    img.src = imageSrc;
  }, [imageSrc]); // saveCanvasStateは依存配列から除外

  // ===== キーボードショートカット =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLastAction();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        redoLastAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoLastAction, redoLastAction]);

  // ▼▼▼ ズーム操作 (Ctrl + Wheel) ▼▼▼
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        setZoom((prevZoom) => {
          const newZoom = prevZoom + delta;
          return Math.min(Math.max(newZoom, 0.1), 5);
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [imageSrc]);
  // ▲▲▲ 追加終わり ▲▲▲

  // ===== ファイルアップロード処理 =====
  const processFile = (file: File) => {
    if (!file.type.match("image.*")) {
      alert("画像ファイルを選択してください（JPG/PNGなど）");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        setImageSrc(event.target.result);
        setZoom(1);

        if (workingCanvasRef.current) {
          const workingCanvas = workingCanvasRef.current;
          const workingCtx = workingCanvas.getContext("2d");
          if (workingCtx) {
            workingCtx.clearRect(
              0,
              0,
              workingCanvas.width,
              workingCanvas.height
            );
            setCanvasHistory([]);
            setHistoryIndex(-1);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageSrc) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ===== 座標計算 =====
  const getCanvasDisplayScale = () => {
    if (!canvasRef.current || !imageSrc) return 1;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const actualWidth = canvas.width;
    const displayWidth = rect.width;
    return displayWidth / actualWidth;
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const actualWidth = canvas.width;
    const actualHeight = canvas.height;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  // ===== ブラシぼかし適用（修正版） =====
  const applyBlurAt = (x: number, y: number) => {
    if (
      !workingCanvasRef.current ||
      !originalImageRef.current ||
      !canvasRef.current
    )
      return;

    const workingCanvas = workingCanvasRef.current;
    const workingCtx = workingCanvas.getContext("2d");
    if (!workingCtx) return;

    const displayScale = getCanvasDisplayScale();
    const physicalBlurSize = blurSize / displayScale;
    const radius = physicalBlurSize / 2;

    // 【修正ポイント】
    // ぼかし処理の際に、周囲の色を引き込むための「余白（padding）」を設定します。
    // これにより、ぼかし強度が強いときに端が透明になって薄く見える現象を防ぎます。
    const padding = blurRadius * 3; // ぼかし半径の3倍程度あれば十分
    const bufferSize = physicalBlurSize + padding * 2;

    // ● ぼかし用の一時正方形キャンバス（余白込みのサイズ）
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = bufferSize;
    blurCanvas.height = bufferSize;
    const blurCtx = blurCanvas.getContext("2d");
    if (!blurCtx) return;

    // 1. WorkingCanvasから、ブラシ範囲より「広い」領域をコピーしてぼかしをかける
    // フィルターを設定
    blurCtx.filter = `blur(${blurRadius}px)`;

    // コピー元の座標（中心から半径+余白分ずらす）
    const srcX = x - radius - padding;
    const srcY = y - radius - padding;

    // 画像を描画（この時点でフィルターがかかる）
    blurCtx.drawImage(
      workingCanvas,
      srcX,
      srcY,
      bufferSize,
      bufferSize,
      0,
      0,
      bufferSize,
      bufferSize
    );

    // 2. WorkingCanvasに円形でクリップして、バッファの中心部分を描き戻す
    workingCtx.save();

    // 円形のクリップパスを作成
    workingCtx.beginPath();
    workingCtx.arc(x, y, radius, 0, Math.PI * 2);
    workingCtx.closePath();
    workingCtx.clip();

    // バッファから中心部分（余白を除いた部分）のみを転送
    // バッファ内のソース座標: padding, padding
    // 描画先の座標: x - radius, y - radius
    workingCtx.globalCompositeOperation = "source-over";
    workingCtx.drawImage(
      blurCanvas,
      padding,
      padding,
      physicalBlurSize,
      physicalBlurSize,
      x - radius,
      y - radius,
      physicalBlurSize,
      physicalBlurSize
    );

    workingCtx.restore();

    // 3. 表示更新
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);
    }

    // 4. 履歴保存
    const now = Date.now();
    if (now - lastDrawTime > 300) {
      saveCanvasState();
      setLastDrawTime(now);
    }
  };

  // ===== キャンバス操作ハンドラ =====
  const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageSrc) return;
    const coords =
      "touches" in e
        ? getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY)
        : getCanvasCoords(e.clientX, e.clientY);

    setIsMouseDown(true);
    setMousePos(coords);
    applyBlurAt(coords.x, coords.y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageSrc) return;
    const coords =
      "touches" in e
        ? getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY)
        : getCanvasCoords(e.clientX, e.clientY);

    setMousePos(coords);

    if (isMouseDown) {
      const now = Date.now();
      if (now - lastDrawTime > 50) {
        applyBlurAt(coords.x, coords.y);
        setLastDrawTime(now);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
    saveCanvasState();
  };

  // ===== ダウンロード =====
  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "blurred-image.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // ===== スライダー =====
  const handleBlurRadiusChange = (_: Event, newValue: number | number[]) => {
    setBlurRadius(newValue as number);
  };

  const handleBlurSizeChangeWithPreview = (
    _: Event,
    newValue: number | number[]
  ) => {
    const value = newValue as number;
    setBlurSize(value);

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    const cssRadius = value / 2;

    setPreviewCircle({ radius: cssRadius, visible: true });
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewCircle(null);
      previewTimeoutRef.current = null;
    }, 3000);
  };

  // dpr 監視
  useEffect(() => {
    const handleResize = () => {
      setDpr(window.devicePixelRatio || 1);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        pb: 4,
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Link
              href="/"
              className="no-underline text-white flex items-center gap-2"
            >
              <NextImage
                src="/top-image.png"
                width={50}
                height={40}
                alt="logo"
                priority
              />
              <Typography
                variant="body1"
                sx={{
                  color: "text.primary",
                  display: { xs: "none", sm: "block" },
                }}
              >
                画像ぼかし
              </Typography>
            </Link>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="もとに戻す" arrow>
                <IconButton
                  aria-label="元に戻す"
                  onClick={undoLastAction}
                  disabled={historyIndex <= 0}
                >
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="やり直す" arrow>
                <IconButton
                  aria-label="やり直す"
                  onClick={redoLastAction}
                  disabled={historyIndex >= canvasHistory.length - 1}
                >
                  <RedoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="画像を変更" arrow>
                <IconButton
                  aria-label="画像を変更"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadFileIcon />
                </IconButton>
              </Tooltip>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 12 }}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "background.default",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 12 }}>
                      {/* 強度スライダー */}
                      <Typography variant="subtitle2" gutterBottom>
                        ぼかし強度: {blurRadius}px
                      </Typography>
                      <Slider
                        value={blurRadius}
                        onChange={handleBlurRadiusChange}
                        min={5}
                        max={100} // 強度の最大値を少し増やしました
                        step={1}
                        color="primary"
                        sx={{
                          color: theme.palette.primary.main,
                          "& .MuiSlider-thumb": {
                            width: 20,
                            height: 20,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 12 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        サイズ: {blurSize}px
                      </Typography>
                      <Slider
                        value={blurSize}
                        onChange={handleBlurSizeChangeWithPreview}
                        min={5}
                        max={300}
                        step={5}
                        color="secondary"
                        sx={{
                          color: theme.palette.secondary.main,
                          "& .MuiSlider-thumb": {
                            width: 20,
                            height: 20,
                          },
                        }}
                      />
                      {previewCircle && (
                        <Box
                          sx={{
                            position: "fixed",
                            top: { xs: "30%", sm: "40%" },
                            left: "50%",
                            transform: `translate(-50%, -50%) scale(${
                              previewCircle.visible ? 1 : 0.9
                            })`,
                            width: previewCircle.radius * 2,
                            height: previewCircle.radius * 2,
                            borderRadius: "50%",
                            border: "2px dashed #1976d2",
                            backgroundColor: "rgba(25, 118, 210, 0.08)",
                            pointerEvents: "none",
                            zIndex: 1300,
                            opacity: previewCircle.visible ? 1 : 0,
                            transition:
                              "opacity 0.3s ease, transform 0.3s ease",
                          }}
                        />
                      )}
                    </Grid>
                  </Grid>
                </Box>

                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    position: "relative",
                    bgcolor: isDragOver
                      ? alpha(theme.palette.primary.main, 0.05)
                      : "transparent",
                  }}
                >
                  {imageSrc ? (
                    <Box
                      sx={{
                        p: 1,
                        display: { xs: "flex", sm: "flex" },
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        bgcolor: isDragOver
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "grey.100",
                        border: isDragOver
                          ? `3px dashed ${theme.palette.primary.main}`
                          : "none",
                        borderRadius: 2,
                        transition: "border 0.2s ease",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          width: "100%",
                          mb: 1,
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", mr: 2 }}
                        >
                          {(zoom * 100).toFixed(0)}%
                        </Typography>

                        <Tooltip title="もとに戻す" arrow>
                          <IconButton
                            aria-label="元に戻す"
                            onClick={undoLastAction}
                            disabled={historyIndex <= 0}
                          >
                            <UndoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ダウンロード" arrow>
                          <IconButton
                            aria-label="ダウンロード"
                            onClick={downloadImage}
                            disabled={historyIndex <= 0}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="画像を変更" arrow>
                          <IconButton
                            aria-label="画像を変更"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <UploadFileIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Box
                        ref={scrollContainerRef}
                        sx={{
                          width: "100%",
                          maxHeight: "100vh",
                          overflow: "auto",
                          display: "flex",
                          justifyContent: "flex-start",
                          alignItems: "flex-start",
                          bgcolor: "#eee",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          onTouchStart={handleCanvasMouseDown}
                          onTouchMove={(e) => {
                            e.preventDefault();
                            handleCanvasMouseMove(e);
                          }}
                          onTouchEnd={handleCanvasMouseUp}
                          style={{
                            width: `${zoom * 100}%`,
                            height: "auto",
                            cursor: isMouseDown ? "crosshair" : "crosshair",
                            display: "block",
                          }}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        p: 1,
                        position: "relative",
                        minHeight: { xs: 200, sm: 300, md: 400 },
                        display: { xs: "flex", sm: "flex" },
                        justifyContent: "center",
                        alignItems: "center",
                        flexWrap: "wrap",
                        overflow: "hidden",
                        bgcolor: isDragOver
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "grey.100",
                        border: isDragOver
                          ? `3px dashed ${theme.palette.primary.main}`
                          : "none",
                        borderRadius: 2,
                        transition: "border 0.2s ease",
                      }}
                    >
                      <Zoom in={!isDragOver} timeout={300}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            minHeight: { xs: 200, sm: 300, md: 400 },
                          }}
                        >
                          <Box>
                            <Box
                              sx={{
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mx: "auto",
                                mb: 2,
                              }}
                            >
                              <UploadIcon
                                sx={{
                                  fontSize: 32,
                                  color: theme.palette.primary.main,
                                }}
                                className="cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                              />
                            </Box>
                            <Typography
                              variant="h6"
                              color="text.secondary"
                              gutterBottom
                            >
                              画像をアップロード
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              ボタンをクリック、または画像をドラッグ＆ドロップ
                            </Typography>
                            <Box
                              component="span"
                              sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: "primary.main",
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: "0.85rem",
                                fontWeight: 600,
                              }}
                            >
                              対応フォーマット: JPG, PNG, WEBP
                            </Box>
                          </Box>
                        </Box>
                      </Zoom>
                      {isDragOver && (
                        <Zoom in timeout={200}>
                          <Box>
                            <Typography
                              variant="h5"
                              color="primary"
                              sx={{ fontWeight: 700, mb: 1 }}
                            >
                              ここで放してください
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              画像をアップロードします
                            </Typography>
                          </Box>
                        </Zoom>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} 画像ぼかしツール |
            個人情報保護のための簡単な解決策
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default BlurTool;
