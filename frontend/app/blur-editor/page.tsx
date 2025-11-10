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
  const [blurRadius, setBlurRadius] = useState(30);
  const [blurStrength, setBlurStrength] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [undoStack, setUndoStack] = useState<BlurRegion[][]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<BlurCanvasRef>(null);

  const pushToUndoStack = () => {
    setUndoStack((prev) => [...prev, blurRegions]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setBlurRegions(previous);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoStack]);

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
      setUndoStack([]);
      setFileError(null);
    };
    reader.onerror = () => setFileError("読み込み失敗");
    reader.readAsDataURL(file);
  };

  const handleImageUrlSubmit = () => {
    if (imageUrlInput) {
      setImageSrc(imageUrlInput);
      setBlurRegions([]);
      setUndoStack([]);
    }
  };

  const addBlurRegion = (x: number, y: number) => {
    pushToUndoStack();
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
    pushToUndoStack();
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
    pushToUndoStack();
    setBlurRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeBlurRegion = (id: string) => {
    pushToUndoStack();
    setBlurRegions((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAll = () => {
    if (blurRegions.length === 0) return;
    pushToUndoStack();
    setBlurRegions([]);
  };

  // ✅【新】画像を変更：編集画面 → 選択画面へ戻る
  const restartWithNewImage = () => {
    setImageSrc(null);
    setImageUrlInput("");
    setBlurRegions([]);
    setUndoStack([]);
    setFileError(null);
    // 必要なら input をクリア（UI同期のため）
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async () => {
    if (!canvasRef.current || !imageSrc) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const dataUrl = canvasRef.current.exportImage();
    setIsProcessing(false);

    if (!dataUrl) {
      alert("画像の生成に失敗しました");
      return;
    }

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

          {/* ボタン群 */}
          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
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

            <Button
              variant="outlined"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              元に戻す
            </Button>

            {/* <Button variant="outlined" onClick={clearAll}>
              全てクリア
            </Button> */}

            {/* ✅【新】画像を変更ボタン */}
            <Button
              variant="outlined"
              color="info"
              onClick={restartWithNewImage}
              // sx={{ minWidth: 140 }}
            >
              画像を変更
            </Button>
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
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
