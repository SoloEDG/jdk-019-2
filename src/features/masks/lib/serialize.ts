import type { Shape } from "../../../shared/types";
import { buildTree, type RenderNode } from "./tree";

function esc(s: string) {
  return s.replace(/"/g, "'");
}

function shapeTag(n: Extract<RenderNode, { kind: "shape" }>) {
  const s = n.shape;
  return `<path d="${esc(n.d)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.width}" opacity="${s.opacity}"/>`;
}

function gradientDef(id: string, n: Extract<RenderNode, { kind: "group" }>) {
  const g = n.mask.gradient!;
  const stops = g.stops
    .map((st) => `<stop offset="${st.offset}" stop-color="${st.color}"/>`)
    .join("");
  return (
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
    `x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${stops}</linearGradient>`
  );
}

function nodeTag(n: RenderNode, defs: string[]): string {
  if (n.kind === "shape") return shapeTag(n);
  const ref = `m${n.maskId.replace(/-/g, "")}`;
  const inner = n.children.map((c) => nodeTag(c, defs)).join("");
  if (n.role === "clip") {
    defs.push(`<clipPath id="${ref}"><path d="${esc(n.d)}"/></clipPath>`);
    return `<g clip-path="url(#${ref})">${inner}</g>`;
  }
  const fill = n.hasGradient
    ? (() => {
        const gid = `${ref}g`;
        defs.push(gradientDef(gid, n));
        return `url(#${gid})`;
      })()
    : "#ffffff";
  defs.push(
    `<mask id="${ref}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"><path d="${esc(n.d)}" fill="${fill}"/></mask>`,
  );
  return `<g mask="url(#${ref})">${inner}</g>`;
}

/**
 * 把含遮罩关系的文档序列化为自包含 SVG：
 * 遮罩进入 defs，嵌套按渲染树逐层包装，普通查看器直接得到相同结果。
 */
export function serializeArtwork(
  shapes: Shape[],
  toPath: (s: Shape) => string,
) {
  const tree = buildTree(shapes, toPath);
  const defs: string[] = [];
  const body = tree.map((n) => nodeTag(n, defs)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs>${defs.join("")}</defs>${body}</svg>`;
}
