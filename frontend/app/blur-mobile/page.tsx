"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Stack,
  CircularProgress,
  Slider,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

// キャンバスを包むコンテナ
const CanvasContainer = styled("div")({
  position: "relative",
  width: "100%",
  margin: "0 auto",
  borderRadius: 8,
  overflow: "hidden",
  backgroundColor: "#f0f0f0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  WebkitTapHighlightColor: "transparent",
});

// Canvasの共通スタイル
const StyledCanvas = styled("canvas")({
  display: "block",
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
});

// プレビュー用の円
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // スマホのメモリクラッシュ防止用サイズ制限
  const MAX_CANVAS_SIZE = 1200;

  const [brushSize, setBrushSize] = useState(50);
  const [blurStrength, setBlurStrength] = useState(1.0);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });

  // コンテナの高さを確保するためのステート
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    "auto",
  );

  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 画像読み込みとCanvas初期化
  useEffect(() => {
    if (
      !imageSrc ||
      !topCanvasRef.current ||
      !bottomCanvasRef.current ||
      !containerRef.current
    )
      return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // 1. リサイズ計算
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

      // 2. Canvasの内部解像度を設定
      const topCanvas = topCanvasRef.current!;
      const bottomCanvas = bottomCanvasRef.current!;

      topCanvas.width = width;
      topCanvas.height = height;
      bottomCanvas.width = width;
      bottomCanvas.height = height;

      // 3. コンテナの表示サイズ計算（高さを確定させる）
      const containerWidth = containerRef.current!.clientWidth;
      const scale = containerWidth / width;
      const displayHeight = height * scale;
      setContainerHeight(displayHeight);

      // 4. 描画
      const topCtx = topCanvas.getContext("2d");
      const bottomCtx = bottomCanvas.getContext("2d");

      if (topCtx && bottomCtx) {
        // 下層：背景用画像を描画
        bottomCtx.drawImage(img, 0, 0, width, height);

        // ★アプリ上の見た目はCSSでぼかす（スムーズなぼかし）
        bottomCanvas.style.filter = "blur(15px)";

        // 上層：操作用画像を描画
        topCtx.globalCompositeOperation = "source-over";
        topCtx.drawImage(img, 0, 0, width, height);
      }
    };
  }, [imageSrc]);

  // 座標取得
  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = topCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: x * scaleX,
      y: y * scaleY,
    };
  };

  // 描画開始
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
    setPreviewPos((prev) => ({ ...prev, visible: false }));
  };

  // 描画処理
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !topCanvasRef.current) return;
    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = blurStrength;

    const canvas = topCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;

    ctx.lineWidth = brushSize * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.globalAlpha = 1.0;
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = topCanvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath();
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

  // ★修正箇所：ダウンロード機能（モザイク廃止・スムーズぼかし適用）
  const handleDownload = () => {
    if (!topCanvasRef.current || !bottomCanvasRef.current) return;

    const topCanvas = topCanvasRef.current;
    const bottomCanvas = bottomCanvasRef.current;
    const width = topCanvas.width;
    const height = topCanvas.height;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // 1. 背景のぼかしを描画
    // モザイク(縮小)を使わず、標準のfilter機能を使ってスムーズにぼかす
    // ※画像サイズを制限(1200px)しているため、スマホでも filter が動作する可能性が高い
    if (typeof ctx.filter !== "undefined") {
      ctx.filter = "blur(15px)"; // CSSと同じ値を指定
      ctx.drawImage(bottomCanvas, 0, 0);
      ctx.filter = "none";
    } else {
      // 万が一 filter が使えない古い端末用フォールバック
      // モザイクにならないよう、縮小率を緩和(0.1→0.25)して品質を上げる
      const blurScale = 0.25;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width * blurScale;
      tempCanvas.height = height * blurScale;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = "high";
        tempCtx.drawImage(
          bottomCanvas,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height,
        );
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    }

    // 2. その上に削った画像を重ねる
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(topCanvas, 0, 0);

    // 3. 保存
    const dataUrl = outputCanvas.toDataURL("image/jpeg", 0.9);
    const link = document.createElement("a");
    link.download = "blur-edited.jpg";
    link.href = dataUrl;
    link.click();
  };

  const handleReset = () => {
    if (!topCanvasRef.current || !imageRef.current) return;
    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(
      imageRef.current,
      0,
      0,
      topCanvasRef.current.width,
      topCanvasRef.current.height,
    );
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3, minHeight: "100vh" }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" align="center" gutterBottom>
            高画質ぼかし加工
          </Typography>

          {!imageSrc && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 5,
                gap: 2,
              }}
            >
              <Button variant="contained" component="label" size="large">
                画像を選択
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
            </Box>
          )}

          {imageSrc && (
            <Box>
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, bgcolor: "#fafafa" }}
              >
                <Typography variant="caption">
                  ブラシサイズ: {brushSize}px
                </Typography>
                <Slider
                  value={brushSize}
                  onChange={(_, v) => setBrushSize(v as number)}
                  min={20}
                  max={150}
                />
                <Typography variant="caption">ぼかし濃度</Typography>
                <Slider
                  value={blurStrength}
                  onChange={(_, v) => setBlurStrength(v as number)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                />
              </Paper>

              <CanvasContainer
                ref={containerRef}
                style={{ height: containerHeight }}
                onPointerMove={handleContainerMove}
                onPointerLeave={() =>
                  setPreviewPos((p) => ({ ...p, visible: false }))
                }
              >
                <BrushPreview
                  size={brushSize}
                  x={previewPos.x}
                  y={previewPos.y}
                  opacity={previewPos.visible ? 1 : 0}
                />
                <StyledCanvas ref={bottomCanvasRef} sx={{ zIndex: 1 }} />
                <StyledCanvas
                  ref={topCanvasRef}
                  sx={{ zIndex: 2, touchAction: "none", cursor: "crosshair" }}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
              </CanvasContainer>

              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                sx={{ mt: 3 }}
              >
                <Button variant="outlined" onClick={handleReset}>
                  元に戻す
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleDownload}
                >
                  保存
                </Button>
                <Button color="secondary" onClick={() => setImageSrc(null)}>
                  閉じる
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

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
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
}
