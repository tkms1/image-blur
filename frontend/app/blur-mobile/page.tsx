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
// ▼ ぼかし処理アルゴリズム
// ImageDataを直接書き換えるように少し調整
// -----------------------------------------------------------------------------
const applyBlurToImageData = (imageData: ImageData, radius: number) => {
  if (radius < 1) return;

  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;

  // 処理速度と品質のバランスのためイテレーションは2回程度に
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

  const [brushSize, setBrushSize] = useState(50);
  const [blurRadius, setBlurRadius] = useState(15); // デフォルト値を少し下げておくと重ね塗りがしやすい

  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    "auto",
  );

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  // 一時的な描画作業用のキャンバス（画面には出さない）
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

      // 1. メインキャンバスのセットアップ
      const mainCanvas = mainCanvasRef.current!;
      mainCanvas.width = width;
      mainCanvas.height = height;

      // 2. 作業用Tempキャンバスのセットアップ（ブラシサイズ程度の小ささでもいいが、管理を楽にするため同じサイズに）
      if (!tempCanvasRef.current) {
        tempCanvasRef.current = document.createElement("canvas");
      }
      tempCanvasRef.current.width = width;
      tempCanvasRef.current.height = height;

      // コンテナ高さの調整
      const containerWidth = containerRef.current!.clientWidth;
      const scale = containerWidth / width;
      setContainerHeight(height * scale);

      const mainCtx = mainCanvas.getContext("2d");

      // 最初は元画像を描画
      if (mainCtx) {
        mainCtx.drawImage(img, 0, 0, width, height);
      }
    };
  }, [imageSrc]);

  // --------------------------------------------------------------------------
  // ▼ 描画ロジック（現在地をぼかして上書きする方式）
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

    // ブラシの半径
    const r = (brushSize * scale) / 2;
    // 処理範囲（ブラシ位置を中心とした正方形）
    const size = Math.ceil(r * 2);
    // 描画開始位置（整数座標に丸める）
    const startX = Math.floor(x - r);
    const startY = Math.floor(y - r);

    // 1. 現在のメインキャンバスから、ブラシ範囲の画像データを取得する
    // ※ ここで「現在の見た目（既にぼけているかもしれない）」を取得するのがポイント
    // ※ 画面外にはみ出るとエラーになる場合があるのでtry-catchまたは境界チェックが望ましいが、
    //    getImageDataは範囲外を透明ピクセルとして返してくれるため通常は動く
    const currentImageData = mainCtx.getImageData(startX, startY, size, size);

    // 2. 取得したデータに対して、さらにぼかし計算を行う (1+1=2)
    applyBlurToImageData(currentImageData, blurRadius);

    // 3. ぼかしたデータを一時キャンバスに配置
    //    (一時キャンバス全体をクリアしてから、必要な部分だけputする)
    tempCtx.clearRect(
      0,
      0,
      tempCanvasRef.current.width,
      tempCanvasRef.current.height,
    );
    tempCtx.putImageData(currentImageData, startX, startY);

    // 4. メインキャンバスに円形で書き戻す
    mainCtx.save();
    mainCtx.beginPath();
    mainCtx.arc(x, y, r, 0, Math.PI * 2);
    mainCtx.clip(); // 円形に切り抜く

    // 一時キャンバスの内容をメインキャンバスに合成
    // これにより、四角いImageDataを円形でペーストしたことになる
    mainCtx.drawImage(tempCanvasRef.current, 0, 0);

    mainCtx.restore();
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    paintBlur(x, y);
    setPreviewPos((prev) => ({ ...prev, visible: false }));
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    // パフォーマンス対策: ドラッグ中は計算負荷が高いため、
    // requestAnimationFrame等で制御するのが理想ですが、
    // シンプル実装のためそのまま呼び出します。重い場合はイテレーションやサイズを調整してください。
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

  const handleDownload = () => {
    if (!mainCanvasRef.current) return;

    setIsSaving(true);
    setTimeout(() => {
      const dataUrl = mainCanvasRef.current!.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.download = "blur-edited.jpg";
      link.href = dataUrl;
      link.click();
      setIsSaving(false);
    }, 100);
  };

  const handleReset = () => {
    if (!mainCanvasRef.current || !imageRef.current) return;
    const ctx = mainCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      imageRef.current,
      0,
      0,
      mainCanvasRef.current.width,
      mainCanvasRef.current.height,
    );
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3, minHeight: "100vh" }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" align="center" gutterBottom>
            高画質ぼかし加工（重ね塗り対応）
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

                <Typography variant="caption">追加するぼかしの強さ</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "text.secondary",
                    fontSize: "0.7rem",
                  }}
                >
                  ※何度もなぞると強くなります
                </Typography>
                <Slider
                  value={blurRadius}
                  onChange={(_, v) => setBlurRadius(v as number)}
                  min={5}
                  max={50}
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

                <StyledCanvas
                  ref={mainCanvasRef}
                  sx={{ touchAction: "none", cursor: "crosshair" }}
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
                  すべてリセット
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
            <Typography variant="body2">
              {isSaving ? "画像を保存中..." : "読み込み中..."}
            </Typography>
          </Stack>
        </Box>
      )}
    </Container>
  );
}
