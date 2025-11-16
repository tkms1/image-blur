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
import type { Ref } from "react";

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

export type BlurCanvasRef = {
  exportImage: () => string | null;
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

// ✅ 型ガード関数（ポイント！）
function isTouchEvent(
  event: React.MouseEvent | React.TouchEvent
): event is React.TouchEvent {
  return "touches" in event;
}

function isMouseEvent(
  event: React.MouseEvent | React.TouchEvent
): event is React.MouseEvent {
  return "clientX" in event;
}

// ✅ 型安全な座標取得
const getCanvasCoordinatesFromEvent = (
  event: React.MouseEvent | React.TouchEvent,
  canvas: HTMLCanvasElement
) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX: number, clientY: number;

  if (isTouchEvent(event) && event.touches.length > 0) {
    const touch = event.touches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else if (isMouseEvent(event)) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    // フォールバック（型安全性のため）
    clientX = 0;
    clientY = 0;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

const BlurCanvas = forwardRef<BlurCanvasRef, Props>(
  (
    {
      imageSrc,
      blurRegions,
      undoStack,
      isProcessing,
      uploadImage,
      onAddBlur,
      onAddLineBlur,
      onUpdateBlur,
      onRemoveBlur,
      handleDownload,
      undo,
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
      img.onload = () => setImage(img);
      img.src = imageSrc;
      return () => {
        img.onload = null;
      };
    }, [imageSrc]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !image) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      blurRegions.forEach((region) => {
        if (region.type === "circle") {
          const { x, y, radius, strength } = region;

          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d")!;
          tempCanvas.width = radius * 2;
          tempCanvas.height = radius * 2;

          tempCtx.drawImage(
            canvas,
            x - radius,
            y - radius,
            radius * 2,
            radius * 2,
            0,
            0,
            radius * 2,
            radius * 2
          );

          const blurStep = Math.min(10, Math.max(1, strength));
          const iterations = Math.min(5, Math.ceil(strength / blurStep));
          for (let i = 0; i < iterations; i++) {
            tempCtx.filter = `blur(${blurStep}px)`;
            tempCtx.drawImage(tempCanvas, 0, 0);
            tempCtx.filter = "none";
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(tempCanvas, x - radius, y - radius);
          ctx.restore();
        } else if (region.type === "line") {
          const { x: x1, y: y1, x2, y2, radius, strength } = region;
          if (x2 === undefined || y2 === undefined) return;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);

          const step = Math.max(5, radius / 2);
          const steps = Math.ceil(length / step);

          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = x1 + dx * t;
            const cy = y1 + dy * t;

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d")!;
            tempCanvas.width = radius * 2;
            tempCanvas.height = radius * 2;

            tempCtx.drawImage(
              canvas,
              cx - radius,
              cy - radius,
              radius * 2,
              radius * 2,
              0,
              0,
              radius * 2,
              radius * 2
            );

            const blurStep = Math.min(10, Math.max(1, strength));
            const iterations = Math.min(5, Math.ceil(strength / blurStep));
            for (let j = 0; j < iterations; j++) {
              tempCtx.filter = `blur(${blurStep}px)`;
              tempCtx.drawImage(tempCanvas, 0, 0);
              tempCtx.filter = "none";
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(tempCanvas, cx - radius, cy - radius);
            ctx.restore();
          }
        }
      });
    }, [image, blurRegions]);

    useImperativeHandle(
      ref,
      () => ({
        exportImage: () => {
          const canvas = canvasRef.current;
          if (!canvas || !image) return null;
          return canvas.toDataURL("image/png");
        },
      }),
      [image]
    );

    // ✅ 型安全なハンドラ
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (
        (isMouseEvent(e) && e.button !== 0) || // マウス右クリック無視
        (isTouchEvent(e) && e.touches.length > 1) // 複数タッチ無視
      ) {
        return;
      }

      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasCoordinatesFromEvent(e, canvas);
      lineStart.current = { x, y };
      setIsDrawingLine(true);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
    };

    const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingLine || !lineStart.current) return;

      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasCoordinatesFromEvent(e, canvas);
      const start = lineStart.current;

      const dx = x - start.x;
      const dy = y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const isMobile =
        typeof window !== "undefined" &&
        /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
      const distanceThreshold = isMobile ? 10 : 5;

      if (distance < distanceThreshold) {
        onAddBlur(start.x, start.y);
      } else {
        onAddLineBlur(start, { x, y });
      }

      lineStart.current = null;
      setIsDrawingLine(false);
    };

    const handlePointerCancel = () => {
      if (isDrawingLine) {
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
        }}
        onMouseLeave={handlePointerCancel}
        onTouchCancel={handlePointerCancel}
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
            <IconButton
              aria-label="元に戻す"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="ダウンロード" arrow>
            <IconButton
              aria-label="ダウンロード"
              onClick={handleDownload}
              disabled={blurRegions.length === 0 || isProcessing}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="画像を変更" arrow>
            <IconButton aria-label="画像を変更" onClick={uploadImage}>
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerCancel}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerCancel}
          style={{
            display: image ? "block" : "none",
            width: "100%",
            height: "auto",
            cursor: isDrawingLine ? "crosshair" : "pointer",
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        />
        {!image && <div>画像を読み込んでいます...</div>}
      </Box>
    );
  }
);

BlurCanvas.displayName = "BlurCanvas";
export default BlurCanvas;
