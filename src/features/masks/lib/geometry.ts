import type { Node } from "../../../shared/types";

/** 用三次贝塞尔手柄构造平滑椭圆节点（用于自动生成的遮罩形状） */
export function ellipseNodes(b: {
  x: number;
  y: number;
  w: number;
  h: number;
}): Node[] {
  const cx = b.x + b.w / 2,
    cy = b.y + b.h / 2,
    rx = b.w / 2,
    ry = b.h / 2,
    k = 0.5523;
  const mk = (
    x: number,
    y: number,
    ix: number,
    iy: number,
    ox: number,
    oy: number,
  ): Node => ({ x, y, in: { x: ix, y: iy }, out: { x: ox, y: oy } });
  return [
    mk(cx + rx, cy, cx + rx, cy + k * ry, cx + rx, cy - k * ry),
    mk(cx, cy + ry, cx + k * rx, cy + ry, cx - k * rx, cy + ry),
    mk(cx - rx, cy, cx - rx, cy - k * ry, cx - rx, cy + k * ry),
    mk(cx, cy - ry, cx - k * rx, cy - ry, cx + k * rx, cy - ry),
  ];
}
