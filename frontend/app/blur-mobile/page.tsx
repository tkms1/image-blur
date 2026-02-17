"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Slider,
  IconButton,
  useTheme,
  AppBar,
  Toolbar,
  Container,
  Button,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const theme = useTheme();

  // === UI用 State ===
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(40);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);

  // プレビュー用
  const [previewCircle, setPreviewCircle] = useState<{
    radius: number;
    visible: boolean;
  } | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // === 内部ロジック用 Ref ===
  // イベントリスナー内から最新のStateにアクセスするためにRefを使用
  const stateRef = useRef({
    blurRadius: 20,
    blurSize: 40,
    imageSrc: null as string | null,
    historyIndex: -1,
    canvasHistory: [] as string[],
    isDrawing: false,
    lastDrawTime: 0,
  });

  // Stateが変化したらRefも更新する
  useEffect(() => {
    stateRef.current.blurRadius = blurRadius;
    stateRef.current.blurSize = blurSize;
    stateRef.current.imageSrc = imageSrc;
    // 履歴関係はsaveCanvasState内で直接Ref更新も行うため、ここは補助的
    stateRef.current.historyIndex = historyIndex;
    stateRef.current.canvasHistory = canvasHistory;
  }, [blurRadius, blurSize, imageSrc, historyIndex, canvasHistory]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const maxHistorySteps = 30;

  // ===== キャンバス状態を保存 (Ref経由で管理) =====
  const saveCanvasState = useCallback(() => {
    if (!workingCanvasRef.current) return;

    const workingCanvas = workingCanvasRef.current;
    const dataUrl = workingCanvas.toDataURL();

    // Refから現在の履歴を取得
    const currentIdx = stateRef.current.historyIndex;
    const currentHist = stateRef.current.canvasHistory;

    // 新しい履歴を作成
    const newHistory = currentHist.slice(0, currentIdx + 1);
    newHistory.push(dataUrl);

    if (newHistory.length > maxHistorySteps) {
      newHistory.shift();
    }

    const newIndex = newHistory.length - 1;

    // State更新 (UI用)
    setCanvasHistory(newHistory);
    setHistoryIndex(newIndex);

    // Ref更新 (即時反映用)
    stateRef.current.canvasHistory = newHistory;
    stateRef.current.historyIndex = newIndex;
  }, []);

  // ===== 元に戻す =====
  const undoLastAction = useCallback(() => {
    const currentIdx = stateRef.current.historyIndex;
    const history = stateRef.current.canvasHistory;

    const newIndex = currentIdx - 1;
    if (newIndex < 0) return;

    const previousState = history[newIndex];
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

      setHistoryIndex(newIndex);
      stateRef.current.historyIndex = newIndex; // Refも更新
    };
    img.src = previousState;
  }, []);

  // ===== やり直し =====
  const redoLastAction = useCallback(() => {
    const currentIdx = stateRef.current.historyIndex;
    const history = stateRef.current.canvasHistory;

    const newIndex = currentIdx + 1;
    if (newIndex >= history.length) return;

    const nextState = history[newIndex];
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

      setHistoryIndex(newIndex);
      stateRef.current.historyIndex = newIndex; // Refも更新
    };
    img.src = nextState;
  }, []);

  // 画像読み込み時の初期化
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

      // 履歴初期化
      const dataUrl = workingCanvas.toDataURL();
      const initialHistory = [dataUrl];
      setCanvasHistory(initialHistory);
      setHistoryIndex(0);

      stateRef.current.canvasHistory = initialHistory;
      stateRef.current.historyIndex = 0;
    };

    img.src = imageSrc;
  }, [imageSrc]);

  // ファイルアップロード
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match("image.*")) {
      alert("画像ファイルを選択してください");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageSrc(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ===== 描画ロジック (Refを使用) =====
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const applyBlurAt = (x: number, y: number) => {
    if (!workingCanvasRef.current || !canvasRef.current) return;

    const workingCanvas = workingCanvasRef.current;
    const workingCtx = workingCanvas.getContext("2d");
    if (!workingCtx) return;

    // Refから設定値を取得
    const { blurSize, blurRadius } = stateRef.current;

    const rect = canvasRef.current.getBoundingClientRect();
    const displayScale = rect.width / canvasRef.current.width;

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
    if (now - stateRef.current.lastDrawTime > 400) {
      saveCanvasState();
      stateRef.current.lastDrawTime = now;
    }
  };

  // ===== ネイティブイベントリスナーの設定 =====
  // Reactの合成イベントではなく、useEffectで直接addEventListenerすることで
  // passive: false を確実に適用し、スマホでのスクロールを防ぐ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      // スクロール等のデフォルト動作を無効化 (重要)
      if (e.cancelable) e.preventDefault();

      if (e.touches.length > 0 && stateRef.current.imageSrc) {
        stateRef.current.isDrawing = true;
        const touch = e.touches[0];
        const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
        applyBlurAt(x, y);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // スクロール等のデフォルト動作を無効化 (重要)
      if (e.cancelable) e.preventDefault();

      if (stateRef.current.isDrawing && e.touches.length > 0) {
        const touch = e.touches[0];
        const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);

        const now = Date.now();
        // 30ms間隔で間引き
        if (now - stateRef.current.lastDrawTime > 30) {
          applyBlurAt(x, y);
          stateRef.current.lastDrawTime = now;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (stateRef.current.isDrawing) {
        stateRef.current.isDrawing = false;
        saveCanvasState();
      }
    };

    // { passive: false } がスマホでのスクロール防止に必須
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    // マウス操作も一応サポートしておくとPCデバッグ時に便利
    // canvas.addEventListener("mousedown", ...);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [saveCanvasState]); // saveCanvasStateはuseCallbackされているので依存に入れてOK

  // ダウンロード
  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "blurred-image.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // スライダーUI
  const handleBlurRadiusChange = (_: Event, newValue: number | number[]) => {
    setBlurRadius(newValue as number);
  };
  const handleBlurSizeChange = (_: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setBlurSize(value);

    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    setPreviewCircle({ radius: value / 2, visible: true });
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewCircle(null);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", pb: 4 }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{ display: "flex", justifyContent: "space-between", px: 2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <NextImage
                src="/top-image.png"
                width={40}
                height={32}
                alt="logo"
                style={{ objectFit: "contain" }}
              />
            </Link>
          </Box>
          <Box>
            <IconButton
              onClick={undoLastAction}
              disabled={historyIndex <= 0}
              color="primary"
            >
              <UndoIcon />
            </IconButton>
            <IconButton
              onClick={redoLastAction}
              disabled={historyIndex >= canvasHistory.length - 1}
              color="primary"
            >
              <RedoIcon />
            </IconButton>
            <IconButton
              onClick={downloadImage}
              disabled={historyIndex < 0}
              color="primary"
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2, px: 2 }}>
        <Card
          elevation={2}
          sx={{ borderRadius: 3, overflow: "hidden", mb: 2, bgcolor: "#fff" }}
        >
          {imageSrc ? (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                bgcolor: "#eee",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                // CSSでもタッチアクションを無効化
                touchAction: "none",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  touchAction: "none", // 重要
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  WebkitTouchCallout: "none",
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
                sx={{ mt: 2, borderRadius: 8 }}
              >
                画像を選択
              </Button>
            </Box>
          )}
        </Card>

        <Card elevation={1} sx={{ borderRadius: 3, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ぼかし強度: {blurRadius}
            </Typography>
            <Slider
              value={blurRadius}
              onChange={handleBlurRadiusChange}
              min={5}
              max={50}
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              ブラシサイズ: {blurSize}
            </Typography>
            <Slider
              value={blurSize}
              onChange={handleBlurSizeChange}
              min={10}
              max={150}
              color="secondary"
            />
          </Box>
          {previewCircle && previewCircle.visible && (
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
              }}
            />
          )}
        </Card>

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
    </Box>
  );
};

export default MobileBlurTool;
