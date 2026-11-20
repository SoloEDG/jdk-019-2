<script setup lang="ts">
import { select } from "../../nodes";
import { doc } from "../../../shared/document";
import { group, reorder, remove } from "../model/actions";
import { enterIsolation } from "../../masks/model/actions";

function icon(s: (typeof doc.shapes)[number]) {
  if (s.maskRole === "clip") return "✂";
  if (s.maskRole === "opacity") return "◐";
  return s.group ? "▧" : "◇";
}
function dbl(id: string) {
  const s = doc.shapes.find((x) => x.id === id);
  if (s?.maskId) enterIsolation(s.maskId);
}
</script>
<template>
  <section class="layers">
    <h3>
      Layers <span>{{ doc.shapes.length }}</span>
    </h3>
    <p v-if="doc.isolated" class="isolation-hint" data-testid="isolation-hint">
      隔离编辑中 · 遮罩与内容可分别调整 · Esc 退出
    </p>
    <div class="layer-actions">
      <button @click="group" data-testid="group">Group</button
      ><button @click="reorder(1)">↑</button
      ><button @click="reorder(-1)">↓</button><button @click="remove">⌫</button>
    </div>
    <button
      class="layer"
      v-for="s in [...doc.shapes].reverse()"
      :class="{ chosen: doc.selected.includes(s.id) }"
      @click="select(s.id, $event.shiftKey)"
      @dblclick="dbl(s.id)"
    >
      <i :style="{ background: s.fill }"></i>{{ icon(s) }} {{ s.name
      }}<span v-if="s.maskId">遮罩组</span>
    </button>
  </section>
</template>
