import { doc } from "../../../shared/document";
import { ellipseNodes } from "../../masks/lib/geometry";
import type { Gradient, Shape } from "../../../shared/types";

export function seed() {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      cx = 400 + Math.cos(a) * 100,
      cy = 280 + Math.sin(a) * 100;
    const nodes = Array.from({ length: 4 }, (_, i) => {
      const t = (i * Math.PI) / 2;
      const x = cx + Math.cos(t) * 65,
        y = cy + Math.sin(t) * 65;
      return {
        x,
        y,
        in: { x: x + Math.sin(t) * 36, y: y - Math.cos(t) * 36 },
        out: { x: x - Math.sin(t) * 36, y: y + Math.cos(t) * 36 },
      };
    });
    doc.shapes.push({
      id: "petal" + k,
      name: "Petal " + (k + 1),
      nodes,
      closed: true,
      fill: ["#7850d6", "#a685ed", "#cbb9f4", "#523391"][k % 4],
      stroke: "#ffffff",
      width: 2,
      opacity: 1,
    });
  }

  const clipId = "seed-clip-group";
  const clipMask: Shape = {
    id: "seed-clip-mask",
    name: "Frame Clip",
    nodes: ellipseNodes({ x: 240, y: 120, w: 320, h: 320 }),
    closed: true,
    fill: "#ffffff",
    stroke: "#2f9e8f",
    width: 1.5,
    opacity: 1,
    maskRole: "clip",
    maskId: clipId,
  };
  doc.shapes.push(clipMask);
  doc.shapes
    .filter((s) => s.id.startsWith("petal"))
    .slice(0, 4)
    .forEach((s) => (s.maskId = clipId));

  const opacityId = "seed-opacity-group";
  const gradient: Gradient = {
    x1: 280,
    y1: 280,
    x2: 560,
    y2: 280,
    stops: [
      { offset: 0, color: "#ffffff" },
      { offset: 0.55, color: "#bfbfbf" },
      { offset: 1, color: "#000000" },
    ],
  };
  const opacityMask: Shape = {
    id: "seed-opacity-mask",
    name: "Fade Mask",
    nodes: ellipseNodes({ x: 300, y: 170, w: 260, h: 220 }),
    closed: true,
    fill: "#ffffff",
    stroke: "#d8763a",
    width: 1.5,
    opacity: 1,
    maskRole: "opacity",
    maskId: opacityId,
    parentMaskId: clipId,
    gradient,
  };
  doc.shapes.push(opacityMask);
  // 内层透明度组拥有自己的内容，同时整体又被外层剪切遮罩包裹
  doc.shapes
    .filter((s) => s.id.startsWith("petal"))
    .slice(4)
    .forEach((s) => (s.maskId = opacityId));
}
