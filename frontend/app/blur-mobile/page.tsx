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
  Fab,
  Slider,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import TuneIcon from "@mui/icons-material/Tune";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

// ★修正1: CanvasのCSS干渉を排除
// width/heightはJSですべて制御するため、CSSでのサイズ指定を削除
const StyledCanvas = styled("canvas")({
  display: "block",
  touchAction: "none", // スワイプ時のスクロール防止
  position: "absolute", // 重ね合わせのために絶対配置
  top: 0,
  left: 0,
});

// キャンバスを包むコンテナ（ここが表示サイズを決める）
const CanvasContainer = styled("div")({
  position: "relative",
  width: "100%",
  margin: "0 auto",
  borderRadius: 8,
  overflow: "hidden",
  backgroundColor: "#f0f0f0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  // タッチ操作時のハイライト等を無効化
  WebkitTapHighlightColor: "transparent",
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
    zIndex: 10,
    display: opacity > 0 ? "block" : "none",
  }),
);

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 画像の処理用サイズ（スマホのメモリ不足防止のため長辺をこのサイズに制限）
  const MAX_CANVAS_SIZE = 1200;

  const [brushSize, setBrushSize] = useState(50);
  const [blurStrength, setBlurStrength] = useState(1.0);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });

  // コンテナの実際のサイズを保持
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

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

  // 安全なぼかし処理（CSS filterが効かない場合のフォールバック付き）
  const applySafeBlur = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    // ほとんどのモダンブラウザはこれでOK
    if (typeof ctx.filter !== "undefined") {
      // 一度Canvasの内容を保存
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCanvas.getContext("2d")?.drawImage(canvas, 0, 0);

      // ぼかしを適用して再描画
      ctx.filter = "blur(15px)";
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.filter = "none";
    } else {
      // 古いブラウザ向け：縮小拡大法（今回はfilterが効く前提でOKだが念のため）
      // ...省略（iOS 14以降はfilter対応済み）
    }
  };

  // 画像描画＆キャンバス初期化（リサイズ処理入り）
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
      // ★修正2: 画像サイズを適切な大きさにリサイズしてCanvasの解像度とする
      // これにより座標計算のズレやスマホでのメモリクラッシュを防ぐ
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

      // 画像オブジェクトをリサイズ後のサイズ情報とともに保存（後で使うわけではないが念のため）
      imageRef.current = img;

      // キャンバスの実解像度を設定
      const topCanvas = topCanvasRef.current!;
      const bottomCanvas = bottomCanvasRef.current!;

      topCanvas.width = width;
      topCanvas.height = height;
      bottomCanvas.width = width;
      bottomCanvas.height = height;

      // コンテナの表示幅に合わせてCanvasの表示サイズ（CSS）を計算
      const containerWidth = containerRef.current!.clientWidth;
      const scale = containerWidth / width;
      const displayHeight = height * scale;

      // コンテナ自体の高さを確定させる
      setContainerSize({ width: containerWidth, height: displayHeight });

      // CSSスタイルとして適用（これで見た目と座標計算の基準が揃う）
      const styleWidth = `${containerWidth}px`;
      const styleHeight = `${displayHeight}px`;

      topCanvas.style.width = styleWidth;
      topCanvas.style.height = styleHeight;
      bottomCanvas.style.width = styleWidth;
      bottomCanvas.style.height = styleHeight;

      // 描画コンテキスト取得
      const topCtx = topCanvas.getContext("2d");
      const bottomCtx = bottomCanvas.getContext("2d");

      if (topCtx && bottomCtx) {
        // 画像を描画（リサイズサイズに合わせて描画）
        bottomCtx.drawImage(img, 0, 0, width, height);
        topCtx.drawImage(img, 0, 0, width, height);

        // ★修正3: ぼかし処理（Canvas上でフィルタをかける）
        // CSSのblurではなく、Canvas自体にぼかし効果を焼き付ける（互換性向上）
        applySafeBlur(bottomCanvas, bottomCtx, width, height);
      }
    };
  }, [imageSrc]);

  // 座標取得ロジック（ズレ解消の要）
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = topCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Canvas内の相対座標（CSSピクセル）
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // 内部解像度との比率
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: offsetX * scaleX,
      y: offsetY * scaleY,
    };
  };

  // 描画開始
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // スクロール防止
    setIsDrawing(true);

    const { x, y } = getCoordinates(e.clientX, e.clientY);
    startPos.current = { x, y };

    draw(e);
    setPreviewPos((prev) => ({ ...prev, visible: false }));
  };

  // 描画中
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // スクロール防止
    if (!isDrawing || !topCanvasRef.current) return;

    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e.clientX, e.clientY);

    // 描画設定（消しゴムモード）
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = blurStrength;

    // ブラシサイズの計算（内部解像度に合わせてスケール）
    const canvas = topCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const scaledBrushSize = brushSize * scale;

    ctx.lineWidth = scaledBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(x, y);
    ctx.stroke();

    // 次の線の始点を更新（スムーズな描画のため）
    ctx.beginPath();
    ctx.moveTo(x, y);

    ctx.globalAlpha = 1.0;
  };

  // 描画終了
  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const ctx = topCanvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath(); // パスを閉じる

    setIsDrawing(false);
    startPos.current = null;
  };

  // プレビュー表示（コンテナ上の動きを検知）
  const handlePointerMovePreview = (e: React.PointerEvent<HTMLDivElement>) => {
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

  // ダウンロード機能（修正済み：モザイク防止・ズレ防止）
  const handleDownload = () => {
    if (!topCanvasRef.current || !bottomCanvasRef.current) return;

    const topCanvas = topCanvasRef.current;
    const bottomCanvas = bottomCanvasRef.current;

    // 1. 出力用キャンバスを作成（現在のCanvas解像度と同じ）
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = topCanvas.width;
    tempCanvas.height = topCanvas.height;
    const ctx = tempCanvas.getContext("2d");

    if (!ctx) return;

    // 2. ぼかし済みの背景を描画
    // bottomCanvasは既に blur(15px) 相当の処理がなされているか、
    // useEffect内でフィルタが適用されている状態を描画する

    // 念のため、フィルタが画面上でしか適用されていない場合に備え、
    // 明示的に再度フィルタをかけて背景を作るアプローチをとる
    if (typeof ctx.filter !== "undefined") {
      ctx.filter = "blur(15px)";
      // 元画像データが必要だが、bottomCanvasには既に元画像がある
      ctx.drawImage(bottomCanvas, 0, 0);
      ctx.filter = "none";
    } else {
      // filter非対応環境用：単純にbottomCanvasを描画
      // (useEffectで既に加工されていればそれが使われる)
      ctx.drawImage(bottomCanvas, 0, 0);
    }

    // 3. 穴あき画像（編集結果）を上に重ねる
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(topCanvas, 0, 0);

    // 4. ダウンロード
    const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.9);
    const link = document.createElement("a");
    link.download = "edited-image.jpg";
    link.href = dataUrl;
    link.click();
  };

  // リセット
  const handleReset = () => {
    if (!topCanvasRef.current || !bottomCanvasRef.current) return;
    const topCtx = topCanvasRef.current.getContext("2d");
    const bottomCtx = bottomCanvasRef.current.getContext("2d");
    if (!topCtx || !bottomCtx) return;

    // 完全にクリアして再描画
    const width = topCanvasRef.current.width;
    const height = topCanvasRef.current.height;

    // 元の画像データを再利用するため、imageRefから取得
    if (imageRef.current) {
      topCtx.globalCompositeOperation = "source-over";
      topCtx.drawImage(imageRef.current, 0, 0, width, height);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{ py: 3, minHeight: "100vh", touchAction: "none" }}
    >
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
              {/* コントロールパネル */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, bgcolor: "#fafafa" }}
              >
                <Typography variant="caption" gutterBottom>
                  ブラシサイズ: {brushSize}px
                </Typography>
                <Slider
                  value={brushSize}
                  onChange={(_, v) => setBrushSize(v as number)}
                  min={20}
                  max={150}
                  size="small"
                />
                <Typography variant="caption" gutterBottom>
                  ぼかし濃度
                </Typography>
                <Slider
                  value={blurStrength}
                  onChange={(_, v) => setBlurStrength(v as number)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  size="small"
                />
              </Paper>

              {/* キャンバスエリア */}
              {/* コンテナの高さをJSで計算した値に固定し、レイアウト崩れを防ぐ */}
              <CanvasContainer
                ref={containerRef}
                style={{
                  height:
                    containerSize.height > 0 ? containerSize.height : "auto",
                }}
                onPointerMove={handlePointerMovePreview}
                onPointerLeave={() =>
                  setPreviewPos((p) => ({ ...p, visible: false }))
                }
              >
                {/* プレビュー円 */}
                <BrushPreview
                  size={brushSize}
                  x={previewPos.x}
                  y={previewPos.y}
                  opacity={previewPos.visible ? 1 : 0}
                />

                {/* 背景（ぼかし用） */}
                <StyledCanvas ref={bottomCanvasRef} />

                {/* 前景（操作用） */}
                <StyledCanvas
                  ref={topCanvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  style={{ cursor: "crosshair" }}
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
                  保存する
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
