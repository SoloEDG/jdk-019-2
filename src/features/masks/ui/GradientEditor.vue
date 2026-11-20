<script setup lang="ts">
import { computed } from "vue";
import {
  activeGradient,
  addStop,
  removeStop,
  setGradientAxis,
  setStop,
} from "../model/gradient";

const axes = ["x1", "y1", "x2", "y2"] as const;
const axisLabels: Record<(typeof axes)[number], string> = {
  x1: "起点 X",
  y1: "起点 Y",
  x2: "终点 X",
  y2: "终点 Y",
};
const previewStyle = computed(() => {
  const g = activeGradient();
  if (!g) return {};
  const css = g.stops
    .map((s) => s.color + " " + s.offset * 100 + "%")
    .join(", ");
  return { background: "linear-gradient(90deg, " + css + ")" };
});
</script>
<template>
  <section v-if="activeGradient()" class="gradient-editor">
    <h4>遮罩渐变（白=不透明，黑=透明）</h4>
    <div class="gradient-preview" :style="previewStyle"></div>
    <label v-for="key in axes" :key="key" class="axis">
      {{ axisLabels[key] }}
      <input
        type="number"
        :value="activeGradient()![key]"
        @input="
          setGradientAxis(key, +($event.target as HTMLInputElement).value)
        "
      />
    </label>
    <div v-for="(st, i) in activeGradient()!.stops" :key="i" class="stop-row">
      <input
        type="color"
        :value="st.color"
        @input="
          setStop(i, { color: ($event.target as HTMLInputElement).value })
        "
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="st.offset"
        @input="
          setStop(i, { offset: +($event.target as HTMLInputElement).value })
        "
      />
      <button
        class="mini"
        data-testid="remove-stop"
        :disabled="activeGradient()!.stops.length <= 2"
        @click="removeStop(i)"
      >
        ✕
      </button>
    </div>
    <button
      class="mini full"
      data-testid="add-stop"
      :disabled="activeGradient()!.stops.length >= 5"
      @click="addStop"
    >
      ＋ 添加色标
    </button>
  </section>
</template>
