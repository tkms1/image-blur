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
  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(40);

  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 30;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const settingsRef = useRef({
    blurRadius: 20,
    blurSize: 40,
    isDrawing: false,
    lastDrawTime: 0,
  });

  useEffect(() => {
    settingsRef.current.blurRadius = blurRadius;
    settingsRef.current.blurSize = blurSize;
  }, [blurRadius, blurSize]);

  // =========================
  // ぼかし処理
  // =========================
  const applyBlurAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const workingCanvas = workingCanvasRef.current;
    if (!canvas || !workingCanvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const { blurRadius, blurSize } = settingsRef.current;
    const radius = (blurSize * scaleX) / 2;

    const ctx = workingCanvas.getContext("2d");
    const displayCtx = canvas.getContext("2d");
    if (!ctx || !displayCtx) return;

    const tempCanvas = document.createElement("canvas");
    const size = blurSize * scaleX + blurRadius * 4;
    tempCanvas.width = size;
    tempCanvas.height = size;

    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return;

    tCtx.filter = `blur(${blurRadius}px)`;
    tCtx.drawImage(
      workingCanvas,
      x - size / 2,
      y - size / 2,
      size,
      size,
      0,
      0,
      size,
      size,
    );
    tCtx.filter = "none";

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tempCanvas, x - size / 2, y - size / 2);
    ctx.restore();

    displayCtx.clearRect(0, 0, canvas.width, canvas.height);
    displayCtx.drawImage(workingCanvas, 0, 0);
  };

  // =========================
  // タッチイベント（React方式）
  // =========================
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      settingsRef.current.isDrawing = true;
      const touch = e.touches[0];
      applyBlurAt(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (settingsRef.current.isDrawing && e.touches.length > 0) {
      const now = Date.now();
      if (now - settingsRef.current.lastDrawTime > 16) {
        const touch = e.touches[0];
        applyBlurAt(touch.clientX, touch.clientY);
        settingsRef.current.lastDrawTime = now;
      }
    }
  };

  const handleTouchEnd = () => {
    settingsRef.current.isDrawing = false;
  };

  // =========================
  // 画像読み込み
  // =========================
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;

      workingCanvasRef.current = document.createElement("canvas");
      workingCanvasRef.current.width = img.width;
      workingCanvasRef.current.height = img.height;

      const wCtx = workingCanvasRef.current.getContext("2d");
      const ctx = canvas.getContext("2d");
      if (!wCtx || !ctx) return;

      wCtx.drawImage(img, 0, 0);
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setImageSrc(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = () => {
    if (!workingCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = "blurred-image.png";
    link.href = workingCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", pb: 4 }}>
      <Container maxWidth="sm" sx={{ mt: 2 }}>
        <Card sx={{ p: 2 }}>
          {imageSrc ? (
            <Box sx={{ touchAction: "none" }}>
              <canvas
                ref={canvasRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  touchAction: "none",
                  WebkitTouchCallout: "none",
                  userSelect: "none",
                }}
              />
            </Box>
          ) : (
            <Box textAlign="center">
              <PhotoCameraIcon sx={{ fontSize: 60 }} />
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                画像を選択
              </Button>
            </Box>
          )}
        </Card>

        <Card sx={{ mt: 2, p: 2 }}>
          <Typography>ぼかし強度：{blurRadius}</Typography>
          <Slider
            value={blurRadius}
            min={5}
            max={50}
            onChange={(_, v) => setBlurRadius(v as number)}
          />

          <Typography>ブラシサイズ：{blurSize}</Typography>
          <Slider
            value={blurSize}
            min={10}
            max={150}
            onChange={(_, v) => setBlurSize(v as number)}
          />

          <Button
            startIcon={<DownloadIcon />}
            onClick={downloadImage}
            sx={{ mt: 2 }}
          >
            ダウンロード
          </Button>
        </Card>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          hidden
          onChange={handleImageUpload}
        />
      </Container>
    </Box>
  );
};

export default MobileBlurTool;
