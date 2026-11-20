import type { Gradient, Point, Shape } from "../../../shared/types";

export function bbox(shapes: Shape[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const s of shapes) {
    for (const n of s.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function center(shapes: Shape[]): Point {
  const b = bbox(shapes);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** 新建遮罩时的默认线性渐变：横跨遮罩包围盒，由不透明过渡到透明 */
export function defaultGradient(shapes: Shape[]): Gradient {
  const b = bbox(shapes);
  const pad = 0.12;
  return {
    x1: b.x + b.w * pad,
    y1: b.y + b.h / 2,
    x2: b.x + b.w * (1 - pad),
    y2: b.y + b.h / 2,
    stops: [
      { offset: 0, color: "#ffffff" },
      { offset: 1, color: "#000000" },
    ],
  };
}
