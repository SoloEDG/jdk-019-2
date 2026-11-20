import assert from "node:assert/strict";
import {
  wouldCycle,
  chainOf,
  repairReferences,
  masksOf,
  contentsOf,
  familyIds,
  buildTree,
  flattenGroups,
  serializeArtwork,
  ellipseNodes,
} from "../src/features/masks";
import type { Shape } from "../src/shared/types";

let count = 0;
const test = (name: string, fn: () => void) => {
  fn();
  count++;
  console.log("  ✓ " + name);
};

const node = (x: number, y: number) => ({
  x,
  y,
  in: { x, y },
  out: { x, y },
});
const shape = (id: string, extra: Partial<Shape> = {}): Shape => ({
  id,
  name: id,
  nodes: [node(0, 0), node(10, 0), node(10, 10), node(0, 10)],
  closed: true,
  fill: "#7754d6",
  stroke: "#ffffff",
  width: 1,
  opacity: 1,
  ...extra,
});

// --- 1. 嵌套与循环检测 ---
test("wouldCycle 检测自引用", () => {
  const shapes = [shape("m1", { maskRole: "clip", maskId: "g1" })];
  assert.equal(wouldCycle(shapes, "g1", "g1"), true);
});

test("wouldCycle 检测两层环", () => {
  const shapes: Shape[] = [
    shape("m1", { maskRole: "clip", maskId: "g1", parentMaskId: "g2" }),
    shape("m2", { maskRole: "opacity", maskId: "g2" }),
  ];
  // g2 想挂到 g1 之下，但 g1 已在 g2 内 → 环
  assert.equal(wouldCycle(shapes, "g2", "g1"), true);
  // g2 挂到无关组 g3 不构成环
  assert.equal(wouldCycle(shapes, "g2", "g3"), false);
});

test("chainOf 外→内展开且遇环终止不爆栈", () => {
  const shapes: Shape[] = [
    shape("m1", { maskRole: "clip", maskId: "g1", parentMaskId: "g2" }),
    shape("m2", { maskRole: "clip", maskId: "g2", parentMaskId: "g1" }),
  ];
  const chain = chainOf(shapes, "g1");
  assert.ok(chain.length <= 2, "环必须被 guard 截断");
  assert.ok(chain.includes("g1") && chain.includes("g2"));
});

// --- 2. 族选择 ---
test("familyIds 返回整组成员", () => {
  const shapes = [
    shape("m1", { maskRole: "clip", maskId: "g1" }),
    shape("c1", { maskId: "g1" }),
    shape("c2", { maskId: "g1" }),
    shape("solo"),
  ];
  assert.deepEqual(familyIds(shapes, "c1").sort(), ["c1", "c2", "m1"]);
  assert.deepEqual(familyIds(shapes, "solo"), ["solo"]);
});

// --- 3. 损坏引用修复 ---
test("repairReferences 组内遮罩缺失时解除引用，内容几何保留", () => {
  const c1 = shape("c1", { maskId: "ghost" });
  const c2 = shape("c2", { maskId: "ghost" });
  const before = JSON.stringify(c1.nodes);
  const problems = repairReferences([c1, c2]);
  assert.equal(c1.maskId, undefined);
  assert.equal(c2.maskId, undefined);
  assert.equal(JSON.stringify(c1.nodes), before, "几何未被修改");
  assert.ok(problems.length >= 1);
});

test("repairReferences 悬空的嵌套父组被解除", () => {
  const shapes: Shape[] = [
    shape("m1", {
      maskRole: "clip",
      maskId: "g1",
      parentMaskId: "missing-parent",
    }),
    shape("c1", { maskId: "g1" }),
  ];
  repairReferences(shapes);
  const m1 = shapes.find((s) => s.id === "m1")!;
  assert.equal(m1.parentMaskId, undefined);
  assert.equal(m1.maskId, "g1", "本组关系保留");
});

test("repairReferences 断开嵌套环", () => {
  const shapes: Shape[] = [
    shape("m1", { maskRole: "clip", maskId: "g1", parentMaskId: "g2" }),
    shape("c1", { maskId: "g1" }),
    shape("m2", { maskRole: "clip", maskId: "g2", parentMaskId: "g1" }),
    shape("c2", { maskId: "g2" }),
  ];
  repairReferences(shapes);
  const m1 = shapes.find((s) => s.id === "m1")!;
  const m2 = shapes.find((s) => s.id === "m2")!;
  assert.ok(
    m1.parentMaskId === undefined || m2.parentMaskId === undefined,
    "至少一环被断开",
  );
});

test("repairReferences 组内无遮罩时解除全部引用", () => {
  const shapes = [shape("c1", { maskId: "g1" }), shape("c2", { maskId: "g1" })];
  repairReferences(shapes);
  assert.ok(shapes.every((s) => s.maskId === undefined));
});

