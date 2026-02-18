"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Slider,
  IconButton,
  AppBar,
  Toolbar,
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "@mui/icons-material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

import NextImage from "next/image";
import Link from "next/link";

const MobileBlurTool = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // 描画状態の管理
  const isDrawingRef = useRef(false);

  // 座標・キャンバス参照
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 設定値
  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(40);
  const [lastDrawTime, setLastDrawTime] = useState(0);

  // プレビュー用サークル
  const [previewCircle, setPreviewCircle] = useState<{
    radius: number;
    visible: boolean;
  } | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 履歴管理 (Undo/Redo)
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 30;

  // ダウンロード設定
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [imageFormat, setImageFormat] = useState<"jpeg" | "png">("jpeg");
  const [imageQuality, setImageQuality] = useState(0.7);
  const [maxDimension, setMaxDimension] = useState(2048); // 最大辺の長さ

  // ===== キャンバス状態を保存 =====
  const saveCanvasState = useCallback(() => {
    if (!workingCanvasRef.current) return;

    const workingCanvas = workingCanvasRef.current;
    const dataUrl = workingCanvas.toDataURL("image/jpeg", 0.9);

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
      // 最大サイズに合わせてリサイズ
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      originalImageRef.current = img;

      if (!workingCanvasRef.current) {
        workingCanvasRef.current = document.createElement("canvas");
      }
      const workingCanvas = workingCanvasRef.current;
      workingCanvas.width = width;
      workingCanvas.height = height;
      const workingCtx = workingCanvas.getContext("2d");
      if (!workingCtx) return;

      workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
      workingCtx.drawImage(img, 0, 0, width, height);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);

      setCanvasHistory([]);
      setHistoryIndex(-1);
      const dataUrl = workingCanvas.toDataURL("image/jpeg", 0.9);
      setCanvasHistory([dataUrl]);
      setHistoryIndex(0);
    };

    img.src = imageSrc;
  }, [imageSrc, maxDimension]);

  // ===== ファイルアップロード処理 =====
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      alert("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        setImageSrc(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ===== 座標計算 =====
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  }, []);

  const getCanvasDisplayScale = useCallback(() => {
    if (!canvasRef.current || !imageSrc) return 1;
    const rect = canvasRef.current.getBoundingClientRect();
    return rect.width / canvasRef.current.width;
  }, [imageSrc]);

  // ===== ブラシぼかし適用 =====
  const applyBlurAt = useCallback(
    (x: number, y: number) => {
      if (!workingCanvasRef.current || !canvasRef.current) return;

      const workingCanvas = workingCanvasRef.current;
      const workingCtx = workingCanvas.getContext("2d");
      if (!workingCtx) return;

      const displayScale = getCanvasDisplayScale();
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
      if (now - lastDrawTime > 400) {
        saveCanvasState();
        setLastDrawTime(now);
      }
    },
    [
      blurRadius,
      blurSize,
      getCanvasDisplayScale,
      lastDrawTime,
      saveCanvasState,
    ],
  );

  // ===== ドローイング処理（useCallback でメモ化）=====
  const startDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageSrc) return;
      isDrawingRef.current = true;
      const coords = getCanvasCoords(clientX, clientY);
      applyBlurAt(coords.x, coords.y);
    },
    [imageSrc, getCanvasCoords, applyBlurAt],
  );

  const moveDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageSrc || !isDrawingRef.current) return;
      const coords = getCanvasCoords(clientX, clientY);

      const now = Date.now();
      if (now - lastDrawTime > 30) {
        applyBlurAt(coords.x, coords.y);
        setLastDrawTime(now);
      }
    },
    [imageSrc, getCanvasCoords, applyBlurAt, lastDrawTime],
  );

  const stopDrawing = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      saveCanvasState();
    }
  }, [saveCanvasState]);

  // ★★★★★ ネイティブタッチイベントハンドラ ★★★★★
  const handleNativeTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!imageSrc) return;
      e.preventDefault();
      if (e.touches.length > 0) {
        startDrawing(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [imageSrc, startDrawing],
  );

  const handleNativeTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!imageSrc || !isDrawingRef.current) return;
      e.preventDefault();
      if (e.touches.length > 0) {
        moveDrawing(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [imageSrc, moveDrawing],
  );

  const handleNativeTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing();
    },
    [stopDrawing],
  );

  // ★★★★★ useEffect でネイティブイベントを登録 ★★★★★
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("touchstart", handleNativeTouchStart, {
      passive: false,
    });
    canvas.addEventListener("touchmove", handleNativeTouchMove, {
      passive: false,
    });
    canvas.addEventListener("touchend", handleNativeTouchEnd, {
      passive: false,
    });
    canvas.addEventListener("touchcancel", handleNativeTouchEnd, {
      passive: false,
    });

    return () => {
      canvas.removeEventListener("touchstart", handleNativeTouchStart);
      canvas.removeEventListener("touchmove", handleNativeTouchMove);
      canvas.removeEventListener("touchend", handleNativeTouchEnd);
      canvas.removeEventListener("touchcancel", handleNativeTouchEnd);
    };
  }, [handleNativeTouchStart, handleNativeTouchMove, handleNativeTouchEnd]);

  // ===== ダウンロード（圧縮オプション付き）=====
  const downloadImage = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const mimeType = imageFormat === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mimeType, imageQuality);

    const link = document.createElement("a");
    link.download = `blurred-image.${imageFormat}`;
    link.href = dataUrl;
    link.click();

    // ファイルサイズの概算を表示（オプション）
    const fileSize = Math.round((dataUrl.length * 3) / 4 / 1024); // KB
    console.log(`ダウンロード完了: 約${fileSize}KB`);
  }, [imageFormat, imageQuality]);

  // ダウンロードダイアログを開く
  const handleDownloadClick = () => {
    setDownloadDialogOpen(true);
  };

  // ダウンロード設定を適用
  const handleDownloadConfirm = () => {
    setDownloadDialogOpen(false);
    downloadImage();
  };

  // ===== スライダー =====
  const handleBlurRadiusChange = useCallback(
    (_: Event, newValue: number | number[]) => {
      setBlurRadius(newValue as number);
    },
    [],
  );

  const handleBlurSizeChangeWithPreview = useCallback(
    (_: Event, newValue: number | number[]) => {
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
      }, 2000);
    },
    [],
  );

  // プレビュー用タイマーのクリーンアップ
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
        bgcolor: "grey.100",
        color: "text.primary",
        pb: 4,
      }}
    >
      {/* ヘッダー */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          top: 0,
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Link href="/" className="no-underline flex items-center">
              <NextImage
                src="/top-image.png"
                width={40}
                height={32}
                alt="logo"
                style={{ objectFit: "contain" }}
              />
            </Link>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              onClick={undoLastAction}
              disabled={historyIndex <= 0}
              color="primary"
              size="large"
            >
              <UndoIcon />
            </IconButton>
            <IconButton
              onClick={redoLastAction}
              disabled={historyIndex >= canvasHistory.length - 1}
              color="primary"
              size="large"
            >
              <RedoIcon />
            </IconButton>
            <IconButton
              onClick={handleDownloadClick}
              disabled={historyIndex < 0}
              color="primary"
              size="large"
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2, px: 2 }}>
        {/* 画像表示エリア */}
        <Card
          elevation={2}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            mb: 2,
            bgcolor: "#fff",
          }}
        >
          {imageSrc ? (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                touchAction: "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
                bgcolor: "#eee",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  WebkitTouchCallout: "none",
                  touchAction: "none",
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                height: 300,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "grey.50",
                p: 3,
                textAlign: "center",
              }}
            >
              <PhotoCameraIcon
                sx={{ fontSize: 60, color: "grey.300", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                画像をアップロードして
                <br />
                指でなぞってぼかします
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mt: 2, borderRadius: 8, px: 4, py: 1.5 }}
              >
                画像を選択
              </Button>
            </Box>
          )}
        </Card>

        {/* コントロールパネル */}
        <Card elevation={1} sx={{ borderRadius: 3, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ぼかしの強さ: {blurRadius}
            </Typography>
            <Slider
              value={blurRadius}
              onChange={handleBlurRadiusChange}
              min={5}
              max={50}
              size="medium"
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              ブラシサイズ: {blurSize}
            </Typography>
            <Slider
              value={blurSize}
              onChange={handleBlurSizeChangeWithPreview}
              min={10}
              max={150}
              color="secondary"
              size="medium"
            />
          </Box>

          {/* ブラシサイズプレビュー */}
          {previewCircle && (
            <Box
              sx={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: previewCircle.radius * 2,
                height: previewCircle.radius * 2,
                borderRadius: "50%",
                border: "2px dashed #1976d2",
                bgcolor: "rgba(25, 118, 210, 0.1)",
                pointerEvents: "none",
                zIndex: 9999,
                opacity: previewCircle.visible ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            />
          )}
        </Card>

        {/* 下部ボタン (画像変更) */}
        <Box sx={{ mt: 3, mb: 4, textAlign: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
          {imageSrc && (
            <Button
              variant="text"
              color="inherit"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              別の画像を選ぶ
            </Button>
          )}
        </Box>
      </Container>

      {/* ダウンロード設定ダイアログ */}
      <Dialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
      >
        <DialogTitle>ダウンロード設定</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mt: 2, width: "100%" }}>
            <FormLabel component="legend">画像形式</FormLabel>
            <RadioGroup
              value={imageFormat}
              onChange={(e) => setImageFormat(e.target.value as "jpeg" | "png")}
              row
            >
              <FormControlLabel
                value="jpeg"
                control={<Radio />}
                label="JPEG（容量小）"
              />
              <FormControlLabel
                value="png"
                control={<Radio />}
                label="PNG（容量大・高品質）"
              />
            </RadioGroup>

            {imageFormat === "jpeg" && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  画質: {Math.round(imageQuality * 100)}%
                </Typography>
                <Slider
                  value={imageQuality}
                  onChange={(_, value) => setImageQuality(value as number)}
                  min={0.3}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0.3, label: "30%" },
                    { value: 0.5, label: "50%" },
                    { value: 0.7, label: "70%" },
                    { value: 0.9, label: "90%" },
                    { value: 1, label: "100%" },
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  推奨: 70%（きれいで容量も抑えられます）
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                最大サイズ: {maxDimension}px
              </Typography>
              <Slider
                value={maxDimension}
                onChange={(_, value) => setMaxDimension(value as number)}
                min={1024}
                max={4096}
                step={512}
                marks={[
                  { value: 1024, label: "1K" },
                  { value: 2048, label: "2K" },
                  { value: 4096, label: "4K" },
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                推奨: 2048px（スマホには十分）
              </Typography>
            </Box>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDownloadConfirm} variant="contained">
            ダウンロード
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileBlurTool;
