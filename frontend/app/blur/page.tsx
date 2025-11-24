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
  const [blurRadius, setBlurRadius] = useState(20);
  const [blurSize, setBlurSize] = useState(100);
  const [lastDrawTime, setLastDrawTime] = useState(0);

  // Optimized undo/redo system
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySteps = 50;

  // デフォルト画像
  // useEffect(() => {
  //   setImageSrc("https://picsum.photos/id/237/800/600");
  // }, []);
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

      return prevHistory; // setState 関数内で副作用を起こさないため
    });
  }, [historyIndex]); // ← historyIndex のみで OK（canvasHistory は setState updater で取得）

  // ===== やり直し =====
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
  }, [imageSrc]);

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
  }, [undoLastAction, redoLastAction]); // ← ✅ 依存配列に追加！

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
            workingCtx.drawImage(originalImageRef.current, 0, 0);

            // 新しい画像の場合は操作履歴をリセット
            setCanvasHistory([]);
            setHistoryIndex(-1);
            saveCanvasState();
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

  // ✅ ===== ドラッグ＆ドロップ処理 =====
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
    const rect = canvas.getBoundingClientRect();

    const actualWidth = canvas.width; // 画像の物理幅
    const displayWidth = rect.width; // 表示上の幅

    return displayWidth / actualWidth; // 表示スケール（例: 画像が 800px、表示が 400px → 0.5）
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

    // 2. 円形クリッピング用のパスを設定（中心から半径 = physicalBlurSize/2 の円）
    const centerX = physicalBlurSize / 2;
    const centerY = physicalBlurSize / 2;
    const radius = physicalBlurSize / 2;

    blurCtx.beginPath();
    blurCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    blurCtx.closePath();
    blurCtx.save(); // 状態を保存（clip 後に元に戻すため）
    blurCtx.clip(); // これ以降の描画は円内のみ

    // 3. ガウシアンぼかしを適用（clip された円領域に適用される）
    blurCtx.filter = `blur(${blurRadius}px)`;
    blurCtx.drawImage(blurCanvas, 0, 0);

    // 4. clip 解除
    blurCtx.restore();

    // 5. 円形ぼかし結果を、**透明背景のまま**作業キャンバスに描画（合成モード指定）
    workingCtx.save();
    workingCtx.globalCompositeOperation = "source-over"; // デフォルト（アルファ合成）
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
      // 一定間隔で描画（パフォーマンス向上）
      const now = Date.now();
      if (now - lastDrawTime > 50) {
        applyBlurAt(coords.x, coords.y);
        setLastDrawTime(now);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
    // マウスアップ時に最後の状態を確実に保存
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

  const clearAll = () => {
    if (
      !originalImageRef.current ||
      !workingCanvasRef.current ||
      !canvasRef.current
    )
      return;

    const workingCanvas = workingCanvasRef.current;
    const workingCtx = workingCanvas.getContext("2d");
    if (workingCtx) {
      workingCtx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
      workingCtx.drawImage(originalImageRef.current, 0, 0);

      // 表示用キャンバスにも反映
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas?.height);
        ctx.drawImage(workingCanvas, 0, 0);
      }

      // 初期状態として保存
      saveCanvasState();
    }
  };

  // ===== スライダー =====
  const handleBlurRadiusChange = (_: Event, newValue: number | number[]) => {
    setBlurRadius(newValue as number);
  };

  const handleBlurSizeChange = (_: Event, newValue: number | number[]) => {
    setBlurSize(newValue as number);
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
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              flexGrow: 1,
              color: "primary.main",
            }}
          >
            画像ぼかしツール
          </Typography>
          <Button
            startIcon={<UndoIcon />}
            onClick={undoLastAction}
            disabled={historyIndex <= 0}
            variant="outlined"
            color="primary"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              mr: 1,
            }}
          >
            {isMobile ? "戻す" : "戻す (Ctrl+Z)"}
          </Button>
          <Button
            startIcon={<RedoIcon />}
            onClick={redoLastAction}
            disabled={historyIndex >= canvasHistory.length - 1}
            variant="outlined"
            color="primary"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              mr: 1,
            }}
          >
            {isMobile ? "やり直す" : "やり直す (Ctrl+Y)"}
          </Button>
          <Button
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            variant="contained"
            color="primary"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {isMobile ? "アップロード" : "画像をアップロード"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          align="center"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: "text.primary",
          }}
        >
          個人情報を簡単に保護
        </Typography>

        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          // paragraph
          sx={{ maxWidth: 700, mx: "auto" }}
        >
          画像をアップロードして、クリックまたはドラッグでぼかしをかけられます。
          📤 画像をこのエリアにドラッグ＆ドロップでもアップロードできます。
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                height: "100%",
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
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: "auto" }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ResetIcon />}
                        onClick={clearAll}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                        }}
                      >
                        クリア
                      </Button>
                    </Grid>
                    <Grid size={{ xs: 12, sm: "auto" }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={downloadImage}
                        color="success"
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        ダウンロード
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    bgcolor: "background.default",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
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
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        サイズ: {blurSize}px
                      </Typography>
                      <Slider
                        value={blurSize}
                        onChange={handleBlurSizeChange}
                        min={50}
                        max={300}
                        step={10}
                        color="secondary"
                        sx={{
                          color: theme.palette.secondary.main,
                          "& .MuiSlider-thumb": {
                            width: 20,
                            height: 20,
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* ✅ ドラッグ＆ドロップ対応ラッパー */}
                <Box
                  // ドラッグイベントをラップ
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    p: 1,
                    position: "relative",
                    minHeight: { xs: 300, sm: 400, md: 500 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    // ✅ 正しく1回だけ bgcolor を定義
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
                  {imageSrc ? (
                    <>
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
                          maxWidth: "100%",
                          // maxHeight: "70vh",
                          cursor: isMouseDown ? "crosshair" : "crosshair",
                          display: "block",
                        }}
                      />
                    </>
                  ) : (
                    // ✅ ドラッグ案内を強化
                    <Box
                      sx={{
                        textAlign: "center",
                        p: 3,
                        maxWidth: "80%",
                      }}
                    >
                      <Zoom in={!isDragOver} timeout={300}>
                        <Box>
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: "50%",
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
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
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
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

            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                操作方法
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                      }}
                    />
                    <Typography variant="body2">
                      クリック or ドラッグでぼかし追加
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "secondary.main",
                      }}
                    />
                    <Typography variant="body2">
                      同じ場所を複数回クリックで強度アップ
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "error.main",
                      }}
                    />
                    <Typography variant="body2">
                      クリアボタンで全て削除
                    </Typography>
                  </Box>
                </Grid>
                {/* ✅ 新規：ドラッグ＆ドロップ案内 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="body2">
                      画像をエリアへドラッグ＆ドロップ
                    </Typography>
                  </Box>
                </Grid>
                {/* 新規：Undoショートカット案内 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "info.main",
                      }}
                    />
                    <Typography variant="body2">
                      Ctrl+Z / Cmd+Z で元に戻す
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "warning.main",
                      }}
                    />
                    <Typography variant="body2">
                      Ctrl+Y / Cmd+Y でやり直す
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {/* 右側のガイドは変更なし */}
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  使い方ガイド
                </Typography>

                <List dense sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemText
                      primary="1. 画像をアップロード"
                      secondary="ドラッグ＆ドロップ or ボタンで"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="2. ぼかしを描く"
                      secondary="クリックで1点、ドラッグで線状に追加"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="3. 調整"
                      secondary="強度とサイズをスライダーで調整"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="4. 保存"
                      secondary="完成画像をダウンロード"
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  ヒント
                </Typography>

                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="ブラシのように塗りつぶす"
                      secondary="同じ場所を何度も塗るとより強いぼかしになります"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="ドラッグで面を塗る"
                      secondary="文字やロゴ全体を一気にぼかせます"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="自然な印象"
                      secondary="モザイクより柔らかい仕上がり"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="個人情報保護"
                      secondary="顔、住所、電話番号などを隠すのに最適"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="誤操作しても安心"
                      secondary="Ctrl+Zでいつでも1ステップ戻せます"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="やり直しも可能"
                      secondary="Ctrl+Yでやり直せます"
                    />
                  </ListItem>
                </List>
              </CardContent>

              <Box
                sx={{
                  mt: "auto",
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    ブラシぼかし
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    このツールはブラシのようにぼかしを塗りつぶすことができます。
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    同じ場所を何度も塗ることで、より強いぼかし効果を得られます。
                    誤って塗ってしまった場合は、Ctrl+Zで元に戻せます。
                  </Typography>
                </CardContent>
              </Box>
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
