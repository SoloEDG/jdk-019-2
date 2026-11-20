export interface Point {
  x: number;
  y: number;
}
export interface Node extends Point {
  in: Point;
  out: Point;
}
export interface GradientStop {
  offset: number;
  color: string;
}
export interface Gradient {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: GradientStop[];
}
export type MaskRole = "clip" | "opacity";
export interface Shape {
  id: string;
  name: string;
  nodes: Node[];
  closed: boolean;
  fill: string;
  stroke: string;
  width: number;
  opacity: number;
  group?: string;
  /** 当该形状充当遮罩时，遮罩的类型；缺省表示普通内容 */
  maskRole?: MaskRole;
  /** 遮罩关系：内容与遮罩共享同一个 maskId，关系是引用而非几何修改 */
  maskId?: string;
  /** 嵌套：仅遮罩形状使用，指向父级遮罩组 id */
  parentMaskId?: string;
  /** 透明度遮罩使用的线性渐变（白=不透明，黑=透明） */
  gradient?: Gradient;
}
export interface Document {
  shapes: Shape[];
  selected: string[];
  tool: string;
  zoom: number;
  /** 隔离编辑中的遮罩组 id；null 表示在顶层编辑 */
  isolated: string | null;
  /** 轻量操作反馈信息（如循环引用被阻止） */
  notice: string;
}
