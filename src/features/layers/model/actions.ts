import { beginEdit } from "../../drawing/model/history";
import { doc } from "../../../shared/document";
import { masksOf } from "../../masks/lib/relations";

export function group() {
  beginEdit();
  const id = crypto.randomUUID();
  const selected = doc.shapes.filter((s) => doc.selected.includes(s.id));
  if (selected.length < 2) return;
  const top = doc.shapes
    .map((s) => doc.selected.includes(s.id))
    .lastIndexOf(true);
  const below = doc.shapes
    .slice(0, top + 1)
    .filter((s) => !doc.selected.includes(s.id));
  const above = doc.shapes.slice(top + 1);
  selected.forEach((s) => (s.group = id));
  doc.shapes = [...below, ...selected, ...above];
}
export function reorder(delta: number) {
  const first = doc.shapes.find((s) => doc.selected.includes(s.id));
  if (!first) return;
  const blocks: (typeof doc.shapes)[] = [];
  for (const shape of doc.shapes) {
    const last = blocks.at(-1);
    if (shape.group && last?.[0].group === shape.group) last.push(shape);
    else blocks.push([shape]);
  }
  const i = blocks.findIndex((b) => b.some((s) => s.id === first.id)),
    j = i + delta;
  if (j < 0 || j >= blocks.length) return;
  beginEdit();
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  doc.shapes = blocks.flat();
}

/**
 * 删除选区：若被删的是某个遮罩组的遮罩，先释放整组，
 * 避免留下没有遮罩的悬空组（加载时也会兜底修复）。
 */
export function remove() {
  const doomed = new Set(doc.selected);
  const orphanGroups = new Set<string>();
  for (const id of doomed) {
    const s = doc.shapes.find((x) => x.id === id);
    if (s?.maskRole && s.maskId) orphanGroups.add(s.maskId);
  }
  beginEdit();
  if (orphanGroups.size) {
    for (const gid of orphanGroups) {
      const mask = masksOf(doc.shapes, gid)[0];
      for (const s of doc.shapes) {
        if (s.maskId === gid) {
          s.maskId = undefined;
          s.parentMaskId = undefined;
          if (s === mask) s.maskRole = undefined;
        }
      }
    }
  }
  doc.shapes = doc.shapes.filter((s) => !doomed.has(s.id));
  if (doc.isolated && orphanGroups.has(doc.isolated)) doc.isolated = null;
  doc.selected = [];
}
