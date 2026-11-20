<script setup lang="ts">
import { computed } from "vue";
import { doc } from "../../../shared/document";
import { path } from "../../drawing/lib/path";
import { bbox } from "../lib/bbox";
import { masksOf } from "../lib/relations";
import { selectShape } from "../model/select";
import { enterIsolation } from "../model/actions";

const masks = computed(() => doc.shapes.filter((s) => s.maskRole && s.maskId));

const visibleMasks = computed(() =>
  masks.value.filter((m) => {
    if (doc.isolated) return m.maskId === doc.isolated;
    return (
      doc.selected.includes(m.id) ||
      doc.shapes.some(
        (s) => s.maskId === m.maskId && doc.selected.includes(s.id),
      )
    );
  }),
);

const isolatedBox = computed(() => {
  if (!doc.isolated) return null;
  const members = doc.shapes.filter((s) => s.maskId === doc.isolated);
  if (!members.length) return null;
  const b = bbox(members);
  return { ...b, pad: 14 };
});

function pick(e: PointerEvent, id: string) {
  e.stopPropagation();
  selectShape(id, e.shiftKey);
}
function dbl(e: MouseEvent, id: string) {
  e.stopPropagation();
  enterIsolation(id);
}
</script>
<template>
  <g>
    <rect
      v-if="isolatedBox"
      :x="isolatedBox.x - isolatedBox.pad"
      :y="isolatedBox.y - isolatedBox.pad"
      :width="isolatedBox.w + isolatedBox.pad * 2"
      :height="isolatedBox.h + isolatedBox.pad * 2"
      rx="10"
      fill="none"
      stroke="#7e56d8"
      stroke-width="1.2"
      stroke-dasharray="7 5"
      opacity="0.9"
      pointer-events="none"
    />
    <path
      v-for="m in visibleMasks"
      :key="m.id"
      :d="path(m)"
      fill="none"
      :stroke="m.maskRole === 'clip' ? '#2f9e8f' : '#d8763a'"
      stroke-width="1.6"
      stroke-dasharray="6 4"
      :data-mask="m.id"
      style="pointer-events: all; cursor: pointer"
      @pointerdown="pick($event, m.id)"
      @dblclick="dbl($event, m.maskId!)"
    />
  </g>
</template>
