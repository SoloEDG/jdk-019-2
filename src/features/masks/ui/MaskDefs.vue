<script setup lang="ts">
import { renderGroups } from "./tree";
</script>
<template>
  <defs>
    <template v-for="g in renderGroups" :key="g.maskId">
      <linearGradient
        v-if="g.hasGradient"
        :id="'grad-' + g.maskId"
        gradientUnits="userSpaceOnUse"
        :x1="g.mask.gradient!.x1"
        :y1="g.mask.gradient!.y1"
        :x2="g.mask.gradient!.x2"
        :y2="g.mask.gradient!.y2"
      >
        <stop
          v-for="(st, i) in g.mask.gradient!.stops"
          :key="i"
          :offset="st.offset"
          :stop-color="st.color"
        />
      </linearGradient>
      <clipPath
        v-if="g.role === 'clip'"
        :id="'clip-' + g.maskId"
        clipPathUnits="userSpaceOnUse"
      >
        <path :d="g.d" />
      </clipPath>
      <mask
        v-else
        :id="'mask-' + g.maskId"
        maskUnits="userSpaceOnUse"
        maskContentUnits="userSpaceOnUse"
      >
        <path
          :d="g.d"
          :fill="g.hasGradient ? `url(#grad-${g.maskId})` : '#ffffff'"
        />
      </mask>
    </template>
  </defs>
</template>
