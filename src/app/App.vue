<script setup lang="ts">
import { watch } from "vue";
import { doc } from "../shared/document";
import {
  create,
  add,
  seed,
  beginEdit,
  undo,
  redo,
  revision,
} from "../features/drawing";
import { Tools } from "../features/drawing";
import { NodeOverlay, coordinates } from "../features/nodes";
import { Properties } from "../features/appearance";
import { Layers, translateSelected } from "../features/layers";
import { ExportBar, restore, save, storageStatus } from "../features/export";
import {
  MaskDefs,
  MaskOverlay,
  MaskBar,
  ArtworkNode,
  renderTree,
  selectShape,
  exitIsolation,
} from "../features/masks";
import type { Shape } from "../shared/types";
if (!restore()) seed();
// 默认选中第一个普通内容对象（遮罩形状通过遮罩轮廓单独编辑）
const firstContent = doc.shapes.find((s) => !s.maskRole);
doc.selected = firstContent ? [firstContent.id] : [];
watch(() => doc.shapes, save, { deep: true });
const artwork = renderTree;
let drawing: Shape | undefined;
watch(
  () => doc.tool,
  () => {
    drawing = undefined;
  },
);
watch(revision, () => {
  drawing = undefined;
});
function down(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement;
  const p = coordinates(e, svg);
  beginEdit();
  const id = (e.target as Element).getAttribute("data-shape");
  if (doc.tool === "pen") {
    if (!drawing) drawing = create(p);
    add(drawing, p);
    const n = drawing.nodes.at(-1)!;
    const f = (ev: PointerEvent) => {
      const q = coordinates(ev, svg);
      n.out = q;
      n.in = { x: 2 * n.x - q.x, y: 2 * n.y - q.y };
    };
    window.addEventListener("pointermove", f);
    window.addEventListener(
      "pointerup",
      () => window.removeEventListener("pointermove", f),
      { once: true },
    );
  } else if (id) {
    // 隔离模式下点击组外对象不响应，保证内部编辑互不干扰
    if (doc.isolated) {
      const target = doc.shapes.find((s) => s.id === id);
      if (!target || target.maskId !== doc.isolated) return;
    }
    selectShape(id, e.shiftKey);
    if (doc.tool === "nodes") return;
    let last = p;
    const f = (ev: PointerEvent) => {
      const q = coordinates(ev, svg);
      translateSelected(q.x - last.x, q.y - last.y);
      last = q;
    };
    window.addEventListener("pointermove", f);
    window.addEventListener(
      "pointerup",
      () => window.removeEventListener("pointermove", f),
      { once: true },
    );
  } else {
    if (doc.isolated) return;
    doc.selected = [];
  }
}
function finish() {
  drawing = undefined;
  doc.tool = "select";
}
function canvasDbl(e: MouseEvent) {
  // 双击遮罩轮廓用于进入隔离，不结束钢笔绘制
  if ((e.target as Element).hasAttribute("data-mask")) return;
  finish();
}
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && doc.isolated) {
    exitIsolation();
    return;
  }
  if (e.key === "Enter" || e.key === "Escape") finish();
});
</script>
<template>
  <header>
    <b class="brand">◈ forma <small>VECTOR STUDIO</small></b>
    <div>Bloom exploration <span> / Personal workspace</span></div>
    <ExportBar />
  </header>
  <div class="workspace">
    <div class="left">
      <h5>PROJECT <span>＋</span></h5>
      <p class="project">▣ Bloom / Artboard 01</p>
      <Tools /><MaskBar /><Layers />
      <p class="signature">✧ Designed to explore.</p>
    </div>
    <main>
      <div class="toolbar">
        <span>Artboard 01　<small>800 × 600</small></span>
        <div>
          <button @click="undo">↶</button><button @click="redo">↷</button
          ><button @click="doc.zoom = Math.max(0.4, doc.zoom - 0.1)">−</button
          >{{ Math.round(doc.zoom * 100) }}%<button
            @click="doc.zoom = Math.min(1.5, doc.zoom + 0.1)"
          >
            ＋
          </button>
        </div>
      </div>
      <div class="stage">
        <svg
          data-testid="canvas"
          :style="{
            width: 800 * doc.zoom + 'px',
            height: 600 * doc.zoom + 'px',
          }"
          viewBox="0 0 800 600"
          @pointerdown="down"
          @dblclick="canvasDbl"
        >
          <rect width="800" height="600" fill="#fffdfb" />
          <MaskDefs />
          <ArtworkNode
            v-for="n in artwork"
            :key="n.kind === 'shape' ? n.shape.id : n.maskId"
            :node="n"
          />
          <MaskOverlay />
          <NodeOverlay />
        </svg>
      </div>
      <footer>
        <span>● {{ storageStatus }}</span
        ><span v-if="doc.notice" class="notice" data-testid="notice">{{
          doc.notice
        }}</span>
        <span v-else>{{
          doc.isolated
            ? "隔离编辑：分别调整遮罩与内容 · Esc 退出"
            : doc.tool === "pen"
              ? "Click / drag to draw · Enter to finish"
              : "Shift + click 多选 · 双击遮罩进入内部 · 拖动整组一起移动"
        }}</span><span>{{ doc.selected.length }} selected</span>
      </footer>
    </main>
    <Properties />
  </div>
</template>
