import { createApp } from "vue";
import App from "./app/App.vue";
import "./app/style.css";
import { doc } from "./shared/document";
import { selectShape, draggableIds } from "./features/masks/model/select";
import { translateSelected } from "./features/layers/model/drag";
import { nestGroup } from "./features/masks/model/actions";
createApp(App).mount("#app");
// 供自动化测试与调试检查文档模型
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__doc = doc;
  (window as unknown as Record<string, unknown>).__test = {
    selectShape,
    draggableIds,
    translateSelected,
    nestGroup,
  };
}
