import type { MaskRole, Shape } from "../../../shared/types";
import { doc, notify } from "../../../shared/document";
import { beginEdit } from "../../drawing/model/history";
import { bbox, defaultGradient } from "../lib/bbox";
import { ellipseNodes } from "../lib/geometry";
import { masksOf, wouldCycle } from "../lib/relations";

function createMaskShape(source: Shape): Shape {
  const b = bbox([source]);
  const pad = Math.max(18, Math.max(b.w, b.h) * 0.08);
  const mask: Shape = {
    id: crypto.randomUUID(),
    name: source.name + " Mask",
    nodes: ellipseNodes({
      x: b.x - pad,
      y: b.y - pad,
      w: b.w + pad * 2,
      h: b.h + pad * 2,
    }),
    closed: true,
    fill: "#ffffff",
    stroke: "#7e56d8",
    width: 1.5,
    opacity: 1,
  };
  const i = doc.shapes.findIndex((s) => s.id === source.id);
  doc.shapes.splice(i + 1, 0, mask);
  return mask;
}

/** 当前选区涉及的遮罩组 id */
export function activeGroupId(): string | undefined {
  const hit = doc.shapes.find((s) => doc.selected.includes(s.id) && s.maskId);
  return hit?.maskId;
}

/**
 * 非破坏创建遮罩：
 *  - 选中 1 个对象 → 自动生成包围它的椭圆遮罩，其余全部内容入组
 *  - 选中多个对象 → 第一个作为遮罩，其余作为内容
 * 仅写入引用关系，不修改任何内容几何。
 */
export function makeMask(role: MaskRole) {
  const chosen = doc.shapes.filter((s) => doc.selected.includes(s.id));
  if (!chosen.length) {
    notify("先选择一个或多个对象再创建遮罩");
    return;
  }
  beginEdit();
  let mask: Shape;
  let content: Shape[];
  if (chosen.length === 1) {
    mask = createMaskShape(chosen[0]);
    content = doc.shapes.filter((s) => s.id !== mask.id);
  } else {
    mask = chosen[0];
    content = chosen.slice(1);
  }
  const gid = crypto.randomUUID();
  mask.maskRole = role;
  mask.maskId = gid;
  mask.parentMaskId = undefined;
  mask.gradient = role === "opacity" ? defaultGradient([mask]) : undefined;
  content.forEach((s) => (s.maskId = gid));
  doc.selected = [mask.id, ...content.map((s) => s.id)];
  notify(
    role === "clip"
      ? "已创建剪切遮罩：仅隐藏边界外内容，不改变透明度"
      : "已创建透明度遮罩：按遮罩明度真正改变内容 alpha",
  );
}

/** 释放遮罩：只解除引用，内容几何从未被修改，立即恢复原始形状 */
export function releaseMask(gid?: string) {
  const id = gid ?? activeGroupId();
  if (!id) return;
  beginEdit();
  for (const s of doc.shapes) {
    if (s.maskId === id) {
      const wasMask = !!s.maskRole;
      s.maskId = undefined;
      s.maskRole = undefined;
      s.parentMaskId = undefined;
      if (wasMask) s.gradient = undefined;
    }
  }
  if (doc.isolated === id) doc.isolated = null;
  doc.selected = [];
  notify("遮罩已释放，内容恢复原始形状");
}

/** 在两种遮罩语义之间切换，二者始终独立建模，不合并为裁边 */
export function setMaskRole(role: MaskRole) {
  const gid = activeGroupId();
  const mask = gid ? masksOf(doc.shapes, gid)[0] : undefined;
  if (!mask) return;
  beginEdit();
  mask.maskRole = role;
  if (role === "opacity") {
    if (!mask.gradient) mask.gradient = defaultGradient([mask]);
  } else {
    mask.gradient = undefined;
  }
}

/** 嵌套：把 child 组的遮罩挂到 parent 组之下；任何闭环都在创建前阻止 */
export function nestGroup(childId: string, parentId: string) {
  if (childId === parentId) return;
  if (wouldCycle(doc.shapes, childId, parentId)) {
    notify("操作已阻止：该嵌套会形成循环引用");
    return;
  }
  const mask = masksOf(doc.shapes, childId)[0];
  if (!mask || !masksOf(doc.shapes, parentId)[0]) return;
  beginEdit();
  mask.parentMaskId = parentId;
  notify("嵌套完成：内外遮罩分别计算，未合成单一裁边");
}

/** 解除一层嵌套关系，组本身保留 */
export function unparentGroup(gid?: string) {
  const id = gid ?? activeGroupId();
  const mask = id ? masksOf(doc.shapes, id)[0] : undefined;
  if (!mask?.parentMaskId) return;
  beginEdit();
  mask.parentMaskId = undefined;
}

/** 进入隔离编辑：可分别选择遮罩与内容 */
export function enterIsolation(gid: string) {
  doc.isolated = gid;
  const mask = masksOf(doc.shapes, gid)[0];
  doc.selected = mask ? [mask.id] : [];
}

/** 退出隔离，回到整组编辑 */
export function exitIsolation() {
  const gid = doc.isolated;
  doc.isolated = null;
  if (gid)
    doc.selected = doc.shapes.filter((s) => s.maskId === gid).map((s) => s.id);
}
