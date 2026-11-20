import { beginEdit } from "../../drawing/model/history";
import { doc } from "../../../shared/document";
import { masksOf } from "../lib/relations";
import type { Gradient, GradientStop } from "../../../shared/types";

export function activeMask() {
  const id = doc.shapes.find((s) => doc.selected.includes(s.id))?.maskId;
  return id ? masksOf(doc.shapes, id)[0] : undefined;
}

export function activeGradient(): Gradient | undefined {
  return activeMask()?.gradient;
}

function withMaskGradient(fn: (g: Gradient) => void) {
  const mask = activeMask();
  if (!mask?.gradient) return;
  beginEdit();
  fn(mask.gradient);
}

export function setGradientAxis(which: "x1" | "y1" | "x2" | "y2", v: number) {
  withMaskGradient((g) => (g[which] = v));
}

export function setStop(i: number, patch: Partial<GradientStop>) {
  withMaskGradient((g) => Object.assign(g.stops[i], patch));
}

export function addStop() {
  const g = activeGradient();
  if (!g || g.stops.length >= 5) return;
  beginEdit();
  const last = g.stops[g.stops.length - 1];
  g.stops.push({
    offset: Math.min(1, last.offset + 0.15),
    color: last.color,
  });
}

export function removeStop(i: number) {
  const g = activeGradient();
  if (!g || g.stops.length <= 2) return;
  beginEdit();
  g.stops.splice(i, 1);
}