test("repairReferences 多遮罩时保留首个、其余完全移出组", () => {
  const m1 = shape("m1", { maskRole: "clip", maskId: "g1" });
  const m2 = shape("m2", { maskRole: "opacity", maskId: "g1" });
  const c1 = shape("c1", { maskId: "g1" });
  const shapes: Shape[] = [m1, m2, c1];
  repairReferences(shapes);
  assert.equal(masksOf(shapes, "g1").length, 1);
  assert.equal(masksOf(shapes, "g1")[0].id, "m1");
  assert.equal(m2.maskRole, undefined);
  assert.equal(m2.maskId, undefined, "重复遮罩完全脱离组成为独立形状");
  assert.equal(contentsOf(shapes, "g1").length, 1);
  assert.equal(m2.nodes.length, 4, "几何保留");
});

// --- 4. 渲染树嵌套 ---
test("buildTree 遮罩不进树、内容保留独立节点", () => {
  const shapes: Shape[] = [
    shape("c1", { maskId: "g1" }),
    shape("m1", { maskRole: "clip", maskId: "g1" }),
    shape("solo"),
  ];
  const tree = buildTree(shapes, () => "D");
  assert.equal(tree.length, 2);
  const group = tree.find((n) => n.kind === "group");
  assert.ok(group && group.kind === "group");
  if (group?.kind === "group") {
    assert.equal(group.children.length, 1);
    assert.equal(group.role, "clip");
  }
});

test("buildTree 嵌套组生成父子层级", () => {
  const shapes: Shape[] = [
    shape("mOuter", { maskRole: "clip", maskId: "gO" }),
    shape("outerContent", { maskId: "gO" }),
    shape("mInner", {
      maskRole: "opacity",
      maskId: "gI",
      parentMaskId: "gO",
    }),
    shape("innerContent", { maskId: "gI" }),
  ];
  const tree = buildTree(shapes, () => "D");
  const outer = tree.find((n) => n.kind === "group")!;
  assert.equal(outer.kind, "group");
  if (outer.kind === "group") {
    const inner = outer.children.find((n) => n.kind === "group");
    assert.ok(inner, "内层遮罩组作为外层的子节点");
  }
  const flat = flattenGroups(tree);
  assert.deepEqual(
    flat.map((g) => g.maskId),
    ["gO", "gI"],
    "defs 按外→内顺序",
  );
});

test("buildTree 仅嵌套、无直属内容的遮罩组仍生成定义", () => {
  // 外层组没有任何直属内容，只通过 parentMaskId 包住内层组
  const shapes: Shape[] = [
    shape("mOuter", { maskRole: "clip", maskId: "gO" }),
    shape("mInner", {
      maskRole: "opacity",
      maskId: "gI",
      parentMaskId: "gO",
    }),
    shape("innerContent", { maskId: "gI" }),
  ];
  const tree = buildTree(shapes, () => "D");
  const flat = flattenGroups(tree);
  assert.deepEqual(
    flat.map((g) => g.maskId),
    ["gO", "gI"],
    "外层空内容组的 clipPath 不能丢失",
  );
  const svg = serializeArtwork(shapes, () => "M0 0Z");
  assert.ok(svg.includes("<clipPath") && svg.includes("<mask"));
});

// --- 5. 序列化：两种语义独立呈现 ---
test("序列化 clip 用 clipPath，opacity 用 mask，不合成裁边", () => {
  const shapes: Shape[] = [
    shape("mO", {
      maskRole: "clip",
      maskId: "gO",
      nodes: [node(0, 0), node(20, 0), node(20, 20), node(0, 20)],
    }),
    shape("oc", { maskId: "gO" }),
    shape("mI", {
      maskRole: "opacity",
      maskId: "gI",
      parentMaskId: "gO",
      gradient: {
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 0,
        stops: [
          { offset: 0, color: "#ffffff" },
          { offset: 1, color: "#000000" },
        ],
      },
    }),
    shape("ic", { maskId: "gI" }),
  ];
  const svg = serializeArtwork(shapes, () => "M0 0 L10 0 Z");
  assert.ok(svg.includes("<clipPath"), "剪切遮罩生成 clipPath");
  assert.ok(svg.includes("<mask"), "透明度遮罩生成 mask");
  assert.ok(svg.includes("<linearGradient"), "渐变进入 defs");
  assert.ok(svg.includes('clip-path="url(#'), "内容被 clip 包装");
  assert.ok(svg.includes('mask="url(#'), "内容被透明度包装");
  // 嵌套：内层 mask 包装出现在外层 clip 包装内部
  const clipIdx = svg.indexOf("clip-path=");
  const maskIdx = svg.indexOf('mask="url');
  assert.ok(clipIdx < maskIdx, "外层 clip 先开标签，内层 mask 在其中");
});

// --- 6. 几何助手 ---
test("ellipseNodes 生成 4 个闭合节点带贝塞尔手柄", () => {
  const nodes = ellipseNodes({ x: 0, y: 0, w: 100, h: 60 });
  assert.equal(nodes.length, 4);
  assert.ok(
    nodes.every((n) => Number.isFinite(n.in.x) && Number.isFinite(n.out.y)),
  );
});

console.log(`\n全部 ${count} 个逻辑测试通过`);
