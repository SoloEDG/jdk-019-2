import { doc } from "../../../shared/document";
import { translate } from "../lib/translate";
import { draggableIds } from "../../masks/model/select";
/** 普通模式整组移动（内容与遮罩一起），隔离模式只移动当前选中者 */
export function translateSelected(x: number, y: number) {
  const ids = new Set(draggableIds());
  doc.shapes.filter((s) => ids.has(s.id)).forEach((s) => translate(s, x, y));
}
