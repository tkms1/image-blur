"use client";

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import Box from "@mui/material/Box";

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
  exportImage: () => string | null; // PNG DataURL を返す
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
};

const getCanvasCoordinates = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

// ✅ forwardRef で親にメソッドを公開
const BlurCanvas = forwardRef<BlurCanvasRef, Props>(
  (
    {
      imageSrc,
      blurRegions,
      onAddBlur,
      onAddLineBlur,
      onUpdateBlur,
      onRemoveBlur,
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

    // ✅ exportImage メソッドを親に公開
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

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, canvas);
      lineStart.current = { x, y };
      setIsDrawingLine(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {};

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
          position: "relative",
          display: "inline-block",
          border: "1px solid #eee",
          borderRadius: 1,
          overflow: "hidden",
        }}
        onMouseLeave={() => {
          setIsDrawingLine(false);
          lineStart.current = null;
        }}
        suppressHydrationWarning
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            display: image ? "block" : "none",
            width: "100%",
            height: "auto",
            cursor: isDrawingLine ? "crosshair" : "pointer",
          }}
        />
        {!image && <div>画像を読み込んでいます...</div>}
      </Box>
    );
  }
);

BlurCanvas.displayName = "BlurCanvas";
export default BlurCanvas;
// export type { BlurCanvasRef }; // 型も export
