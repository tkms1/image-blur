"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Stack,
  CircularProgress,
  Slider,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

// -----------------------------------------------------------------------------
// ▼ ぼかし処理アルゴリズム (変更なし)
// -----------------------------------------------------------------------------
const applyBlurToImageData = (imageData: ImageData, radius: number) => {
  if (radius < 1) return;

  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;

  const iterations = 2;
  const r = Math.floor(radius / 2);

  for (let i = 0; i < iterations; i++) {
    boxBlurH(pixels, width, height, r);
    boxBlurT(pixels, width, height, r);
  }
};

const boxBlurH = (
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
) => {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < h; i++) {
    let ti = i * w,
      li = ti,
      ri = ti + r;
    const fv = pixels[ti * 4],
      fv1 = pixels[ti * 4 + 1],
      fv2 = pixels[ti * 4 + 2];
    const lv = pixels[(ti + w - 1) * 4],
      lv1 = pixels[(ti + w - 1) * 4 + 1],
      lv2 = pixels[(ti + w - 1) * 4 + 2];
    let val_r = (r + 1) * fv,
      val_g = (r + 1) * fv1,
      val_b = (r + 1) * fv2;
    for (let j = 0; j < r; j++) {
      val_r += pixels[(ti + j) * 4];
      val_g += pixels[(ti + j) * 4 + 1];
      val_b += pixels[(ti + j) * 4 + 2];
    }
    for (let j = 0; j <= r; j++) {
      val_r += pixels[ri++ * 4] - fv;
      val_g += pixels[(ri - 1) * 4 + 1] - fv1;
      val_b += pixels[(ri - 1) * 4 + 2] - fv2;
      pixels[ti * 4] = Math.round(val_r * iarr);
      pixels[ti * 4 + 1] = Math.round(val_g * iarr);
      pixels[ti * 4 + 2] = Math.round(val_b * iarr);
      ti++;
    }
    for (let j = r + 1; j < w - r; j++) {
      val_r += pixels[ri++ * 4] - pixels[li++ * 4];
      val_g += pixels[(ri - 1) * 4 + 1] - pixels[(li - 1) * 4 + 1];
      val_b += pixels[(ri - 1) * 4 + 2] - pixels[(li - 1) * 4 + 2];
      pixels[ti * 4] = Math.round(val_r * iarr);
      pixels[ti * 4 + 1] = Math.round(val_g * iarr);
      pixels[ti * 4 + 2] = Math.round(val_b * iarr);
      ti++;
    }
    for (let j = w - r; j < w; j++) {
      val_r += lv - pixels[li++ * 4];
      val_g += lv1 - pixels[(li - 1) * 4 + 1];
      val_b += lv2 - pixels[(li - 1) * 4 + 2];
      pixels[ti * 4] = Math.round(val_r * iarr);
      pixels[ti * 4 + 1] = Math.round(val_g * iarr);
      pixels[ti * 4 + 2] = Math.round(val_b * iarr);
      ti++;
    }
  }
};

