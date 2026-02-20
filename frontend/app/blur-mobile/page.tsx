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

// -----------------------------------------------------------------------------
// ▼ ぼかし処理アルゴリズム (元のコードと同じBox Blur)
// -----------------------------------------------------------------------------
const applyBlurProcessing = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) => {
  // 半径が0以下の場合は何もしない
  if (radius < 1) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const iterations = 3;
  const r = Math.floor(radius / 2);

  for (let i = 0; i < iterations; i++) {
    boxBlurH(pixels, width, height, r);
    boxBlurT(pixels, width, height, r);
  }

  ctx.putImageData(imageData, 0, 0);
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
  // ★追加: ぼかし処理中かどうか（UIブロック用）
  const [isProcessingBlur, setIsProcessingBlur] = useState(false);

  const MAX_CANVAS_SIZE = 1200;

  const [brushSize, setBrushSize] = useState(50);
  // ★変更: ここを「ぼかし半径」として扱います (CSS blur(15px) は Radius 20-30px 相当)
  const [blurRadius, setBlurRadius] = useState(30);

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

  // 画像読み込み時 および ぼかし半径変更時の処理
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

      // 初回ロード時のみ imageRef を更新 (スライダー操作時は既存のimgを使う手もあるが、シンプルに再生成)
      imageRef.current = img;

      const topCanvas = topCanvasRef.current!;
      const bottomCanvas = bottomCanvasRef.current!;

      // キャンバスサイズが変わる場合のみセット（チラつき防止）
      if (topCanvas.width !== width || topCanvas.height !== height) {
        topCanvas.width = width;
        topCanvas.height = height;
        bottomCanvas.width = width;
        bottomCanvas.height = height;
      }

      const containerWidth = containerRef.current!.clientWidth;
      const scale = containerWidth / width;
      const displayHeight = height * scale;
      setContainerHeight(displayHeight);

      const topCtx = topCanvas.getContext("2d");
      const bottomCtx = bottomCanvas.getContext("2d");

      if (topCtx && bottomCtx) {
        // ▼ここが重要修正点▼

        // 1. Bottom Canvas（下層）：ここにJSで直接ぼかしを書き込む
        //    まず元画像を描画
        bottomCtx.drawImage(img, 0, 0, width, height);

        //    計算コストがかかるので少し非同期っぽくUIをブロック
        setIsProcessingBlur(true);
        setTimeout(() => {
          // 下層キャンバスのデータ自体をぼかす
          // これにより「画面上の見た目」と「データ」が一致する
          applyBlurProcessing(bottomCtx, width, height, blurRadius);
          setIsProcessingBlur(false);
        }, 10); // UIレンダリングをブロックしないようsetTimeout

        // 2. Top Canvas（上層）：元画像を鮮明に描画
        //    ユーザーはここを「消しゴム」で消していく
        //    再描画時は、既に描いた線が消えてしまわないように注意が必要
        //    → 今回は簡易実装のため、ぼかし変更時はリセットされる挙動とします
        //    （線を保持したい場合はレイヤー管理が複雑になるため）
        topCtx.globalCompositeOperation = "source-over";
        topCtx.drawImage(img, 0, 0, width, height);
      }
    };
  }, [imageSrc, blurRadius]); // blurRadiusが変わるたびに再計算

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

    // 「上層を消して、下層（ぼけた画像）を見せる」処理
    ctx.globalCompositeOperation = "destination-out";
    // 完全に透明にする（＝下のぼかしが100%見える）
    ctx.globalAlpha = 1.0;
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

  const handleDownload = () => {
    if (!topCanvasRef.current || !bottomCanvasRef.current || !imageRef.current)
      return;

    setIsSaving(true);

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

      // ▼ここも重要修正点▼
      // 以前のように「ここでぼかし計算」はしません。
      // BottomCanvasは既に画面上で「ぼかされたデータ」を持っているので
      // それをそのまま描画します。

      // 1. ぼかし背景（BottomCanvas）を描画
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(bottomCanvas, 0, 0);

      // 2. 穴あきの上層（TopCanvas）を重ねる
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

    // TopCanvasを元画像で塗りつぶし直す（＝穴を塞ぐ）
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
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
                <Typography variant="caption">ぼかしの強さ</Typography>
                {/* 
                  ユーザーがスライダーを離した時(onChangeCommitted)に更新するなど
                  パフォーマンス対策も可能ですが、ここではシンプルに実装
                */}
                <Slider
                  value={blurRadius}
                  onChange={(_, v) => setBlurRadius(v as number)}
                  min={5}
                  max={50}
                  disabled={isProcessingBlur}
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

                {/* 
                  ▼変更点: style={{ filter: "blur(...)" }} を削除 
                  BottomCanvas自体がJSでぼかされたデータを描画するため
                */}
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
                  disabled={isSaving || isProcessingBlur}
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

      {(isLoading || isSaving || isProcessingBlur) && (
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
            <Typography variant="body2">
              {isProcessingBlur
                ? "ぼかし処理中..."
                : isSaving
                  ? "画像を保存中..."
                  : "読み込み中..."}
            </Typography>
          </Stack>
        </Box>
      )}
    </Container>
  );
}
