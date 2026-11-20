<script setup lang="ts">
import { doc } from "../../../shared/document";
import { path } from "../../drawing/lib/path";
import { serializeArtwork } from "../../masks/lib/serialize";
import { download } from "../model/download";
import { save, restore } from "../model/storage";
</script>
<template>
  <div class="export">
    <button @click="restore">Restore</button
    ><button @click="save">Save project</button
    ><button
      class="primary"
      data-testid="export"
      @click="download(serializeArtwork(doc.shapes, path))"
    >
      Export SVG ↗
    </button>
  </div>
</template>