const boxBlurT = (
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
) => {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < w; i++) {
    let ti = i,
      li = ti,
      ri = ti + r * w;
    const fv = pixels[ti * 4],
      fv1 = pixels[ti * 4 + 1],
      fv2 = pixels[ti * 4 + 2];
    const lv = pixels[(ti + w * (h - 1)) * 4],
      lv1 = pixels[(ti + w * (h - 1)) * 4 + 1],
      lv2 = pixels[(ti + w * (h - 1)) * 4 + 2];
    let val_r = (r + 1) * fv,
      val_g = (r + 1) * fv1,
      val_b = (r + 1) * fv2;
    for (let j = 0; j < r; j++) {
      val_r += pixels[(ti + j * w) * 4];
      val_g += pixels[(ti + j * w) * 4 + 1];
      val_b += pixels[(ti + j * w) * 4 + 2];
    }
    for (let j = 0; j <= r; j++) {
      val_r += pixels[ri * 4] - fv;
      val_g += pixels[ri * 4 + 1] - fv1;
      val_b += pixels[ri * 4 + 2] - fv2;
      pixels[ti * 4] = Math.round(val_r * iarr);
      pixels[ti * 4 + 1] = Math.round(val_g * iarr);
      pixels[ti * 4 + 2] = Math.round(val_b * iarr);
      ri += w;
      ti += w;
    }
    for (let j = r + 1; j < h - r; j++) {
      val_r += pixels[ri * 4] - pixels[li * 4];
      val_g += pixels[ri * 4 + 1] - pixels[li * 4 + 1];
      val_b += pixels[ri * 4 + 2] - pixels[li * 4 + 2];
      pixels[ti * 4] = Math.round(val_r * iarr);
      pixels[ti * 4 + 1] = Math.round(val_g * iarr);
      pixels[ti * 4 + 2] = Math.round(val_b * iarr);
      li += w;
      ri += w;
      ti += w;
    }
    for (let j = h - r; j < h; j++) {
      val_r += lv - pixels[li * 4];
      val_g += lv1 - pixels[li * 4 + 1];
      val_b += lv2 - pixels[li * 4 + 2];
      pixels[ti * 4] = Math.round(val_r * iarr);
      pixels[ti * 4 + 1] = Math.round(val_g * iarr);
      pixels[ti * 4 + 2] = Math.round(val_b * iarr);
      li += w;
      ti += w;
    }
  }
};
// -----------------------------------------------------------------------------

const StyledCanvas = styled("canvas")({
  display: "block",
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
});

interface BrushPreviewProps {
  size: number;
  x: number;
  y: number;
  opacity: number;
}

