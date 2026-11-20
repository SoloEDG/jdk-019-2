import { beginEdit, revision } from "../../drawing/model/history";
import { ref } from "vue";
import { doc } from "../../../shared/document";
import { repairReferences } from "../../masks/lib/relations";
import type { Gradient, Shape, Point } from "../../../shared/types";
export const storageStatus = ref("All changes saved locally");
export function save() {
  try {
    localStorage.setItem("forma-document", JSON.stringify(doc.shapes));
    storageStatus.value = "All changes saved locally";
  } catch {
    storageStatus.value =
      "Local storage unavailable — export to keep your work";
  }
}
function point(v: Point) {
  return v && Number.isFinite(v.x) && Number.isFinite(v.y);
}
function validGradient(g: unknown): g is Gradient {
  if (!g || typeof g !== "object") return false;
  const v = g as Record<string, unknown>;
  if (!Array.isArray(v.stops) || v.stops.length < 2) return false;
  return ["x1", "y1", "x2", "y2"].every((k) => Number.isFinite(v[k] as number));
}
function validNode(n: unknown): boolean {
  if (!n || typeof n !== "object") return false;
  const v = n as { x?: unknown; y?: unknown; in?: unknown; out?: unknown };
  return point(v as Point) && point(v.in as Point) && point(v.out as Point);
}
function valid(s: unknown): s is Shape {
  if (!s || typeof s !== "object") return false;
  const v = s as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Array.isArray(v.nodes) &&
    v.nodes.every(validNode) &&
    typeof v.fill === "string" &&
    /^(none|#[0-9a-f]{3,8})$/i.test(v.fill) &&
    typeof v.stroke === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(v.stroke) &&
    Number.isFinite(v.width) &&
    Number.isFinite(v.opacity) &&
    (v.maskRole === undefined ||
      v.maskRole === "clip" ||
      v.maskRole === "opacity") &&
    (v.maskId === undefined || typeof v.maskId === "string") &&
    (v.parentMaskId === undefined || typeof v.parentMaskId === "string") &&
    (v.gradient === undefined || validGradient(v.gradient))
  );
}
export function restore() {
  try {
    const value = JSON.parse(localStorage.getItem("forma-document") || "null");
    if (Array.isArray(value) && value.every(valid)) {
      beginEdit();
      // 深拷贝后修复悬空/循环引用，任何损坏都不会阻止文档再次打开
      const shapes: Shape[] = JSON.parse(JSON.stringify(value));
      const problems = repairReferences(shapes);
      doc.shapes = shapes;
      doc.isolated = null;
      revision.value++;
      doc.selected = [];
      if (problems.length) {
        storageStatus.value =
          "已修复损坏的遮罩引用并安全加载（" + problems.length + " 处）";
      }
      return true;
    }
  } catch {}
  return false;
}
