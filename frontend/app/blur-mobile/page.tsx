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

// スタイル定義
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const MAX_CANVAS_SIZE = 1200;
  // ★重要: CSSのblur(15px)と同等の見た目にするため、高解像度画像用には大きめの値を設定
  const [blurRadius, setBlurRadius] = useState(30);

  const [brushSize, setBrushSize] = useState(50);
  const [eraserOpacity, setEraserOpacity] = useState(1.0); // 変数名を分かりやすく変更（機能は同じ）
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });
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

  // -----------------------------------------------------------
  // 画像読み込みと初期描画（ここを修正）
  // -----------------------------------------------------------
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
      let width = img.width;
      let height = img.height;

      // リサイズ処理
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

      const topCanvas = topCanvasRef.current!;
      const bottomCanvas = bottomCanvasRef.current!;
      topCanvas.width = width;
      topCanvas.height = height;
      bottomCanvas.width = width;
      bottomCanvas.height = height;

      // 表示サイズ調整
      const containerWidth = containerRef.current!.clientWidth;
      const scale = containerWidth / width;
      const displayHeight = height * scale;
      setContainerHeight(displayHeight);

      const topCtx = topCanvas.getContext("2d");
      const bottomCtx = bottomCanvas.getContext("2d");

      if (topCtx && bottomCtx) {
        // ▼▼ 修正ポイント ▼▼
        // CSSフィルターではなく、Canvas自体にぼかしを描画します。
        // これにより「見えている画像」と「保存される画像」のデータが一致します。

        // 1. ボトム（ぼかし背景）の描画
        bottomCtx.save();
        bottomCtx.filter = `blur(${blurRadius}px)`; // 標準機能で高速・高品質なぼかし
        // 余白が出ないよう少し拡大して描画するか、端の処理が必要ですが、
        // 簡易的にそのまま描画します（端が少し薄くなる場合があります）
        bottomCtx.drawImage(img, 0, 0, width, height);
        bottomCtx.restore();

        // ※CSSのfilterは削除または無効化
        bottomCanvas.style.filter = "none";

        // 2. トップ（元画像）の描画
        topCtx.globalCompositeOperation = "source-over";
        topCtx.drawImage(img, 0, 0, width, height);
      }
    };
  }, [imageSrc, blurRadius]); // blurRadiusが変わったら再描画

  // ブラシプレビュー表示
  useEffect(() => {
    if (!containerRef.current || !imageSrc) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPreviewPos({ x: rect.width / 2, y: rect.height / 2, visible: true });
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setPreviewPos((prev) => ({ ...prev, visible: false }));
    }, 1500);
  }, [brushSize, imageSrc]);

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = topCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: x * scaleX, y: y * scaleY };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    if (!topCanvasRef.current) return;
    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    const canvas = topCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;

    // 「消しゴム」として機能させ、下のぼかしレイヤーを見せる
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = eraserOpacity;
    ctx.lineWidth = brushSize * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.arc(x, y, (brushSize * scale) / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);

    setPreviewPos((prev) => ({ ...prev, visible: false }));
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !topCanvasRef.current) return;
    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    const ctx = topCanvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath();
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

  // -----------------------------------------------------------
  // ダウンロード処理（ここを修正）
  // -----------------------------------------------------------
  const handleDownload = () => {
    if (!topCanvasRef.current || !bottomCanvasRef.current || !imageRef.current)
      return;

    setIsSaving(true);

    // 少し待ってUIの反応を確保
    setTimeout(() => {
      const topCanvas = topCanvasRef.current!;
      const bottomCanvas = bottomCanvasRef.current!;
      const width = topCanvas.width;
      const height = topCanvas.height;

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = width;
      outputCanvas.height = height;
      const ctx = outputCanvas.getContext("2d");

      if (!ctx) {
        setIsSaving(false);
        return;
      }

      // ▼▼ 修正ポイント ▼▼
      // 再度ぼかし計算をする必要はありません。
      // プレビューで見えている「既にぼやけたbottomCanvas」をそのまま使います。

      // 1. ぼかし済みの背景を描画
      ctx.drawImage(bottomCanvas, 0, 0);

      // 2. 穴あき加工された上のレイヤー（元画像）を重ねる
      ctx.drawImage(topCanvas, 0, 0);

      const dataUrl = outputCanvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.download = "blur-edited.jpg";
      link.href = dataUrl;
      link.click();

      setIsSaving(false);
    }, 100);
  };

  const handleReset = () => {
    if (!topCanvasRef.current || !imageRef.current) return;
    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;

    // トップキャンバス（鮮明な画像）をリセットして穴を埋める
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0; // reset alpha
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

                {/* 
                  以前の「ぼかし濃度」は globalAlpha（透かし具合）でしたが、
                  ユーザーの意図が「背景のぼけ具合」であればこちらを推奨します。
                  両方実装しても良いですが、ここでは「背景のぼかし強度」スライダーを追加しています。
                */}
                <Typography variant="caption">ぼかし強度（背景）</Typography>
                <Slider
                  value={blurRadius}
                  onChange={(_, v) => setBlurRadius(v as number)}
                  min={5}
                  max={50} // 30-50くらいがCSSのblur(15px)に近い見た目になります
                />

                <Typography variant="caption">修正強度（透明度）</Typography>
                <Slider
                  value={eraserOpacity}
                  onChange={(_, v) => setEraserOpacity(v as number)}
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
                  disabled={isSaving}
                >
                  {isSaving ? "処理中..." : "保存"}
                </Button>
                <Button color="secondary" onClick={() => setImageSrc(null)}>
                  閉じる
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {(isLoading || isSaving) && (
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
            {isSaving && (
              <Typography variant="body2">高画質保存中...</Typography>
            )}
          </Stack>
        </Box>
      )}
    </Container>
  );
}
