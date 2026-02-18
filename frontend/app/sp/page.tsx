"use client";

import { useState, useRef, TouchEvent } from "react";

// スワイプ判定の閾値 (px)
const SWIPE_THRESHOLD = 50;

type SwipeDirection = "LEFT" | "RIGHT" | "UP" | "DOWN" | null;

interface Point {
  x: number;
  y: number;
}

interface TouchMark {
  id: number;
  x: number;
  y: number;
}

interface TouchTrail {
  id: number;
  points: Point[];
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isTouching: boolean;
  direction: SwipeDirection;
  message: string;
  points: Point[];
}

export default function SwipeTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const markIdRef = useRef(0);
  const trailIdRef = useRef(0);

  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isTouching: false,
    direction: null,
    message: "下のボックスをタッチしてください",
    points: [],
  });

  // タップマークの配列（永続維持）
  const [touchMarks, setTouchMarks] = useState<TouchMark[]>([]);

  // 軌跡の配列（永続維持）
  const [touchTrails, setTouchTrails] = useState<TouchTrail[]>([]);

  // タッチ開始時の座標を保持するための Ref
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // コンテナ内の相対座標を取得するヘルパー関数
  const getRelativeCoordinates = (
    e: TouchEvent<HTMLDivElement> | TouchEvent,
  ) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  // すべてクリア
  const handleClear = () => {
    setTouchMarks([]);
    setTouchTrails([]);
    setTouchState((prev) => ({
      ...prev,
      message: "クリアしました",
      points: [],
    }));
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const { x, y } = getRelativeCoordinates(e);
    touchStartRef.current = { x, y };

    // タップマークを追加（赤い点）
    const markId = markIdRef.current++;
    const newMark: TouchMark = {
      id: markId,
      x,
      y,
    };
    setTouchMarks((prev) => [...prev, newMark]);

    // 新しいストローク開始
    setTouchState((prev) => ({
      ...prev,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      isTouching: true,
      direction: null,
      message: "タッチ開始 (Touch Start)",
      points: [{ x, y }],
    }));
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const { x, y } = getRelativeCoordinates(e);

    setTouchState((prev) => {
      const newPoints = [...prev.points, { x, y }];

      return {
        ...prev,
        currentX: x,
        currentY: y,
        message: "移動中 (Touch Move)",
        points: newPoints,
      };
    });
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const diffX = touchState.currentX - touchState.startX;
    const diffY = touchState.currentY - touchState.startY;

    let direction: SwipeDirection = null;
    let message = "タッチ終了 (Touch End)";

    // スワイプ判定
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > SWIPE_THRESHOLD) {
        direction = diffX > 0 ? "RIGHT" : "LEFT";
        message = `スワイプ検知：${direction}`;
      } else {
        message = "タップ検知 (Tap)";
      }
    } else {
      if (Math.abs(diffY) > SWIPE_THRESHOLD) {
        direction = diffY > 0 ? "DOWN" : "UP";
        message = `スワイプ検知：${direction}`;
      } else {
        message = "タップ検知 (Tap)";
      }
    }

    // 軌跡を保存（永続維持）
    if (touchState.points.length > 1) {
      const trailId = trailIdRef.current++;
      const newTrail: TouchTrail = {
        id: trailId,
        points: [...touchState.points],
      };
      setTouchTrails((prev) => [...prev, newTrail]);
    }

    setTouchState((prev) => ({
      ...prev,
      isTouching: false,
      direction,
      message,
    }));

    touchStartRef.current = null;
  };

  // SVG の polyline に渡す文字列形式に変換
  const pointsString = touchState.points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Touch Trace & Swipe
      </h1>

      {/* 操作エリア */}
      <div
        ref={containerRef}
        className="w-full max-w-md h-64 bg-white rounded-xl shadow-lg border-2 border-blue-500 flex items-center justify-center overflow-hidden relative touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 背景のガイドテキスト */}
        <div className="text-center pointer-events-none absolute inset-0 flex items-center justify-center z-0">
          <p className="text-lg font-semibold text-blue-200">ここに線を描く</p>
        </div>

        {/* 軌跡描画用 SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* 保存された軌跡（過去のストローク） */}
          {touchTrails.map((trail) => {
            const trailPoints = trail.points
              .map((p) => `${p.x},${p.y}`)
              .join(" ");
            return (
              <polyline
                key={`trail-${trail.id}`}
                points={trailPoints}
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              />
            );
          })}

          {/* 現在のタッチ中の軌跡 */}
          {touchState.points.length > 1 && (
            <polyline
              points={pointsString}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* タップマーク（過去のタッチ位置）- 永続維持 */}
        {touchMarks.map((mark) => (
          <div
            key={`mark-${mark.id}`}
            className="absolute w-6 h-6 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{
              left: mark.x,
              top: mark.y,
            }}
          />
        ))}

        {/* 現在の指の位置を表示するドット */}
        {touchState.isTouching && (
          <div
            className="absolute w-6 h-6 bg-red-500 rounded-full opacity-60 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 shadow-sm"
            style={{
              left: touchState.currentX,
              top: touchState.currentY,
            }}
          />
        )}
      </div>

      {/* クリアボタン */}
      <button
        onClick={handleClear}
        className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
      >
        軌跡をクリア
      </button>

      {/* デバッグ情報表示エリア */}
      <div className="w-full max-w-md mt-6 bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto">
        <p className="font-bold text-white mb-2 border-b border-gray-600 pb-1">
          Status Log:
        </p>
        <p>{touchState.message}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>Active Points: {touchState.points.length}</div>
          <div>Saved Trails: {touchTrails.length}</div>
          <div>Touch Marks: {touchMarks.length}</div>
          <div>
            Direction:{" "}
            <span className="text-yellow-400 font-bold">
              {touchState.direction || "NONE"}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          ※軌跡とマークは永続的に維持されます（クリアボタンで消去可能）
        </p>
      </div>
    </main>
  );
}
