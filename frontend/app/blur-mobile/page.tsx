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

// キャンバス要素用のスタイル定義
const StyledCanvas = styled("canvas")({
  display: "block",
  touchAction: "none", // スマホでのスクロール防止
  maxWidth: "100%", // 画面からはみ出さないように制御
  height: "auto",
});

// プレビュー用の円の Props 型定義
interface BrushPreviewProps {
  size: number;
  x: number;
  y: number;
  opacity: number;
}

// プレビュー用の円スタイル（型定義を追加）
const BrushPreview = styled("div")<BrushPreviewProps>(
  ({ size, x, y, opacity }) => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    boxShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
    pointerEvents: "none", // クリックを透過させる
    transform: "translate(-50%, -50%)", // 中心基準で配置
    left: x,
    top: y,
    opacity: opacity,
    transition: "opacity 0.3s ease",
    zIndex: 10,
    display: opacity > 0 ? "block" : "none",
  }),
);

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 設定値の状態
  const [brushSize, setBrushSize] = useState(50); // ブラシサイズ (表示上の px)
  const [blurStrength, setBlurStrength] = useState(1.0); // ぼかしの強さ (0.1 ~ 1.0)

  // プレビュー表示の状態
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });

  // 2 つの Canvas を管理するための Ref
  const topCanvasRef = useRef<HTMLCanvasElement>(null); // 通常画像用（削る用・マスク）
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null); // ぼかし画像用（背景）
  const containerRef = useRef<HTMLDivElement>(null);

  // タップ判定用の座標保持
  const startPos = useRef<{ x: number; y: number } | null>(null);

  // プレビュー非表示タイマー用 Ref
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 画像のアップロード処理
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

  // 画像が読み込まれたら Canvas に描画（高画質化ロジック）
  useEffect(() => {
    if (!imageSrc || !topCanvasRef.current || !bottomCanvasRef.current) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const topCanvas = topCanvasRef.current;
      const bottomCanvas = bottomCanvasRef.current;
      const container = containerRef.current;

      if (!topCanvas || !bottomCanvas || !container) return;

      const topCtx = topCanvas.getContext("2d");
      const bottomCtx = bottomCanvas.getContext("2d");

      if (!topCtx || !bottomCtx) return;

      // 1. キャンバスの内部解像度を実画像サイズに設定（高画質化の鍵）
      const displayWidth = container.clientWidth;
      const scale = displayWidth / img.width;
      const displayHeight = img.height * scale;

      // 内部解像度 = 実画像サイズ
      topCanvas.width = img.width;
      topCanvas.height = img.height;
      bottomCanvas.width = img.width;
      bottomCanvas.height = img.height;

      // 表示サイズ（CSS）= コンテナに収まるサイズ
      topCanvas.style.width = `${displayWidth}px`;
      topCanvas.style.height = `${displayHeight}px`;
      bottomCanvas.style.width = `${displayWidth}px`;
      bottomCanvas.style.height = `${displayHeight}px`;

      // 2. 下の Canvas に通常画像を描画
      bottomCtx.drawImage(img, 0, 0, img.width, img.height);
      bottomCanvas.style.filter = "blur(20px)";

      // 3. 上の Canvas に通常画像を描画
      topCtx.drawImage(img, 0, 0, img.width, img.height);
    };
  }, [imageSrc]);

  // プレビュー表示制御ヘルパー
  const showPreview = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // コンテナ内の相対座標を計算
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setPreviewPos({ x, y, visible: true });

    // 既存のタイマーをクリア
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    // 2 秒後にプレビューを非表示
    previewTimerRef.current = setTimeout(() => {
      setPreviewPos((prev) => ({ ...prev, visible: false }));
    }, 2000);
  };

  // 座標変換ヘルパー
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = topCanvasRef.current;
    if (!canvas) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y, scaleX, scaleY };
  };

  // 描画開始
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    startPos.current = { x, y }; // タップ判定用に開始位置を保存
    draw(e);

    // 描画中はプレビューを即時非表示（カーソルと被らないように）
    setPreviewPos((prev) => ({ ...prev, visible: false }));
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  };

  // 描画終了
  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const ctx = topCanvasRef.current?.getContext("2d");
    if (!ctx || !startPos.current) return;

    const { x: endX, y: endY } = getCoordinates(e);

    // タップ判定：移動距離が小さい場合はタップとして処理
    const dist = Math.sqrt(
      Math.pow(endX - startPos.current.x, 2) +
        Math.pow(endY - startPos.current.y, 2),
    );

    // 閾値 10px 以下ならタップとみなす
    if (dist < 10) {
      tapBlur(endX, endY);
    }

    ctx.beginPath(); // パスをリセット
    startPos.current = null;
  };

  // タップによるぼかし処理（円を描画）
  const tapBlur = (x: number, y: number) => {
    const canvas = topCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const averageScale =
      (canvas.width / canvas.getBoundingClientRect().width +
        canvas.height / canvas.getBoundingClientRect().height) /
      2;
    // state の brushSize を使用して半径を計算
    const radius = (brushSize / 2) * averageScale;

    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = blurStrength; // 強さを適用
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.fill();

    // リセット
    ctx.globalAlpha = 1.0;
  };

  // 描画処理（スワイプ）
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !topCanvasRef.current) return;

    const canvas = topCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y, scaleX, scaleY } = getCoordinates(e);

    // ブラシサイズの補正 (state の値を使用)
    const averageScale = (scaleX + scaleY) / 2;
    const brushSizeScaled = brushSize * averageScale;

    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = blurStrength; // 強さを適用
    ctx.lineWidth = brushSizeScaled;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // リセット
    ctx.globalAlpha = 1.0;
  };

  // リセット機能
  const handleReset = () => {
    if (!imageSrc || !topCanvasRef.current) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const topCtx = topCanvasRef.current?.getContext("2d");
      const width = topCanvasRef.current?.width || 0;
      const height = topCanvasRef.current?.height || 0;

      if (topCtx) {
        topCtx.globalCompositeOperation = "source-over";
        topCtx.drawImage(img, 0, 0, width, height);
      }
    };
  };

  // スライダーのラベル表示用
  const valLabel = (value: number) => {
    return value.toFixed(1);
  };

  // コンテナ上のポインター移動イベント（プレビュー表示用）
  const handleContainerPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (isDrawing) return; // 描画中はプレビューを出さない
    showPreview(e.clientX, e.clientY);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4, minHeight: "100vh" }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            高画質スワイプぼかし
          </Typography>

          {/* 画像アップロードエリア */}
          {!imageSrc && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                py: 4,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                高解像度の画像も綺麗に表示・処理できます
              </Typography>
              {isLoading ? (
                <CircularProgress />
              ) : (
                <Button
                  variant="contained"
                  component="label"
                  fullWidth
                  sx={{ maxWidth: 300 }}
                >
                  画像をアップロード
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageUpload}
                  />
                </Button>
              )}
            </Box>
          )}

          {/* キャンバス表示エリア */}
          {imageSrc && (
            <Box sx={{ mt: 2 }}>
              {/* 設定パネル */}
              <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography
                      gutterBottom
                      variant="body2"
                      color="text.secondary"
                    >
                      ブラシサイズ ({brushSize}px)
                    </Typography>
                    <Slider
                      value={brushSize}
                      onChange={(_, newValue) =>
                        setBrushSize(newValue as number)
                      }
                      aria-labelledby="brush-size-slider"
                      valueLabelDisplay="auto"
                      min={10}
                      max={200}
                      step={1}
                    />
                  </Box>
                  <Box>
                    <Typography
                      gutterBottom
                      variant="body2"
                      color="text.secondary"
                    >
                      ぼかしの強さ ({(blurStrength * 100).toFixed(0)}%)
                    </Typography>
                    <Slider
                      value={blurStrength}
                      onChange={(_, newValue) =>
                        setBlurStrength(newValue as number)
                      }
                      aria-labelledby="blur-strength-slider"
                      valueLabelDisplay="auto"
                      getAriaValueText={valLabel}
                      min={0.05}
                      max={1.0}
                      step={0.05}
                    />
                    <Typography variant="caption" color="text.secondary">
                      値が小さいほど、何度もなぞる必要があります
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* キャンバスコンテナ（相対配置） */}
              <Box
                ref={containerRef}
                sx={{
                  position: "relative",
                  width: "100%",
                  margin: "0 auto",
                  borderRadius: 2,
                  overflow: "hidden",
                  boxShadow: 1,
                  backgroundColor: "#f0f0f0",
                  cursor: isDrawing ? "none" : "default", // 描画中はカーソルを隠す
                }}
                onPointerMove={handleContainerPointerMove}
                onPointerLeave={() =>
                  setPreviewPos((prev) => ({ ...prev, visible: false }))
                }
              >
                {/* プレビュー表示要素 */}
                <BrushPreview
                  size={brushSize}
                  x={previewPos.x}
                  y={previewPos.y}
                  opacity={previewPos.visible ? 1 : 0}
                />

                {/* 下の Canvas (ぼかし画像) */}
                <StyledCanvas
                  ref={bottomCanvasRef}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                />

                {/* 上の Canvas (通常画像・操作用) */}
                <StyledCanvas
                  ref={topCanvasRef}
                  sx={{
                    position: "relative",
                    zIndex: 2,
                    cursor: "crosshair",
                    width: "auto",
                    height: "auto",
                    touchAction: "none",
                  }}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
              </Box>

              {/* コントロールボタン */}
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                sx={{ mt: 3 }}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleReset}
                >
                  リセット
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setImageSrc(null)}
                >
                  画像を変更
                </Button>
              </Stack>

              <Typography
                variant="caption"
                display="block"
                align="center"
                sx={{ mt: 2, color: "text.secondary" }}
              >
                スワイプまたはタップでぼかしを適用できます
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ヒント用フロートボタン（装飾） */}
      {imageSrc && (
        <Fab
          color="primary"
          size="small"
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 10 }}
          onClick={() =>
            alert(
              "タップまたはスワイプでぼかしが入ります。設定で強さを変更できます。",
            )
          }
        >
          <TuneIcon />
        </Fab>
      )}
    </Container>
  );
}
