<script setup lang="ts">
import { computed } from "vue";
import { doc } from "../../../shared/document";
import {
  activeGroupId,
  enterIsolation,
  exitIsolation,
  makeMask,
  nestGroup,
  releaseMask,
  setMaskRole,
  unparentGroup,
} from "../model/actions";
import { masksOf } from "../lib/relations";

const gid = computed(() => activeGroupId());
const current = computed(() =>
  gid.value ? masksOf(doc.shapes, gid.value)[0] : undefined,
);
const nestCandidates = computed(() =>
  doc.shapes
    .filter((s) => s.maskRole && s.maskId && s.maskId !== gid.value)
    .map((s) => ({ id: s.maskId!, label: s.name, role: s.maskRole! })),
);
function nest(e: Event) {
  const parentId = (e.target as HTMLSelectElement).value;
  if (gid.value && parentId) nestGroup(gid.value, parentId);
  (e.target as HTMLSelectElement).value = "";
}
</script>
<template>
  <section class="mask-bar" data-testid="mask-bar">
    <div class="mask-row">
      <button data-testid="make-clip" @click="makeMask('clip')">
        ✂ 剪切遮罩
      </button>
      <button data-testid="make-opacity" @click="makeMask('opacity')">
        ◐ 透明度遮罩
      </button>
    </div>
    <template v-if="current">
      <div class="mask-row">
        <button
          :class="{ active: current.maskRole === 'clip' }"
          @click="setMaskRole('clip')"
        >
          仅隐藏
        </button>
        <button
          :class="{ active: current.maskRole === 'opacity' }"
          @click="setMaskRole('opacity')"
        >
          改变透明度
        </button>
        <button
          v-if="doc.isolated !== gid"
          data-testid="isolate"
          @click="enterIsolation(gid!)"
        >
          ⇥ 进入内部
        </button>
        <button v-else data-testid="exit-isolation" @click="exitIsolation">
          ⇤ 退出内部
        </button>
      </div>
      <div class="mask-row">
        <label class="nest">
          嵌套到
          <select data-testid="nest-select" :value="''" @change="nest">
            <option value="">— 选择父遮罩 —</option>
            <option v-for="c in nestCandidates" :key="c.id" :value="c.id">
              {{ c.label }}（{{ c.role === "clip" ? "剪切" : "透明" }}）
            </option>
          </select>
        </label>
        <button
          v-if="current.parentMaskId"
          data-testid="unparent"
          @click="unparentGroup()"
        >
          解除嵌套
        </button>
        <button data-testid="release" @click="releaseMask()">释放遮罩</button>
      </div>
    </template>
  </section>
</template>
