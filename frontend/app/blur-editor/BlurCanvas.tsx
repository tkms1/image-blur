"use client";

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import Box from "@mui/material/Box";
import UndoIcon from "@mui/icons-material/Undo";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

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

// ✅ getScale() を追加
export type BlurCanvasRef = {
  exportImage: () => string | null;
  getScale: () => number;
};

type Props = {
  imageSrc: string;
  blurRegions: BlurRegion[];
  onAddBlur: (x: number, y: number) => void;
  onAddLineBlur: (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => void;
  onUpdateBlur: (id: string, updates: Partial<BlurRegion>) => void;
  onRemoveBlur: (id: string) => void;
  handleDownload: () => void;
  undo: () => void;
  undoStack: BlurRegion[][];
  isProcessing: boolean;
  uploadImage: () => void;
};

// ✅ 正しい座標変換（DPR考慮）
const getCanvasCoordinates = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const scaleX = canvas.width / (rect.width * dpr);
  const scaleY = canvas.height / (rect.height * dpr);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

// ✅ 自然な「霧」ぼかし（平均フィルター + アルファ合成）
const applySoftBlur = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number,
  dpr: number
) => {
  const size = Math.ceil(radius * 2);
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCanvas.width = size;
  tempCanvas.height = size;

  // 領域コピー
  tempCtx.drawImage(
    ctx.canvas,
    x - radius,
    y - radius,
    size,
    size,
    0,
    0,
    size,
    size
  );
  // console.log(x - radius, y - radius, size, size); // --- IGNORE ---
  // 平均フィルター（簡易ガウス近似）
  const iterations = Math.min(4, Math.max(1, Math.floor(strength / 6)));
  for (let iter = 0; iter < iterations; iter++) {
    const imageData = tempCtx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
              const idx = (ny * size + nx) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }
          }
        }
        const idx = (py * size + px) * 4;
        newData[idx] = r / count;
        newData[idx + 1] = g / count;
        newData[idx + 2] = b / count;
        newData[idx + 3] = a / count;
      }
    }
    tempCtx.putImageData(new ImageData(newData, size, size), 0, 0);
  }

  // アルファ合成で「霧」効果（opacity 0.7 で自然に混ざる）
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.7;
  ctx.drawImage(tempCanvas, x - radius, y - radius);
  ctx.globalAlpha = 1.0;
  ctx.restore();
};

const BlurCanvas = forwardRef<BlurCanvasRef, Props>(
  (
    {
      imageSrc,
      blurRegions,
      onAddBlur,
      onAddLineBlur,
      handleDownload,
      undo,
      undoStack,
      uploadImage,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [isDrawingLine, setIsDrawingLine] = useState(false);
    const lineStart = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const handleLoad = () => setImage(img);
      const handleError = () => console.error("画像の読み込みに失敗しました");

      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = imageSrc;

      return () => {
        // クリーンアップ：イベントハンドラ解除（メモリリーク防止）
        img.onload = null;
        img.onerror = null;
        // img.src = ''; // 任意：リソース解放促進（必須ではない）
      };
    }, [imageSrc]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !image) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;

      // 表示サイズ計算（アスペクト比維持）
      const maxWidth = Math.min(image.width, window.innerWidth * 0.95);
      const maxHeight = Math.min(image.height, window.innerHeight * 0.7);
      let displayWidth = image.width;
      let displayHeight = image.height;
      const aspectRatio = image.width / image.height;

      if (displayWidth > maxWidth) {
        displayWidth = maxWidth;
        displayHeight = displayWidth / aspectRatio;
      }
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * aspectRatio;
      }

      // キャンバス設定（高DPR対応）
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

      // ぼかし描画
      blurRegions.forEach((region) => {
        if (region.type === "circle") {
          // console.log(
          //   "Applying circle blur at",
          //   blurRegions,
          //   region,
          //   region.x,
          //   region.y
          // );
          applySoftBlur(
            ctx,
            region.x,
            region.y,
            region.radius,
            region.strength,
            dpr
          );
        } else if (
          region.type === "line" &&
          region.x2 !== undefined &&
          region.y2 !== undefined
        ) {
          const { x: x1, y: y1, x2, y2, radius, strength } = region;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(
            1,
            Math.ceil(length / Math.max(5, radius / 2))
          );

          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = x1 + dx * t;
            const cy = y1 + dy * t;
            applySoftBlur(ctx, cx, cy, radius, strength, dpr);
          }
        }
      });
    }, [image, blurRegions]);

    // ✅ getScale() 追加
    useImperativeHandle(
      ref,
      () => ({
        exportImage: () => {
          const canvas = canvasRef.current;
          return canvas && image ? canvas.toDataURL("image/png") : null;
        },
        getScale: () => {
          if (!image) return 1;
          const maxWidth = Math.min(image.width, window.innerWidth * 0.95);
          const maxHeight = Math.min(image.height, window.innerHeight * 0.7);
          const aspectRatio = image.width / image.height;

          let displayWidth = image.width;
          if (displayWidth > maxWidth) displayWidth = maxWidth;
          const displayHeight = displayWidth / aspectRatio;
          if (displayHeight > maxHeight) displayWidth = maxHeight * aspectRatio;

          return displayWidth / image.width;
        },
      }),
      [image]
    );

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, canvas);
      lineStart.current = { x, y };
      setIsDrawingLine(true);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDrawingLine && lineStart.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, canvas);
        const start = lineStart.current;

        const dx = x - start.x;
        const dy = y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          onAddBlur(start.x, start.y);
        } else {
          onAddLineBlur(start, { x, y });
        }

        lineStart.current = null;
        setIsDrawingLine(false);
      }
    };

    return (
      <Box
        sx={{
          display: "inline-block",
          border: "1px solid #eee",
          borderRadius: 1,
          overflow: "hidden",
          position: "relative",
        }}
        onMouseLeave={() => {
          setIsDrawingLine(false);
          lineStart.current = null;
        }}
        suppressHydrationWarning
      >
        <Box
          sx={{
            ml: 2,
            display: { xs: "none", sm: "flex" },
            justifyContent: "flex-end",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Tooltip title="もとに戻す" arrow>
            <IconButton onClick={undo} disabled={undoStack.length === 0}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="ダウンロード" arrow>
            <IconButton
              onClick={handleDownload}
              disabled={blurRegions.length === 0}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="画像を変更" arrow>
            <IconButton onClick={uploadImage}>
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={(e) => {}}
          style={{
            display: image ? "block" : "none",
            cursor: isDrawingLine ? "crosshair" : "pointer",
            width: "100%",
            height: "auto",
          }}
        />
        {!image && <Box p={2}>画像を読み込んでいます...</Box>}
      </Box>
    );
  }
);

BlurCanvas.displayName = "BlurCanvas";
export default BlurCanvas;
