import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export interface CurvePoint {
  x: number; // 0-255 input value
  y: number; // 0-255 output value
}

interface CurveEditorProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  width?: number;
  height?: number;
  label?: string;
}

// Default linear curve (no adjustment)
export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

// Compute the lookup table from curve points using cubic spline interpolation
export function computeCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  
  if (points.length < 2) {
    // Linear fallback
    for (let i = 0; i < 256; i++) {
      lut[i] = i;
    }
    return lut;
  }

  // Sort points by x
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Simple piecewise linear interpolation for robustness
  for (let i = 0; i < 256; i++) {
    // Find the segment this x falls into
    let leftIdx = 0;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (i >= sorted[j].x) {
        leftIdx = j;
      }
    }
    
    const left = sorted[leftIdx];
    const right = sorted[Math.min(leftIdx + 1, sorted.length - 1)];
    
    if (left.x === right.x) {
      lut[i] = Math.round(left.y);
    } else {
      // Linear interpolation
      const t = (i - left.x) / (right.x - left.x);
      const value = left.y + t * (right.y - left.y);
      lut[i] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }
  
  return lut;
}

export function CurveEditor({ 
  points, 
  onChange, 
  width = 180, 
  height = 180,
  label 
}: CurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const padding = 8;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Convert curve point to canvas coordinates
  const toCanvas = useCallback((point: CurvePoint) => ({
    x: padding + (point.x / 255) * graphWidth,
    y: padding + (1 - point.y / 255) * graphHeight,
  }), [graphWidth, graphHeight]);

  // Convert canvas coordinates to curve point
  const fromCanvas = useCallback((canvasX: number, canvasY: number): CurvePoint => ({
    x: Math.max(0, Math.min(255, Math.round(((canvasX - padding) / graphWidth) * 255))),
    y: Math.max(0, Math.min(255, Math.round((1 - (canvasY - padding) / graphHeight) * 255))),
  }), [graphWidth, graphHeight]);

  // Draw the curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(padding, padding, graphWidth, graphHeight);

    // Grid lines
    ctx.strokeStyle = "hsl(var(--border))";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const pos = padding + (i / 4) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, padding + graphHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, pos);
      ctx.lineTo(padding + graphWidth, pos);
      ctx.stroke();
    }

    // Diagonal reference line (linear)
    ctx.strokeStyle = "hsl(var(--muted-foreground) / 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, padding + graphHeight);
    ctx.lineTo(padding + graphWidth, padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw the curve using LUT
    const lut = computeCurveLUT(points);
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = padding + (i / 255) * graphWidth;
      const y = padding + (1 - lut[i] / 255) * graphHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw control points
    points.forEach((point, index) => {
      const { x, y } = toCanvas(point);
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = hoveredIndex === index || draggingIndex === index 
        ? "hsl(var(--primary))" 
        : "hsl(var(--background))";
      ctx.fill();
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, width, height, graphWidth, graphHeight, toCanvas, hoveredIndex, draggingIndex]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const findPointAtPos = useCallback((x: number, y: number): number | null => {
    const threshold = 12;
    for (let i = 0; i < points.length; i++) {
      const canvasPos = toCanvas(points[i]);
      const dist = Math.sqrt((x - canvasPos.x) ** 2 + (y - canvasPos.y) ** 2);
      if (dist < threshold) {
        return i;
      }
    }
    return null;
  }, [points, toCanvas]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const pointIndex = findPointAtPos(x, y);

    if (pointIndex !== null) {
      setDraggingIndex(pointIndex);
    } else {
      // Add a new point
      const newPoint = fromCanvas(x, y);
      const newPoints = [...points, newPoint].sort((a, b) => a.x - b.x);
      onChange(newPoints);
      // Find the index of the new point
      const newIndex = newPoints.findIndex(p => p.x === newPoint.x && p.y === newPoint.y);
      setDraggingIndex(newIndex);
    }
  }, [getMousePos, findPointAtPos, fromCanvas, points, onChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);

    if (draggingIndex !== null) {
      const newPoint = fromCanvas(x, y);
      
      // Don't allow moving first or last point horizontally
      if (draggingIndex === 0) {
        newPoint.x = 0;
      } else if (draggingIndex === points.length - 1) {
        newPoint.x = 255;
      }

      const newPoints = [...points];
      newPoints[draggingIndex] = newPoint;
      onChange(newPoints.sort((a, b) => a.x - b.x));
    } else {
      setHoveredIndex(findPointAtPos(x, y));
    }
  }, [getMousePos, draggingIndex, fromCanvas, points, onChange, findPointAtPos]);

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setDraggingIndex(null);
    setHoveredIndex(null);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const pointIndex = findPointAtPos(x, y);

    // Remove point if it's not the first or last
    if (pointIndex !== null && pointIndex !== 0 && pointIndex !== points.length - 1) {
      const newPoints = points.filter((_, i) => i !== pointIndex);
      onChange(newPoints);
    }
  }, [getMousePos, findPointAtPos, points, onChange]);

  const handleReset = () => {
    onChange([...DEFAULT_CURVE_POINTS]);
  };

  const isModified = points.length !== 2 || 
    points[0].x !== 0 || points[0].y !== 0 || 
    points[1].x !== 255 || points[1].y !== 255;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {isModified && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs"
              onClick={handleReset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-border cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />
      <span className="text-[10px] text-muted-foreground text-center">
        Click to add • Double-click to remove
      </span>
    </div>
  );
}
