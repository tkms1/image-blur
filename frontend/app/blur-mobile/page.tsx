"use client";
"use no memo";

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Slider,
  IconButton,
  useTheme,
  Tooltip,
  Grid,
  Container,
  AppBar,
  Toolbar,
  Button,
  Paper,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Refresh as RefreshIcon,
  BlurOn as BlurOnIcon,
} from "@mui/icons-material";

const BlurTool = () => {
  const theme = useTheme();
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // 描画状態の管理
  const isDrawingRef = useRef(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ズーム機能
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // ぼかし設定
  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(50);

  // 履歴管理 (Undo/Redo)
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 20;
  const [lastDrawTime, setLastDrawTime] = useState(0);

  // ===== キャンバス状態を保存 (Undo 用) =====
  const saveCanvasState = () => {
    if (!workingCanvasRef.current) return;
    const workingCanvas = workingCanvasRef.current;
    const dataUrl = workingCanvas.toDataURL();

    setCanvasHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > maxHistorySteps) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  };

  // ===== 元に戻す =====
  const undoLastAction = () => {
    setCanvasHistory((prevHistory) => {
      const newIndex = historyIndex - 1;
      if (newIndex < 0) return prevHistory;
      restoreHistory(prevHistory, newIndex);
      return prevHistory;
    });
  };

  // ===== やり直し =====
  const redoLastAction = () => {
    setCanvasHistory((prevHistory) => {
      const newIndex = historyIndex + 1;
      if (newIndex >= prevHistory.length) return prevHistory;
      restoreHistory(prevHistory, newIndex);
      return prevHistory;
    });
  };

  // 履歴復元ヘルパー
  const restoreHistory = (history: string[], index: number) => {
    const state = history[index];
    if (!workingCanvasRef.current || !canvasRef.current) return;

    const workingCanvas = workingCanvasRef.current;
    const workingCtx = workingCanvas.getContext("2d");
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!workingCtx || !ctx) return;

    const img = new Image();
    img.onload = () => {
      workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
      workingCtx.drawImage(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);
      setHistoryIndex(index);
    };
    img.src = state;
  };

  // キャンバス初期化と描画（高画質維持）
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
      setZoom(1);
    };
    img.src = imageSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  // ズーム操作 (Ctrl + Wheel)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setZoom((prevZoom) => Math.min(Math.max(prevZoom + delta, 0.1), 5));
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [imageSrc]);

  // ファイルアップロード処理
  const processFile = (file: File) => {
    if (!file.type.match("image.*")) {
      alert("画像ファイルを選択してください");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setCanvasHistory([]);
        setHistoryIndex(-1);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // 座標計算（ズーム倍率を考慮）
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  // ブラシぼかし適用ロジック
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

    const rect = canvasRef.current.getBoundingClientRect();
    const displayScale = rect.width / workingCanvas.width;
    const physicalBlurSize = blurSize / displayScale;
    const radius = physicalBlurSize / 2;

    const padding = blurRadius * 3;
    const bufferSize = physicalBlurSize + padding * 2;
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = bufferSize;
    blurCanvas.height = bufferSize;
    const blurCtx = blurCanvas.getContext("2d");
    if (!blurCtx) return;

    blurCtx.filter = `blur(${blurRadius}px)`;

    const srcX = x - radius - padding;
    const srcY = y - radius - padding;

    blurCtx.drawImage(
      workingCanvas,
      srcX,
      srcY,
      bufferSize,
      bufferSize,
      0,
      0,
      bufferSize,
      bufferSize,
    );

    workingCtx.save();
    workingCtx.beginPath();
    workingCtx.arc(x, y, radius, 0, Math.PI * 2);
    workingCtx.closePath();
    workingCtx.clip();

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
      physicalBlurSize,
    );
    workingCtx.restore();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);
    }

    const now = Date.now();
    if (now - lastDrawTime > 300) {
      saveCanvasState();
      setLastDrawTime(now);
    }
  };

  // イベントハンドラ
  const startDrawing = (clientX: number, clientY: number) => {
    if (!imageSrc) return;
    isDrawingRef.current = true;
    setIsMouseDown(true);
    const coords = getCanvasCoords(clientX, clientY);
    applyBlurAt(coords.x, coords.y);
  };

  const moveDrawing = (clientX: number, clientY: number) => {
    if (!imageSrc || !isDrawingRef.current) return;
    const coords = getCanvasCoords(clientX, clientY);

    const now = Date.now();
    if (now - lastDrawTime > 30) {
      applyBlurAt(coords.x, coords.y);
    }
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    setIsMouseDown(false);
    saveCanvasState();
  };

  const handleMouseDown = (e: React.MouseEvent) =>
    startDrawing(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) =>
    moveDrawing(e.clientX, e.clientY);

  // タッチイベント（スマホ用）
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      startDrawing(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      moveDrawing(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchEnd = () => stopDrawing();

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "blurred-image.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
      {/* ヘッダー */}
      <AppBar
        position="static"
        elevation={1}
        sx={{ bgcolor: "background.paper", color: "text.primary" }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}
          >
            <BlurOnIcon /> 高画質ぼかしツール
          </Typography>
          {imageSrc && (
            <Box>
              <Tooltip title="元に戻す">
                <IconButton
                  color="inherit"
                  onClick={undoLastAction}
                  disabled={historyIndex <= 0}
                >
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="やり直す">
                <IconButton
                  color="inherit"
                  onClick={redoLastAction}
                  disabled={historyIndex >= canvasHistory.length - 1}
                >
                  <RedoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="ダウンロード">
                <IconButton color="inherit" onClick={downloadImage}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card elevation={3}>
          <CardContent>
            {!imageSrc ? (
              // アップロード画面
              <Box
                sx={{
                  p: 6,
                  textAlign: "center",
                  border: 2,
                  borderColor: "divider",
                  borderRadius: 2,
                  borderStyle: "dashed",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon
                  sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h5" gutterBottom>
                  画像をアップロード
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  クリックまたはドラッグ＆ドロップ
                </Typography>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </Box>
            ) : (
              // 編集画面
              <Grid container spacing={2}>
                {/* 設定パネル */}
                <Grid size={{ xs: 12 }}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          ぼかし強度：{blurRadius}px
                        </Typography>
                        <Slider
                          value={blurRadius}
                          onChange={(_, val) => setBlurRadius(val as number)}
                          min={5}
                          max={100}
                          color="primary"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          ブラシサイズ：{blurSize}px
                        </Typography>
                        <Slider
                          value={blurSize}
                          onChange={(_, val) => setBlurSize(val as number)}
                          min={10}
                          max={300}
                          color="secondary"
                        />
                      </Grid>
                    </Grid>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mt: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        ズーム：{(zoom * 100).toFixed(0)}% (Ctrl + スクロール)
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => setImageSrc(null)}
                        color="error"
                      >
                        画像を変更
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                {/* キャンバスエリア */}
                <Grid size={{ xs: 12 }}>
                  <Box
                    ref={scrollContainerRef}
                    sx={{
                      width: "100%",
                      maxHeight: "70vh",
                      overflow: "auto",
                      bgcolor: "#eee",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      display: "flex",
                      justifyContent: "center",
                      p: 1,
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{
                        width: `${zoom * 100}%`,
                        height: "auto",
                        cursor: isMouseDown ? "crosshair" : "crosshair",
                        touchAction: "none",
                        userSelect: "none",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        backgroundColor: "#fff",
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    display="block"
                    align="center"
                    sx={{ mt: 1, color: "text.secondary" }}
                  >
                    画像上をなぞってぼかしを入れます。スマホではスクロールせずに操作できます。
                  </Typography>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default BlurTool;
