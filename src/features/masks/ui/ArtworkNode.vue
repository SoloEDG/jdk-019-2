<script setup lang="ts">
import type { RenderNode } from "../lib/tree";
import { doc } from "../../../shared/document";
import ArtworkNode from "./ArtworkNode.vue";

defineProps<{ node: RenderNode }>();

function groupAttr(node: Extract<RenderNode, { kind: "group" }>) {
  return node.role === "clip"
    ? { "clip-path": `url(#clip-${node.maskId})` }
    : { mask: `url(#mask-${node.maskId})` };
}
</script>
<template>
  <path
    v-if="node.kind === 'shape'"
    :data-shape="node.shape.id"
    :d="node.d"
    :fill="node.shape.fill"
    :stroke="node.shape.stroke"
    :stroke-width="node.shape.width"
    :opacity="node.shape.opacity"
  />
  <g v-else v-bind="groupAttr(node)">
    <ArtworkNode
      v-for="child in node.children"
      :key="child.kind === 'shape' ? child.shape.id : child.maskId"
      :node="child"
    />
  </g>
</template>
