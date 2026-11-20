import { doc } from "../../../shared/document";
import { familyIds } from "../lib/relations";

/**
 * 画布/图层点击的统一选择入口：
 *  - 隔离模式下分别选择遮罩或内容
 *  - 普通模式下整族选中（内容与遮罩一起移动）
 */
export function selectShape(id: string, multi: boolean) {
  const shape = doc.shapes.find((s) => s.id === id);
  if (!shape) return;
  if (doc.isolated) {
    const inside = shape.maskId === doc.isolated;
    doc.selected =
      multi && inside
        ? [...new Set([...doc.selected, id])]
        : inside
          ? [id]
          : doc.selected;
    return;
  }
  const ids = familyIds(doc.shapes, id);
  doc.selected = multi ? [...new Set([...doc.selected, ...ids])] : ids;
}

/** 当前实际应整体平移的形状 id（普通模式含遮罩，隔离模式只动选中者） */
export function draggableIds(): string[] {
  if (doc.isolated) return [...doc.selected];
  const out = new Set<string>();
  for (const id of doc.selected) {
    familyIds(doc.shapes, id).forEach((fid) => out.add(fid));
  }
  return [...out];
}
