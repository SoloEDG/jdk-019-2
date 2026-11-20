import { selectShape } from "../../masks/model/select";
/** 统一走遮罩感知的选择入口（整族选择 / 隔离内分别选择） */
export function select(id: string, multi: boolean) {
  selectShape(id, multi);
}
