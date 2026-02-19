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
} from "@mui/material";
import { styled } from "@mui/material/styles";

// キャンバス要素用のスタイル定義（MUI の styled を使用）
// 通常の canvas タグとして動作させつつ、sx プロパティなどが使いやすくなります
const StyledCanvas = styled("canvas")({
  display: "block",
  touchAction: "none", // スマホでのスクロール防止
});

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 2 つの Canvas を管理するための Ref
  const topCanvasRef = useRef<HTMLCanvasElement>(null); // 通常画像用（削る用）
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null); // ぼかし画像用（背景）
  const containerRef = useRef<HTMLDivElement>(null);

  // 画像のアップロード処理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // 画像が読み込まれたら Canvas に描画
  useEffect(() => {
    if (!imageSrc || !topCanvasRef.current || !bottomCanvasRef.current) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const topCtx = topCanvasRef.current?.getContext("2d");
      const bottomCtx = bottomCanvasRef.current?.getContext("2d");
      const container = containerRef.current;

      if (!topCtx || !bottomCtx || !container) return;

      // コンテナの幅に合わせてリサイズ
      const maxWidth = container.clientWidth;
      const scale = maxWidth / img.width;
      const width = img.width * scale;
      const height = img.height * scale;

      // Canvas サイズを設定
      [topCanvasRef.current, bottomCanvasRef.current].forEach((canvas) => {
        if (canvas) {
          canvas.width = width;
          canvas.height = height;
          // 表示サイズも CSS で強制（高解像度ディスプレイ対応）
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
      });

      // 1. 下の Canvas に通常画像を描画（CSS でぼかす）
      bottomCtx.drawImage(img, 0, 0, width, height);
      if (bottomCanvasRef.current) {
        bottomCanvasRef.current.style.filter = "blur(15px)";
      }

      // 2. 上の Canvas に通常画像を描画
      topCtx.drawImage(img, 0, 0, width, height);
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

    const ctx = topCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const rect = topCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 40;
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
            スワイプでぼかし
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
                画像を選択してください
              </Typography>
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
                  // 高さなどは JS で制御するため、ここでは幅のみ制限
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
                    width: "100%", // 親に合わせて表示
                    height: "auto",
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
