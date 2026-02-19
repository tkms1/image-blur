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
} from "@mui/material";
import { styled } from "@mui/material/styles";

// キャンバス要素用のスタイル定義
const StyledCanvas = styled("canvas")({
  display: "block",
  touchAction: "none", // スマホでのスクロール防止
  maxWidth: "100%", // 画面からはみ出さないように制御
  height: "auto",
});

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 2 つの Canvas を管理するための Ref
  const topCanvasRef = useRef<HTMLCanvasElement>(null); // 通常画像用（削る用・マスク）
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null); // ぼかし画像用（背景）
  const containerRef = useRef<HTMLDivElement>(null);

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
      // 注意：画像が極端に大きい場合（例：10000px）はパフォーマンスのため制限をかけるべきですが、
      // 今回は「画質をキープしたい」という要望なので、自然サイズを採用します。
      // 必要であれば max(4096, img.width) などに制限可能です。
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

      // CSS フィルタでぼかしを適用（内部解像度が高いため、ぼかしも綺麗にかかる）
      // 画像サイズが大きい場合、blur の値も大きくした方が良い場合がありますが、
      // ここでは CSS ピクセル基準で適用されるため、視覚的な調整が必要です。
      // 高解像度化により、相対的にぼかしが弱く見える可能性があるため、値を少し大きめに設定しています。
      bottomCanvas.style.filter = "blur(20px)";

      // 3. 上の Canvas に通常画像を描画（これを削っていく）
      topCtx.drawImage(img, 0, 0, img.width, img.height);
    };
  }, [imageSrc]);

  // 描画開始
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  // 描画終了
  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = topCanvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath();
  };

  // 描画処理（スワイプ）
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !topCanvasRef.current) return;

    const canvas = topCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // 【重要】座標の補正
    // マウスの位置（CSS ピクセル）を、キャンバスの内部解像度（実ピクセル）に変換する
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // ブラシサイズの補正
    // 表示上の 40px を、内部解像度上のサイズに変換する
    // 平均スケールを使用して円に近いブラシを維持
    const averageScale = (scaleX + scaleY) / 2;
    const brushSize = 40 * averageScale;

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
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
              {/* キャンバスコンテナ（相対配置） */}
              <Box
                ref={containerRef}
                sx={{
                  position: "relative",
                  width: "100%",
                  margin: "0 auto",
                  borderRadius: 2,
                  overflow: "hidden", // はみ出し防止
                  boxShadow: 1,
                }}
              >
                {/* 下の Canvas (ぼかし画像) */}
                <StyledCanvas
                  ref={bottomCanvasRef}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    pointerEvents: "none", // 下のキャンバスは操作不可
                  }}
                />

                {/* 上の Canvas (通常画像・操作用) */}
                <StyledCanvas
                  ref={topCanvasRef}
                  sx={{
                    position: "relative",
                    zIndex: 2,
                    cursor: "crosshair",
                    // width/height は JS で制御するため、ここでは auto
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
                画像の上を指でなぞると、その部分がぼかされます
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
