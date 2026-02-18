"use client";

import { useState, useRef, TouchEvent } from "react";

// スワイプ判定の閾値 (px)
const SWIPE_THRESHOLD = 50;

type SwipeDirection = "LEFT" | "RIGHT" | "UP" | "DOWN" | null;

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isTouching: boolean;
  direction: SwipeDirection;
  message: string;
}

export default function SwipeTestPage() {
  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isTouching: false,
    direction: null,
    message: "下のボックスをタッチまたはスワイプしてください",
  });

  // タッチ開始時の座標を保持するための Ref
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    setTouchState((prev) => ({
      ...prev,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isTouching: true,
      direction: null,
      message: "タッチ開始 (Touch Start)",
    }));
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    setTouchState((prev) => ({
      ...prev,
      currentX,
      currentY,
      message: "移動中 (Touch Move)",
    }));
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const diffX = touchState.currentX - touchState.startX;
    const diffY = touchState.currentY - touchState.startY;

    let direction: SwipeDirection = null;
    let message = "タッチ終了 (Touch End)";

    // 横方向のスワイプ判定
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > SWIPE_THRESHOLD) {
        direction = diffX > 0 ? "RIGHT" : "LEFT";
        message = `スワイプ検知：${direction}`;
      }
    }
    // 縦方向のスワイプ判定
    else {
      if (Math.abs(diffY) > SWIPE_THRESHOLD) {
        direction = diffY > 0 ? "DOWN" : "UP";
        message = `スワイプ検知：${direction}`;
      }
    }

    setTouchState((prev) => ({
      ...prev,
      isTouching: false,
      direction,
      message,
    }));

    // リセット
    touchStartRef.current = null;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Touch & Swipe Test
      </h1>

      {/* 操作エリア */}
      <div
        className="w-full max-w-md h-64 bg-white rounded-xl shadow-lg border-2 border-blue-500 flex items-center justify-center overflow-hidden relative touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="text-center pointer-events-none">
          <p className="text-lg font-semibold text-blue-600">
            ここをタッチ/スワイプ
          </p>
          <p className="text-sm text-gray-500 mt-2">
            (touch-none クラス適用済み)
          </p>
        </div>

        {/* 現在の指の位置を表示するドット */}
        {touchState.isTouching && (
          <div
            className="absolute w-8 h-8 bg-red-500 rounded-full opacity-50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: touchState.currentX,
              top: touchState.currentY,
            }}
          />
        )}
      </div>

      {/* デバッグ情報表示エリア */}
      <div className="w-full max-w-md mt-6 bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto">
        <p className="font-bold text-white mb-2 border-b border-gray-600 pb-1">
          Status Log:
        </p>
        <p>{touchState.message}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>Start X: {touchState.startX.toFixed(0)}</div>
          <div>Start Y: {touchState.startY.toFixed(0)}</div>
          <div>Current X: {touchState.currentX.toFixed(0)}</div>
          <div>Current Y: {touchState.currentY.toFixed(0)}</div>
          <div className="col-span-2">
            Direction:{" "}
            <span className="text-yellow-400 font-bold">
              {touchState.direction || "NONE"}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-8 text-gray-500 text-sm">
        スマホの実機またはブラウザの開発者ツール（デバイスモード）で確認してください。
      </p>
    </main>
  );
}
