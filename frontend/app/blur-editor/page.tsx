"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import BlurCanvas, { BlurCanvasRef } from "./BlurCanvas";
import BlurControls from "./BlurControls";

type BlurRegion = {
  id: string;
  type: "circle" | "line";
  x: number;
  y: number;
  radius: number;
  strength: number;
  x2?: number;
  y2?: number;
};

export default function BlurEditorPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>([]);
  const [blurRadius, setBlurRadius] = useState(50);
  const [blurStrength, setBlurStrength] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<BlurCanvasRef>(null); // ✅ BlurCanvas の ref

  // 画像アップロード（変更なし）
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match("image.*")) {
      setFileError("画像ファイルを選択してください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setBlurRegions([]);
      setFileError(null);
    };
    reader.onerror = () => setFileError("読み込み失敗");
    reader.readAsDataURL(file);
  };

  const handleImageUrlSubmit = () => {
    if (imageUrlInput) {
      setImageSrc(imageUrlInput);
      setBlurRegions([]);
    }
  };

  const addBlurRegion = (x: number, y: number) => {
    setBlurRegions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "circle",
        x,
        y,
        radius: blurRadius,
        strength: blurStrength,
      },
    ]);
  };

  const addLineBlurRegion = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    setBlurRegions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "line",
        x: start.x,
        y: start.y,
        x2: end.x,
        y2: end.y,
        radius: blurRadius,
        strength: blurStrength,
      },
    ]);
  };

  const updateBlurRegion = (id: string, updates: Partial<BlurRegion>) => {
    setBlurRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeBlurRegion = (id: string) => {
    setBlurRegions((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAll = () => setBlurRegions([]);

  // ✅ ダウンロード処理
  const handleDownload = async () => {
    if (!canvasRef.current || !imageSrc) return;

    setIsProcessing(true);

    // 少し待って canvas の再描画を保証（React のレンダリングサイクル）
    await new Promise((resolve) => setTimeout(resolve, 50));

    const dataUrl = canvasRef.current.exportImage();
    setIsProcessing(false);

    if (!dataUrl) {
      alert("画像の生成に失敗しました");
      return;
    }

    // ダウンロード実行
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `blurred-image-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }} suppressHydrationWarning>
      <Typography variant="h4" gutterBottom>
        クリックで円形ぼかし、ドラッグで線状ぼかし（サイズ固定）
      </Typography>

      {!imageSrc ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
          <Button variant="contained" component="label">
            画像を選択
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
            />
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="画像URL"
              size="small"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleImageUrlSubmit()}
            />
            <Button variant="outlined" onClick={handleImageUrlSubmit}>
              読み込み
            </Button>
          </Box>
          {fileError && <Alert severity="error">{fileError}</Alert>}
        </Box>
      ) : (
        <>
          <BlurControls
            blurRadius={blurRadius}
            blurStrength={blurStrength}
            onRadiusChange={setBlurRadius}
            onStrengthChange={setBlurStrength}
            onClearAll={clearAll}
          />

          {/* ✅ ダウンロードボタン */}
          <Box
            sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 2 }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleDownload}
              disabled={blurRegions.length === 0 || isProcessing}
              startIcon={
                isProcessing ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {isProcessing ? "生成中..." : "ダウンロード"}
            </Button>
            <Button variant="outlined" color="secondary" onClick={clearAll}>
              全てクリア
            </Button>
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            {/* ✅ ref で BlurCanvas を参照 */}
            <BlurCanvas
              ref={canvasRef}
              imageSrc={imageSrc}
              blurRegions={blurRegions}
              onAddBlur={addBlurRegion}
              onAddLineBlur={addLineBlurRegion}
              onUpdateBlur={updateBlurRegion}
              onRemoveBlur={removeBlurRegion}
            />
          </Box>
        </>
      )}
    </Box>
  );
}
