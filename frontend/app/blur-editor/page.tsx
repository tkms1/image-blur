"use client";

import { useState, useRef, useEffect, Fragment } from "react";
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
import UndoIcon from "@mui/icons-material/Undo";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AppHeaderClientOnly from "../_components/AppHeaderClientOnly";
import AppHeaderClientBlur from "../_components/AppHeaderClientBlur";

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
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);

  const [previewCircle, setPreviewCircle] = useState<{
    radius: number;
    visible: boolean;
  } | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<BlurCanvasRef>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const canvasDropZoneRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  const loadNewImage = (file: File) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPreviewCircle(null);

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
      setIsDragging(false);
      setIsDraggingOnCanvas(false);
    };
    reader.onerror = () => {
      setFileError("読み込み失敗");
      setIsDragging(false);
      setIsDraggingOnCanvas(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadNewImage(file);
  };

  // --- Drop Zone ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadNewImage(files[0]);
    } else {
      setFileError("画像ファイルをドロップしてください。");
    }
  };

  // --- Canvas Drop Zone ---
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOnCanvas) setIsDraggingOnCanvas(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      canvasDropZoneRef.current &&
      !canvasDropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDraggingOnCanvas(false);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnCanvas(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadNewImage(files[0]);
    } else {
      setFileError("画像ファイルをドロップしてください。");
    }
  };

  // --- Blur操作 ---
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

  const handleRadiusChange = (value: number) => {
    setBlurRadius(value);
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    setPreviewCircle({ radius: value, visible: true });
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewCircle(null);
      previewTimeoutRef.current = null;
    }, 3000);
  };

  const uploadImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <AppHeaderClientBlur
        undo={undo}
        undoStack={undoStack}
        blurRegions={blurRegions}
        handleDownload={handleDownload}
        uploadImage={uploadImage}
        isProcessing={isProcessing}
      />
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }} suppressHydrationWarning>
        {!imageSrc ? (
          <Box
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mb: 4,
              p: 4,
              border: isDragging ? "2px dashed #1976d2" : "2px dashed #ccc",
              borderRadius: 2,
              backgroundColor: isDragging
                ? "rgba(25, 118, 210, 0.04)"
                : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            <Typography variant="body1" align="center" color="text.secondary">
              {isDragging
                ? "ここにドロップして画像を読み込み 📤"
                : "画像をドラッグ＆ドロップするか、"}
            </Typography>
            <Button
              variant="contained"
              component="label"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              sx={{ alignSelf: "center" }}
            >
              画像を選択
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
              />
            </Button>
            {fileError && <Alert severity="error">{fileError}</Alert>}
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <BlurControls
                blurRadius={blurRadius}
                blurStrength={blurStrength}
                onRadiusChange={handleRadiusChange}
                onStrengthChange={setBlurStrength}
                onClearAll={clearAll}
              />
            </Box>

            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
            />

            <Box
              ref={canvasDropZoneRef}
              onDragOver={handleCanvasDragOver}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
              sx={{
                display: "flex",
                justifyContent: "center",
                outline: isDraggingOnCanvas ? "2px dashed #1976d2" : "none",
                borderRadius: 1,
                p: isDraggingOnCanvas ? 2 : 0,
                backgroundColor: isDraggingOnCanvas
                  ? "rgba(25, 118, 210, 0.04)"
                  : "transparent",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  position: "absolute",
                  top: 8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  opacity: isDraggingOnCanvas ? 1 : 0,
                  transition: "opacity 0.2s",
                  pointerEvents: "none",
                  zIndex: 10,
                  bgcolor: "rgba(255,255,255,0.8)",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                ここにドロップして画像を変更 🔄
              </Typography>

              <BlurCanvas
                ref={canvasRef}
                imageSrc={imageSrc}
                blurRegions={blurRegions}
                onAddBlur={addBlurRegion}
                onAddLineBlur={addLineBlurRegion}
                onUpdateBlur={updateBlurRegion}
                onRemoveBlur={removeBlurRegion}
                handleDownload={handleDownload}
                undo={undo}
                undoStack={undoStack}
                isProcessing={isProcessing}
                uploadImage={uploadImage}
              />
            </Box>
          </>
        )}

        {/* プレビューサークル（中央表示） */}
        {previewCircle && (
          <Box
            sx={{
              position: "fixed",
              top: { xs: "20%", sm: "40%" },
              left: { xs: "20%", sm: "20%" },
              transform: `translate(-50%, -50%) scale(${
                previewCircle.visible ? 1 : 0.9
              })`,
              width: previewCircle.radius * 2,
              height: previewCircle.radius * 2,
              borderRadius: "50%",
              border: "2px dashed #1976d2",
              backgroundColor: "rgba(25, 118, 210, 0.08)",
              pointerEvents: "none",
              zIndex: 1300,
              opacity: previewCircle.visible ? 1 : 0,
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          />
        )}
      </Box>
    </>
  );
}
