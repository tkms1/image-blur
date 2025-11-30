"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Slider,
  IconButton,
  useTheme,
  useMediaQuery,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Grid,
  Container,
  AppBar,
  Toolbar,
  alpha,
  Zoom,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  RestartAlt as ResetIcon,
  Upload as UploadIcon,
  Help as HelpIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "@mui/icons-material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import NextImage from "next/image";
import Link from "next/link";

const BlurTool = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ▼▼▼ ズーム機能用のStateとRefを追加 ▼▼▼
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // ▲▲▲ 追加終わり ▲▲▲

  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(50);
  const [lastDrawTime, setLastDrawTime] = useState(0);
  const [previewCircle, setPreviewCircle] = useState<{
    radius: number;
    visible: boolean;
  } | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dpr, setDpr] = useState(1);
  // Optimized undo/redo system
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 50;

  // ===== キャンバス状態を保存 =====
  const saveCanvasState = useCallback(() => {
    if (!workingCanvasRef.current) return;

    const workingCanvas = workingCanvasRef.current;
    const dataUrl = workingCanvas.toDataURL();

    setCanvasHistory((prev) => {
      // 現在のインデックスより後の履歴を削除
      const newHistory = prev.slice(0, historyIndex + 1);
      // 新しい状態を追加
      newHistory.push(dataUrl);

      // 最大数を超えたら古いものを削除
      if (newHistory.length > maxHistorySteps) {
        newHistory.shift();
      }

      return newHistory;
    });

    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // ===== 元に戻す =====
  const undoLastAction = useCallback(() => {
    setCanvasHistory((prevHistory) => {
      const newIndex = historyIndex - 1;
      if (newIndex < 0) return prevHistory;

      const previousState = prevHistory[newIndex];

      if (!workingCanvasRef.current || !canvasRef.current) return prevHistory;

      const workingCanvas = workingCanvasRef.current;
      const workingCtx = workingCanvas.getContext("2d");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!workingCtx || !ctx) return prevHistory;

      const img = new Image();
      img.onload = () => {
        workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
        workingCtx.drawImage(img, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(workingCanvas, 0, 0);

        setHistoryIndex(newIndex);
      };
      img.src = previousState;

      return prevHistory;
    });
  }, [historyIndex]);

  // ===== やり直し =====
  const redoLastAction = useCallback(() => {
    setCanvasHistory((prevHistory) => {
      const newIndex = historyIndex + 1;
      if (newIndex >= prevHistory.length) return prevHistory;

      const nextState = prevHistory[newIndex];

      if (!workingCanvasRef.current || !canvasRef.current) return prevHistory;

      const workingCanvas = workingCanvasRef.current;
      const workingCtx = workingCanvas.getContext("2d");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!workingCtx || !ctx) return prevHistory;

      const img = new Image();
      img.onload = () => {
        workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
        workingCtx.drawImage(img, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(workingCanvas, 0, 0);

        setHistoryIndex(newIndex);
      };
      img.src = nextState;

      return prevHistory;
    });
  }, [historyIndex]);

  // キャンバス初期化と描画
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    // 画像が変更されたらズームをリセット
    // setZoom(1);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // 原画像を保持
      originalImageRef.current = img;

      // 作業用キャンバスの初期化
      if (!workingCanvasRef.current) {
        workingCanvasRef.current = document.createElement("canvas");
      }
      const workingCanvas = workingCanvasRef.current;
      workingCanvas.width = canvas.width;
      workingCanvas.height = canvas.height;
      const workingCtx = workingCanvas.getContext("2d");
      if (!workingCtx) return;

      // 元画像を描画
      workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
      workingCtx.drawImage(img, 0, 0);

      // 表示用キャンバスに描画
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);

      // 初期状態を履歴に保存
      saveCanvasState();
    };

    img.src = imageSrc;
  }, [imageSrc]); // saveCanvasStateは依存配列から除外（ループ防止のため）

  // ===== キーボードショートカット =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLastAction();
      }
      // Ctrl+Y / Cmd+Y または Ctrl+Shift+Z（Mac 標準）
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        redoLastAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoLastAction, redoLastAction]);

  // ▼▼▼ ズーム操作 (Ctrl + Wheel) のイベントリスナーを追加 ▼▼▼
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrlキー (またはMetaキー) が押されている場合のみズーム
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // ブラウザ標準のズームを無効化

        // ホイールの回転量に応じてズーム倍率を計算
        // deltaYが負=奥へ回転(拡大)、正=手前へ回転(縮小)
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        setZoom((prevZoom) => {
          const newZoom = prevZoom + delta;
          // 最小0.1倍、最大5倍に制限
          return Math.min(Math.max(newZoom, 0.1), 5);
        });
      }
    };

    // passive: false にしないと e.preventDefault() が効かない場合があるため指定
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [imageSrc]); // 画像がある時のみ機能するように
  // ▲▲▲ 追加終わり ▲▲▲

  // ===== ファイルアップロード（共通処理）=====
  // ===== ファイルアップロード（共通処理）=====
  const processFile = (file: File) => {
    if (!file.type.match("image.*")) {
      alert("画像ファイルを選択してください（JPG/PNGなど）");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        setImageSrc(event.target.result);

        // ▼▼▼ ここに追加: 画像が新しくなったらズームをリセット ▼▼▼
        setZoom(1);
        // ▲▲▲ 追加終わり ▲▲▲

        // ブラシ状態をリセット
        if (workingCanvasRef.current) {
          const workingCanvas = workingCanvasRef.current;
          const workingCtx = workingCanvas.getContext("2d");
          if (workingCtx && originalImageRef.current) {
            workingCtx.clearRect(
              0,
              0,
              workingCanvas.width,
              workingCanvas.height
            );
            // ※注意: ここで originalImageRef.current を使っていますが、
            // 非同期読み込みのタイミングによっては古い画像の可能性があります。
            // 本来は useEffect 側で初期描画を行っているので、ここの描画処理はなくても
            // 次のレンダリングサイクルで useEffect が走って描画されます。
            // ただ、履歴のリセット等はここで行うのが正しいです。

            // 新しい画像の場合は操作履歴をリセット
            setCanvasHistory([]);
            setHistoryIndex(-1);
            // saveCanvasState(); // ← useEffect側で描画後に保存されるため、ここでは不要かもしれません
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // ===== 通常クリックアップロード =====
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ===== ドラッグ＆ドロップ処理 =====
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageSrc) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // ===== 共通：座標を取得（比率補正付き）=====
  const getCanvasDisplayScale = () => {
    if (!canvasRef.current || !imageSrc) return 1;

    const canvas = canvasRef.current;
    // getBoundingClientRect は CSS transform: scale() 適用後のサイズを返すため、
    // 自動的にズームに対応した計算になります。
    const rect = canvas.getBoundingClientRect();

    const actualWidth = canvas.width; // 画像の物理幅
    const displayWidth = rect.width; // 表示上の幅

    return displayWidth / actualWidth;
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const actualWidth = canvas.width;
    const actualHeight = canvas.height;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  };

  // ===== ブラシぼかし追加 =====
  const applyBlurAt = (x: number, y: number) => {
    if (
      !workingCanvasRef.current ||
      !originalImageRef.current ||
      !canvasRef.current
    )
      return;

    const workingCanvas = workingCanvasRef.current;
    const workingCtx = workingCanvas.getContext("2d");
    if (!workingCtx) return;

    const displayScale = getCanvasDisplayScale();
    const physicalBlurSize = blurSize / displayScale;

    // ● ぼかし用の一時正方形キャンバス（物理サイズ）
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = physicalBlurSize;
    blurCanvas.height = physicalBlurSize;
    const blurCtx = blurCanvas.getContext("2d");
    if (!blurCtx) return;

    // ● 中心からのオフセット（切り抜き座標）
    const clipX = x - physicalBlurSize / 2;
    const clipY = y - physicalBlurSize / 2;

    // 1. 元の作業キャンバスから正方形領域をコピー
    blurCtx.drawImage(
      workingCanvas,
      clipX,
      clipY,
      physicalBlurSize,
      physicalBlurSize,
      0,
      0,
      physicalBlurSize,
      physicalBlurSize
    );

    // 2. 円形クリッピング用のパスを設定
    const centerX = physicalBlurSize / 2;
    const centerY = physicalBlurSize / 2;
    const radius = physicalBlurSize / 2;

    blurCtx.beginPath();
    blurCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    blurCtx.closePath();
    blurCtx.save();
    blurCtx.clip();

    // 3. ガウシアンぼかしを適用
    blurCtx.filter = `blur(${blurRadius}px)`;
    blurCtx.drawImage(blurCanvas, 0, 0);

    // 4. clip 解除
    blurCtx.restore();

    // 5. 円形ぼかし結果を、**透明背景のまま**作業キャンバスに描画
    workingCtx.save();
    workingCtx.globalCompositeOperation = "source-over";
    workingCtx.drawImage(
      blurCanvas,
      0,
      0,
      physicalBlurSize,
      physicalBlurSize,
      clipX,
      clipY,
      physicalBlurSize,
      physicalBlurSize
    );
    workingCtx.restore();

    // 6. 表示更新
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(workingCanvas, 0, 0);
    }

    // 7. 履歴保存
    const now = Date.now();
    if (now - lastDrawTime > 300) {
      saveCanvasState();
      setLastDrawTime(now);
    }
  };

  // ===== キャンバス操作ハンドラ =====
  const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageSrc) return;

    const coords =
      "touches" in e
        ? getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY)
        : getCanvasCoords(e.clientX, e.clientY);

    setIsMouseDown(true);
    setMousePos(coords);
    applyBlurAt(coords.x, coords.y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageSrc) return;

    const coords =
      "touches" in e
        ? getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY)
        : getCanvasCoords(e.clientX, e.clientY);

    setMousePos(coords);

    if (isMouseDown) {
      const now = Date.now();
      if (now - lastDrawTime > 50) {
        applyBlurAt(coords.x, coords.y);
        setLastDrawTime(now);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
    saveCanvasState();
  };

  // ===== ダウンロード & クリア =====
  const downloadImage = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = "blurred-image.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // ===== スライダー =====
  const handleBlurRadiusChange = (_: Event, newValue: number | number[]) => {
    setBlurRadius(newValue as number);
  };

  // dpr 監視
  useEffect(() => {
    const handleResize = () => {
      setDpr(window.devicePixelRatio || 1);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // プレビュークリーンアップ
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // ===== スライダー（サイズ）変更 → プレビュー付き =====
  // ===== スライダー（サイズ）変更 → プレビュー付き =====
  const handleBlurSizeChangeWithPreview = (
    _: Event,
    newValue: number | number[]
  ) => {
    const value = newValue as number;
    setBlurSize(value);

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // ▼▼▼ 修正箇所 ▼▼▼
    // dpr で割る必要はありません。スライダーの値(value)はそのままCSSピクセルとして扱います。
    const cssRadius = value / 2;
    // 元のコード: const cssRadius = value / dpr / 2;
    // ▲▲▲ 修正終わり ▲▲▲

    setPreviewCircle({ radius: cssRadius, visible: true });

    previewTimeoutRef.current = setTimeout(() => {
      setPreviewCircle(null);
      previewTimeoutRef.current = null;
    }, 3000);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        pb: 4,
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Link
              href="/"
              className="no-underline text-white flex items-center gap-2"
            >
              <NextImage
                src="/top-image.png"
                width={50}
                height={40}
                alt="logo"
                priority
              />
              <Typography
                variant="body1"
                sx={{
                  color: "text.primary",
                  display: { xs: "none", sm: "block" },
                }}
              >
                画像ぼかし
              </Typography>
            </Link>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="もとに戻す" arrow>
                <IconButton
                  aria-label="元に戻す"
                  onClick={undoLastAction}
                  disabled={historyIndex <= 0}
                >
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="やり直す" arrow>
                <IconButton
                  aria-label="やり直す"
                  onClick={redoLastAction}
                  disabled={historyIndex >= canvasHistory.length - 1}
                >
                  <RedoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="画像を変更" arrow>
                <IconButton
                  aria-label="画像を変更"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadFileIcon />
                </IconButton>
              </Tooltip>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 12 }}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "background.default",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 12 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        ぼかし強度: {blurRadius}px
                      </Typography>
                      <Slider
                        value={blurRadius}
                        onChange={handleBlurRadiusChange}
                        min={5}
                        max={50}
                        step={1}
                        color="primary"
                        sx={{
                          color: theme.palette.primary.main,
                          "& .MuiSlider-thumb": {
                            width: 20,
                            height: 20,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 12 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        サイズ: {blurSize}px
                      </Typography>
                      <Slider
                        value={blurSize}
                        onChange={handleBlurSizeChangeWithPreview}
                        min={5}
                        max={300}
                        step={5}
                        color="secondary"
                        sx={{
                          color: theme.palette.secondary.main,
                          "& .MuiSlider-thumb": {
                            width: 20,
                            height: 20,
                          },
                        }}
                      />
                      {previewCircle && (
                        <Box
                          sx={{
                            position: "fixed",
                            top: { xs: "30%", sm: "40%" },
                            left: "50%",
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
                            transition:
                              "opacity 0.3s ease, transform 0.3s ease",
                          }}
                        />
                      )}
                    </Grid>
                  </Grid>
                </Box>

                {/* ✅ ドラッグ＆ドロップ対応ラッパー */}
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    position: "relative",
                    bgcolor: isDragOver
                      ? alpha(theme.palette.primary.main, 0.05)
                      : "transparent",
                  }}
                >
                  {imageSrc ? (
                    <Box
                      sx={{
                        p: 1,
                        display: { xs: "flex", sm: "flex" },
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        // overflow: "hidden", // 削除：親コンテナでスクロール制御するため
                        bgcolor: isDragOver
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "grey.100",
                        border: isDragOver
                          ? `3px dashed ${theme.palette.primary.main}`
                          : "none",
                        borderRadius: 2,
                        transition: "border 0.2s ease",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          width: "100%",
                          mb: 1,
                          gap: 1,
                        }}
                      >
                        {/* ズーム倍率表示 */}
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", mr: 2 }}
                        >
                          {(zoom * 100).toFixed(0)}%
                        </Typography>

                        <Tooltip title="もとに戻す" arrow>
                          <IconButton
                            aria-label="元に戻す"
                            onClick={undoLastAction}
                            disabled={historyIndex <= 0}
                          >
                            <UndoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ダウンロード" arrow>
                          <IconButton
                            aria-label="ダウンロード"
                            onClick={downloadImage}
                            disabled={historyIndex <= 0}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="画像を変更" arrow>
                          <IconButton
                            aria-label="画像を変更"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <UploadFileIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* ▼▼▼ スクロールコンテナ（ここが重要） ▼▼▼ */}
                      <Box
                        ref={scrollContainerRef}
                        sx={{
                          width: "100%",
                          maxHeight: "100vh", // 表示領域の高さ制限
                          overflow: "auto", // 拡大時はスクロールバーを表示
                          display: "flex", // コンテンツの配置
                          justifyContent: "flex-start", // 左上基準で拡大するため
                          alignItems: "flex-start",
                          bgcolor: "#eee", // 画像外の背景色
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          onTouchStart={handleCanvasMouseDown}
                          onTouchMove={(e) => {
                            e.preventDefault();
                            handleCanvasMouseMove(e);
                          }}
                          onTouchEnd={handleCanvasMouseUp}
                          style={{
                            // ▼▼▼ 変更点 ▼▼▼

                            // transformではなく、CSSのwidthでサイズを制御します。
                            // zoom=1 のとき 100%（コンテナ幅にフィット）になります。
                            // zoom=2 のとき 200% となり、親要素の overflow: auto によりスクロールバーが出現します。
                            width: `${zoom * 100}%`,
                            height: "auto", // アスペクト比を維持

                            // 以下の transform 関連は削除します
                            // transform: `scale(${zoom})`,
                            // transformOrigin: "top left",

                            // ▲▲▲ 変更点終わり ▲▲▲

                            cursor: isMouseDown ? "crosshair" : "crosshair",
                            display: "block",
                          }}
                        />
                      </Box>
                      {/* ▲▲▲ スクロールコンテナ終了 ▲▲▲ */}
                    </Box>
                  ) : (
                    // ドラッグ＆ドロップ案内（変更なし）
                    <Box
                      sx={{
                        p: 1,
                        position: "relative",
                        minHeight: { xs: 200, sm: 300, md: 400 },
                        display: { xs: "flex", sm: "flex" },
                        justifyContent: "center",
                        alignItems: "center",
                        flexWrap: "wrap",
                        overflow: "hidden",
                        bgcolor: isDragOver
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "grey.100",
                        border: isDragOver
                          ? `3px dashed ${theme.palette.primary.main}`
                          : "none",
                        borderRadius: 2,
                        transition: "border 0.2s ease",
                      }}
                    >
                      <Zoom in={!isDragOver} timeout={300}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            minHeight: { xs: 200, sm: 300, md: 400 },
                          }}
                        >
                          <Zoom in={!isDragOver} timeout={300}>
                            <Box>
                              <Box
                                sx={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: "50%",
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  ),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  mx: "auto",
                                  mb: 2,
                                }}
                              >
                                <UploadIcon
                                  sx={{
                                    fontSize: 32,
                                    color: theme.palette.primary.main,
                                  }}
                                  className="cursor-pointer"
                                  onClick={() => fileInputRef.current?.click()}
                                />
                              </Box>
                              <Typography
                                variant="h6"
                                color="text.secondary"
                                gutterBottom
                              >
                                画像をアップロード
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1 }}
                              >
                                ボタンをクリック、または画像をドラッグ＆ドロップ
                              </Typography>
                              <Box
                                component="span"
                                sx={{
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  ),
                                  color: "primary.main",
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                }}
                              >
                                対応フォーマット: JPG, PNG, WEBP
                              </Box>
                            </Box>
                          </Zoom>
                          {isDragOver && (
                            <Zoom in timeout={200}>
                              <Box>
                                <Typography
                                  variant="h5"
                                  color="primary"
                                  sx={{ fontWeight: 700, mb: 1 }}
                                >
                                  ここで放してください
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  画像をアップロードします
                                </Typography>
                              </Box>
                            </Zoom>
                          )}
                        </Box>
                      </Zoom>
                      {/* ドラッグ中は簡潔なメッセージ */}
                      {isDragOver && (
                        <Zoom in timeout={200}>
                          <Box>
                            <Typography
                              variant="h5"
                              color="primary"
                              sx={{ fontWeight: 700, mb: 1 }}
                            >
                              ここで放してください
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              画像をアップロードします
                            </Typography>
                          </Box>
                        </Zoom>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} 画像ぼかしツール |
            個人情報保護のための簡単な解決策
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default BlurTool;
