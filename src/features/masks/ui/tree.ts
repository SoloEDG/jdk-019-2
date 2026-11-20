import { computed } from "vue";
import { doc } from "../../../shared/document";
import { path } from "../../drawing/lib/path";
import { buildTree, flattenGroups } from "../lib/tree";

export const renderTree = computed(() => buildTree(doc.shapes, path));
export const renderGroups = computed(() => flattenGroups(renderTree.value));