const BrushPreview = styled("div")<BrushPreviewProps>(
  ({ size, x, y, opacity }) => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    boxShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
    pointerEvents: "none",
    transform: "translate(-50%, -50%)",
    left: x,
    top: y,
    opacity: opacity,
    transition: "opacity 0.2s ease",
    zIndex: 20,
    display: opacity > 0 ? "block" : "none",
  }),
);

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);

  const MAX_CANVAS_SIZE = 1200;
  const MAX_HISTORY = 20;

  const [brushSize, setBrushSize] = useState(50);
  const [blurRadius, setBlurRadius] = useState(15);

  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    "auto",
  );

  // 履歴管理（ピクセル上書き方式のため ImageData を保持）
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --------------------------------------------------------------------------
  // 画像読み込みロジック（D&D対応）
  // --------------------------------------------------------------------------
  const loadNewImage = (file: File) => {
    if (!file.type.match("image.*")) {
      setFileError("画像ファイルを選択してください。");
      return;
    }
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setUndoStack([]);
        setRedoStack([]);
        setFileError(null);
        setIsLoading(false);
        setIsDragging(false);
        setIsDraggingOnCanvas(false);
      }
    };
    reader.onerror = () => {
      setFileError("読み込み失敗");
      setIsLoading(false);
      setIsDragging(false);
      setIsDraggingOnCanvas(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadNewImage(file);
  };

  // --------------------------------------------------------------------------
  // ドラッグ＆ドロップ（初期画面）
  // --------------------------------------------------------------------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) loadNewImage(files[0]);
  };

  // --------------------------------------------------------------------------
  // ドラッグ＆ドロップ（キャンバス画面）
  // --------------------------------------------------------------------------
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOnCanvas) setIsDraggingOnCanvas(true);
  };
  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnCanvas(false);
  };
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnCanvas(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) loadNewImage(files[0]);
  };

  // --------------------------------------------------------------------------
  // ▼ 画像読み込み時の初期化
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!imageSrc || !mainCanvasRef.current || !containerRef.current) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_CANVAS_SIZE) {
          height = Math.round(height * (MAX_CANVAS_SIZE / width));
          width = MAX_CANVAS_SIZE;
        }
      } else {
        if (height > MAX_CANVAS_SIZE) {
          width = Math.round(width * (MAX_CANVAS_SIZE / height));
          height = MAX_CANVAS_SIZE;
        }
      }

      imageRef.current = img;

      const mainCanvas = mainCanvasRef.current!;
      mainCanvas.width = width;
      mainCanvas.height = height;

      if (!tempCanvasRef.current) {
        tempCanvasRef.current = document.createElement("canvas");
      }
      tempCanvasRef.current.width = width;
      tempCanvasRef.current.height = height;

      const containerWidth = containerRef.current!.clientWidth;
      const scale = containerWidth / width;
      setContainerHeight(height * scale);

      const mainCtx = mainCanvas.getContext("2d");
      if (mainCtx) {
        mainCtx.drawImage(img, 0, 0, width, height);
      }
    };
  }, [imageSrc]);

  // --------------------------------------------------------------------------
  // ▼ 履歴 (Undo/Redo) 管理
  // --------------------------------------------------------------------------
  const saveHistory = () => {
    const canvas = mainCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack((prev) => {
        const next = [...prev, imageData];
        return next.slice(-MAX_HISTORY); // メモリ保護のため直近N件に制限
      });
      setRedoStack([]); // 新たな描画が始まったらRedoをリセット
    }
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      // 現在の状態をRedoに保存
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setRedoStack((prev) => [...prev, currentState]);

      // Undoから復元
      const previousState = undoStack[undoStack.length - 1];
      ctx.putImageData(previousState, 0, 0);
      setUndoStack((prev) => prev.slice(0, -1));
    }
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      // 現在の状態をUndoに保存
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack((prev) => [...prev, currentState]);

      // Redoから復元
      const nextState = redoStack[redoStack.length - 1];
      ctx.putImageData(nextState, 0, 0);
      setRedoStack((prev) => prev.slice(0, -1));
    }
  }, [redoStack]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // --------------------------------------------------------------------------
  // ▼ 描画ロジック
  // --------------------------------------------------------------------------
  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: x * scaleX, y: y * scaleY };
  };

  const paintBlur = (x: number, y: number) => {
    if (!mainCanvasRef.current || !tempCanvasRef.current) return;

    const mainCtx = mainCanvasRef.current.getContext("2d");
    const tempCtx = tempCanvasRef.current.getContext("2d");
    if (!mainCtx || !tempCtx) return;

    const canvas = mainCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;

    const r = (brushSize * scale) / 2;
    const size = Math.ceil(r * 2);
    const startX = Math.floor(x - r);
    const startY = Math.floor(y - r);

    const currentImageData = mainCtx.getImageData(startX, startY, size, size);
    applyBlurToImageData(currentImageData, blurRadius);

    tempCtx.clearRect(
      0,
      0,
      tempCanvasRef.current.width,
      tempCanvasRef.current.height,
    );
    tempCtx.putImageData(currentImageData, startX, startY);

    mainCtx.save();
    mainCtx.beginPath();
    mainCtx.arc(x, y, r, 0, Math.PI * 2);
    mainCtx.clip();
    mainCtx.drawImage(tempCanvasRef.current, 0, 0);
    mainCtx.restore();
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    saveHistory(); // ★ 描画開始前に履歴を保存
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    paintBlur(x, y);
    setPreviewPos((prev) => ({ ...prev, visible: false }));
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    paintBlur(x, y);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const handleContainerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPreviewPos({ x, y, visible: true });

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setPreviewPos((prev) => ({ ...prev, visible: false }));
    }, 1500);
  };

  const handleBrushSizeChange = (_: Event, newValue: number | number[]) => {
    const newSize = newValue as number;
    setBrushSize(newSize);

    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      setPreviewPos({ x: width / 2, y: height / 2, visible: true });

      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        setPreviewPos((prev) => ({ ...prev, visible: false }));
      }, 1500);
    }
  };

  const handleDownload = () => {
    if (!mainCanvasRef.current) return;

    setIsSaving(true);
    setTimeout(() => {
      const dataUrl = mainCanvasRef.current!.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      link.download = `blur-edited-${timestamp}.jpg`;
      link.href = dataUrl;
      link.click();
      setIsSaving(false);
    }, 100);
  };

  return (
    <Container maxWidth="md" sx={{ py: 3, minHeight: "100vh" }}>
      {!imageSrc ? (
        // ▼ 初期画面：ドラッグ＆ドロップ対応エリア
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mb: 4,
            p: 8,
            border: isDragging ? "2px dashed #1976d2" : "2px dashed #ccc",
            borderRadius: 2,
            backgroundColor: isDragging
              ? "rgba(25, 118, 210, 0.04)"
              : "transparent",
            transition: "all 0.2s ease",
            alignItems: "center",
          }}
        >
          <Typography variant="body1" align="center" color="text.secondary">
            {isDragging
              ? "ここにドロップして画像を読み込み 📤"
              : "画像をドラッグ＆ドロップするか、"}
          </Typography>

          <Button
            variant="contained"
            component="label"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            画像を選択
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
            />
          </Button>

          {fileError && <Alert severity="error">{fileError}</Alert>}
        </Box>
      ) : (
        // ▼ 編集画面
        <Box suppressHydrationWarning>
          {/* コントロールバー */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 2,
            }}
          >
            {/* スライダー群 */}
            <Box
              sx={{
                display: "flex",
                gap: 3,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="body2">
                  ブラシサイズ: {brushSize}px
                </Typography>
                <Slider
                  value={brushSize}
                  onChange={handleBrushSizeChange}
                  min={20}
                  max={150}
                />
              </Box>

              <Box sx={{ minWidth: 200 }}>
                <Typography variant="body2">
                  ぼかし強度: {blurRadius}
                </Typography>
                <Slider
                  value={blurRadius}
                  onChange={(_, v) => setBlurRadius(v as number)}
                  min={5}
                  max={50}
                />
              </Box>
            </Box>

            {/* アイコンボタン群 */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="元に戻す" arrow>
                <IconButton
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                >
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="やり直す" arrow>
                <IconButton
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                >
                  <RedoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="ダウンロード" arrow>
                <IconButton onClick={handleDownload} disabled={isSaving}>
                  {isSaving ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <DownloadIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="画像を変更" arrow>
                <IconButton onClick={() => fileInputRef.current?.click()}>
                  <UploadFileIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* 隠しインプット（アイコンからの画像変更用） */}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
          />

          {/* キャンバスエリア */}
          <Box
            ref={containerRef}
            onPointerMove={handleContainerMove}
            onPointerLeave={() =>
              setPreviewPos((p) => ({ ...p, visible: false }))
            }
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            sx={{
              position: "relative",
              width: "100%",
              margin: "0 auto",
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: "#f0f0f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              WebkitTapHighlightColor: "transparent",
              height: containerHeight,
              outline: isDraggingOnCanvas ? "2px dashed #1976d2" : "none",
              transition: "outline 0.2s ease",
            }}
          >
            {/* 画像変更用ドロップヒント（キャンバス上にドロップ中） */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                opacity: isDraggingOnCanvas ? 1 : 0,
                transition: "opacity 0.2s",
                pointerEvents: "none",
                zIndex: 10,
                bgcolor: "rgba(255,255,255,0.8)",
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              ここにドロップして画像を変更 🔄
            </Typography>

            <BrushPreview
              size={brushSize}
              x={previewPos.x}
              y={previewPos.y}
              opacity={previewPos.visible ? 1 : 0}
            />

            <StyledCanvas
              ref={mainCanvasRef}
              sx={{ touchAction: "none", cursor: "crosshair" }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            />
          </Box>
        </Box>
      )}

      {isLoading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography variant="body2">読み込み中...</Typography>
          </Stack>
        </Box>
      )}
    </Container>
  );
}
