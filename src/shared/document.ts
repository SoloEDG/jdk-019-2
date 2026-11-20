import { reactive } from "vue";
import type { Document } from "./types";
export const doc = reactive<Document>({
  shapes: [],
  selected: [],
  tool: "select",
  zoom: 1,
  isolated: null,
  notice: "",
});
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
export function notify(message: string) {
  doc.notice = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (doc.notice = ""), 3200);
}
