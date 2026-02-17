"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Slider,
  IconButton,
  AppBar,
  Toolbar,
  Container,
  Button,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "@mui/icons-material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

import NextImage from "next/image";
import Link from "next/link";

const MobileBlurTool = () => {
  // === UI用 State ===
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(40);

  // 履歴管理
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 30;

  // プレビュー用
  const [previewCircle, setPreviewCircle] = useState<{
    radius: number;
    visible: boolean;
  } | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // === 内部ロジック用 Ref ===
  // イベントリスナー内から常に「最新の値」を参照するためのRef
  const settingsRef = useRef({
    blurRadius: 20,
    blurSize: 40,
    isDrawing: false,
    lastDrawTime: 0,
  });

  // Stateが更新されたらRefも同期する
  useEffect(() => {
    settingsRef.current.blurRadius = blurRadius;
    settingsRef.current.blurSize = blurSize;
  }, [blurRadius, blurSize]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // パフォーマンス向上のため、ぼかし計算用の小さなキャンバスを使い回す
  const tempBlurCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 履歴保存ロジック ===
  const saveCanvasState = useCallback(() => {
    if (!workingCanvasRef.current) return;
    const dataUrl = workingCanvasRef.current.toDataURL();

    setCanvasHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > maxHistorySteps) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const newLen =
        prev + 1 >= maxHistorySteps ? maxHistorySteps - 1 : prev + 1;
      return prev < maxHistorySteps - 1 ? prev + 1 : prev; // 簡易的なインデックス管理
    });
    // setHistoryIndexの非同期更新を待たずに次の操作ができるよう、ここではUI更新のみを責務とする
    // 実際の履歴データは次のsave時にprevから計算されるため整合性は保たれる
  }, [historyIndex]);

  // イベントリスナー内から saveCanvasState を呼べるようにRefに入れる
  const saveStateRef = useRef(saveCanvasState);
  useEffect(() => {
    saveStateRef.current = saveCanvasState;
  }, [saveCanvasState]);

  // === Undo / Redo ===
  const loadHistory = (index: number) => {
    if (index < 0 || index >= canvasHistory.length) return;
    const dataUrl = canvasHistory[index];
    const img = new Image();
    img.onload = () => {
      if (workingCanvasRef.current && canvasRef.current) {
        const wCtx = workingCanvasRef.current.getContext("2d");
        const cCtx = canvasRef.current.getContext("2d");
        if (wCtx && cCtx) {
          wCtx.clearRect(
            0,
            0,
            workingCanvasRef.current.width,
            workingCanvasRef.current.height,
          );
          wCtx.drawImage(img, 0, 0);
          cCtx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
          cCtx.drawImage(img, 0, 0);
        }
      }
    };
    img.src = dataUrl;
    setHistoryIndex(index);
  };

  const handleUndo = () => loadHistory(historyIndex - 1);
  const handleRedo = () => loadHistory(historyIndex + 1);

  // === 画像読み込み ===
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // 作業用キャンバスの準備
      if (!workingCanvasRef.current) {
        workingCanvasRef.current = document.createElement("canvas");
      }
      workingCanvasRef.current.width = canvas.width;
      workingCanvasRef.current.height = canvas.height;

      const wCtx = workingCanvasRef.current.getContext("2d");
      if (wCtx) {
        wCtx.drawImage(img, 0, 0);
      }

      // 表示用キャンバスに描画
      ctx.drawImage(workingCanvasRef.current!, 0, 0);

      // 履歴初期化
      const initialData = workingCanvasRef.current!.toDataURL();
      setCanvasHistory([initialData]);
      setHistoryIndex(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // === ファイル選択 ===
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.match("image.*")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === "string") {
          setImageSrc(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // === タッチイベント制御 (useEffect内にロジックを集約) ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    // ぼかし処理関数（クロージャ内で最新のRefを参照）
    const applyBlurAt = (clientX: number, clientY: number) => {
      const workingCanvas = workingCanvasRef.current;
      const displayCanvas = canvasRef.current;
      if (!workingCanvas || !displayCanvas) return;

      const wCtx = workingCanvas.getContext("2d");
      const dCtx = displayCanvas.getContext("2d");
      if (!wCtx || !dCtx) return;

      // 座標計算
      const rect = displayCanvas.getBoundingClientRect();
      const scaleX = workingCanvas.width / rect.width;
      const scaleY = workingCanvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // 設定値の取得
      const { blurRadius, blurSize } = settingsRef.current;

      // ブラシサイズの計算 (画面上の見た目サイズを維持するように補正)
      // 表示倍率(rect.width / actual.width) の逆数を掛けることで、
      // 画像が大きくても小さくても、指の大きさに近い範囲が塗られるようにする
      const displayScale = rect.width / workingCanvas.width;
      const physicalBlurSize = blurSize / displayScale;
      const radius = physicalBlurSize / 2;

      // ぼかし用の一時キャンバスを準備
      if (!tempBlurCanvasRef.current) {
        tempBlurCanvasRef.current = document.createElement("canvas");
      }
      const blurCanvas = tempBlurCanvasRef.current;
      const padding = blurRadius * 3;
      const bufferSize = physicalBlurSize + padding * 2;

      // 必要に応じてサイズ変更（頻繁な変更を避けるため大きめに確保しても良いが、今回は都度合わせる）
      if (blurCanvas.width !== bufferSize || blurCanvas.height !== bufferSize) {
        blurCanvas.width = bufferSize;
        blurCanvas.height = bufferSize;
      }

      const bCtx = blurCanvas.getContext("2d");
      if (!bCtx) return;

      // 1. ソース画像から切り出し
      const srcX = x - radius - padding;
      const srcY = y - radius - padding;

      bCtx.clearRect(0, 0, bufferSize, bufferSize);
      bCtx.filter = `blur(${blurRadius}px)`;

      // iOS/Safari等でfilterが効かない場合のフォールバックは複雑になるため
      // 基本的にctx.filterが使える環境(iOS 9+, Android 5+)を想定
      bCtx.drawImage(
        workingCanvas,
        srcX,
        srcY,
        bufferSize,
        bufferSize,
        0,
        0,
        bufferSize,
        bufferSize,
      );
      // 念のためfilterをリセット
      bCtx.filter = "none";

      // 2. 円形にクリップして作業用キャンバスに合成
      wCtx.save();
      wCtx.beginPath();
      wCtx.arc(x, y, radius, 0, Math.PI * 2);
      wCtx.clip();
      wCtx.drawImage(
        blurCanvas,
        padding,
        padding,
        physicalBlurSize,
        physicalBlurSize,
        x - radius,
        y - radius,
        physicalBlurSize,
        physicalBlurSize,
      );
      wCtx.restore();

      // 3. 表示用キャンバスに反映
      dCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      dCtx.drawImage(workingCanvas, 0, 0);
    };

    // イベントハンドラ定義
    const handleTouchStart = (e: TouchEvent) => {
      // 受動的イベントリスナー問題の回避：passive: false で登録しているので preventDefault が効く
      if (e.cancelable) e.preventDefault();

      if (e.touches.length > 0) {
        settingsRef.current.isDrawing = true;
        const touch = e.touches[0];
        applyBlurAt(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();

      if (settingsRef.current.isDrawing && e.touches.length > 0) {
        const now = Date.now();
        // 描画負荷軽減の間引き (30ms間隔)
        if (now - settingsRef.current.lastDrawTime > 30) {
          const touch = e.touches[0];
          applyBlurAt(touch.clientX, touch.clientY);
          settingsRef.current.lastDrawTime = now;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (settingsRef.current.isDrawing) {
        settingsRef.current.isDrawing = false;
        // 描き終わったら履歴を保存
        saveStateRef.current();
      }
    };

    // リスナー登録 (passive: false が重要)
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [imageSrc]); // imageSrcが変わったときだけリスナーを再設定

  // === スライダー操作 ===
  const handleBlurRadiusChange = (_: Event, v: number | number[]) =>
    setBlurRadius(v as number);
  const handleBlurSizeChange = (_: Event, v: number | number[]) => {
    const val = v as number;
    setBlurSize(val);
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    setPreviewCircle({ radius: val / 2, visible: true });
    previewTimeoutRef.current = setTimeout(() => setPreviewCircle(null), 2000);
  };
  useEffect(
    () => () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    },
    [],
  );

  // === ダウンロード ===
  const downloadImage = () => {
    if (!workingCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = "blurred-image.png";
    link.href = workingCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", pb: 4 }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{ display: "flex", justifyContent: "space-between", px: 2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <NextImage
                src="/top-image.png"
                width={40}
                height={32}
                alt="logo"
                style={{ objectFit: "contain" }}
              />
            </Link>
          </Box>
          <Box>
            <IconButton
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              color="primary"
            >
              <UndoIcon />
            </IconButton>
            <IconButton
              onClick={handleRedo}
              disabled={historyIndex >= canvasHistory.length - 1}
              color="primary"
            >
              <RedoIcon />
            </IconButton>
            <IconButton
              onClick={downloadImage}
              disabled={!imageSrc}
              color="primary"
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2, px: 2 }}>
        <Card
          elevation={2}
          sx={{ borderRadius: 3, overflow: "hidden", mb: 2, bgcolor: "#fff" }}
        >
          {imageSrc ? (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                bgcolor: "#eee",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                // CSS側でもタッチアクションを無効化（念の為）
                touchAction: "none",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  touchAction: "none", // 重要：ブラウザのスクロール動作をCSSレベルでも止める
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  WebkitTouchCallout: "none",
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                height: 300,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "grey.50",
                p: 3,
                textAlign: "center",
              }}
            >
              <PhotoCameraIcon
                sx={{ fontSize: 60, color: "grey.300", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                画像を選択して
                <br />
                指でなぞるとぼかしが入ります
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mt: 2, borderRadius: 8 }}
              >
                画像を選択
              </Button>
            </Box>
          )}
        </Card>

        <Card elevation={1} sx={{ borderRadius: 3, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ぼかし強度: {blurRadius}
            </Typography>
            <Slider
              value={blurRadius}
              onChange={handleBlurRadiusChange}
              min={5}
              max={50}
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              ブラシサイズ: {blurSize}
            </Typography>
            <Slider
              value={blurSize}
              onChange={handleBlurSizeChange}
              min={10}
              max={150}
              color="secondary"
            />
          </Box>
          {previewCircle?.visible && (
            <Box
              sx={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: previewCircle.radius * 2,
                height: previewCircle.radius * 2,
                borderRadius: "50%",
                border: "2px dashed #1976d2",
                bgcolor: "rgba(25, 118, 210, 0.1)",
                pointerEvents: "none",
                zIndex: 9999,
              }}
            />
          )}
        </Card>

        <Box sx={{ mt: 3, mb: 4, textAlign: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
          {imageSrc && (
            <Button
              variant="text"
              color="inherit"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              別の画像を選ぶ
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default MobileBlurTool;
