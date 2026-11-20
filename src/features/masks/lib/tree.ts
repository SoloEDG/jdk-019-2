import type { MaskRole, Shape } from "../../../shared/types";
import { masksOf } from "./relations";

export interface RenderShape {
  kind: "shape";
  shape: Shape;
  d: string;
}
export interface RenderGroup {
  kind: "group";
  maskId: string;
  role: MaskRole;
  mask: Shape;
  d: string;
  hasGradient: boolean;
  children: RenderNode[];
}
export type RenderNode = RenderShape | RenderGroup;

/**
 * 把扁平的形状数组构建成嵌套渲染树。
 * 遮罩形状本身不进树（由 defs 引用），内容形状保留独立节点与顺序。
 * 同一份树同时驱动屏幕画布与独立 SVG 导出。
 */
export function buildTree(
  shapes: Shape[],
  toPath: (s: Shape) => string,
): RenderNode[] {
  const docIndex = new Map(shapes.map((s, i) => [s.id, i]));
  const groups = new Map<string, RenderGroup>();

  const ensureGroup = (gid: string): RenderGroup => {
    const existing = groups.get(gid);
    if (existing) return existing;
    const mask = masksOf(shapes, gid)[0];
    const node: RenderGroup = {
      kind: "group",
      maskId: gid,
      role: mask.maskRole!,
      mask,
      d: toPath(mask),
      hasGradient: mask.maskRole === "opacity" && !!mask.gradient,
      children: [],
    };
    groups.set(gid, node);
    return node;
  };

  const roots: RenderNode[] = [];
  // 先为每个遮罩组预建节点——即使该组暂时没有直属内容（仅嵌套了子组），
  // 它的遮罩定义与嵌套关系也必须保留，不能在渲染时丢失。
  for (const s of shapes) {
    if (s.maskRole && s.maskId) ensureGroup(s.maskId);
  }
  for (const s of shapes) {
    if (s.maskRole) continue;
    if (!s.maskId) {
      roots.push({ kind: "shape", shape: s, d: toPath(s) });
      continue;
    }
    ensureGroup(s.maskId).children.push({
      kind: "shape",
      shape: s,
      d: toPath(s),
    });
  }

  const memberIndex = (gid: string) =>
    Math.min(
      ...shapes.filter((s) => s.maskId === gid).map((s) => docIndex.get(s.id)!),
    );
  const firstIndex = (n: RenderNode): number =>
    n.kind === "shape"
      ? (docIndex.get(n.shape.id) ?? Infinity)
      : memberIndex(n.maskId);

  for (const [gid, node] of groups) {
    const parentId = node.mask.parentMaskId;
    const parent = parentId ? groups.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortNodes = (list: RenderNode[]) =>
    list.sort((a, b) => firstIndex(a) - firstIndex(b));
  sortNodes(roots);
  groups.forEach((g) => sortNodes(g.children));
  return roots;
}

/** 外 → 内展开所有遮罩组，用于生成 defs */
export function flattenGroups(nodes: RenderNode[]): RenderGroup[] {
  const out: RenderGroup[] = [];
  const walk = (list: RenderNode[]) => {
    for (const n of list) {
      if (n.kind === "group") {
        out.push(n);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}
