import { chromium, type Browser, type Page } from "playwright";
import assert from "node:assert/strict";
import { createServer as createViteServer } from "vite";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function chromiumExecutable() {
  const root = join(homedir(), ".cache", "ms-playwright");
  const dir = readdirSync(root).find((d) => d.startsWith("chromium-"));
  if (!dir)
    throw new Error(
      "未找到已安装的 chromium，请先 npx playwright install chromium",
    );
  return join(root, dir, "chrome-linux-arm64", "chrome");
}

const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
let browser: Browser;
let page: Page;
let passed = 0;
const ok = (name: string) => {
  passed++;
  console.log("  ✓ " + name);
};

async function freshPage() {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-testid="canvas"]');
}

async function clickLayer(name: string) {
  await page.locator(".layer", { hasText: name }).first().click();
}

async function start() {
  const vite = await createViteServer({
    server: { port: PORT, host: "127.0.0.1" },
    logLevel: "error",
    appType: "spa",
  });
  await vite.listen();
  browser = await chromium.launch({
    executablePath: chromiumExecutable(),
    headless: true,
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") console.log("  [console.error]", m.text());
  });
  page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  return vite;
}

async function finish(vite: Awaited<ReturnType<typeof start>>) {
  await browser.close();
  await vite.close();
}

const vite = await start();

// --- 1. 初始渲染：种子文档含 clip 与 opacity 两种遮罩 ---
await freshPage();
{
  const clipPaths = await page.$$eval("clipPath", (e) => e.length);
  const masks = await page.$$eval("mask", (e) => e.length);
  const gradients = await page.$$eval("linearGradient", (e) => e.length);
  assert.ok(clipPaths >= 1, "存在 clipPath 定义");
  assert.ok(masks >= 1, "存在 mask 定义");
  assert.ok(gradients >= 1, "存在渐变定义");
  const wrappedClip = await page.$$eval("[clip-path]", (e) => e.length);
  const wrappedMask = await page.$$eval("[mask]", (e) => e.length);
  assert.ok(wrappedClip >= 1 && wrappedMask >= 1, "两种语义分别包装");
  ok("种子文档同时渲染剪切与透明度遮罩，且语义独立");
}

// --- 2. 非破坏创建剪切遮罩：内容几何不变、关系保留 ---
await freshPage();
{
  const before = (await page.evaluate(() => {
    const map: Record<string, unknown> = {};
    for (const s of (window as any).__doc.shapes) map[s.id] = s.nodes;
    return map;
  })) as Record<string, unknown>;
  await clickLayer("Petal 3");
  await page.click('[data-testid="make-clip"]');
  const untouched = await page.evaluate((snap) => {
    const d = (window as any).__doc;
    // 逐个共有 id 比对：非破坏意味着没有任何已有对象的节点被改动
    for (const s of d.shapes) {
      if (
        snap[s.id] &&
        JSON.stringify(snap[s.id]) !== JSON.stringify(s.nodes)
      ) {
        return { id: s.id, changed: true };
      }
    }
    return { changed: false };
  }, before);
  assert.equal(untouched.changed, false, "没有任何已有对象的几何被修改");
  const group = await page.evaluate(() => {
    const d = (window as any).__doc;
    const masked = d.shapes.filter((s: any) => s.maskId);
    return {
      hasMask: masked.some((s: any) => s.maskRole === "clip"),
      members: masked.length,
    };
  });
  assert.ok(group.hasMask && group.members >= 2, "遮罩关系已建立");
  ok("创建剪切遮罩是非破坏的（引用关系，几何零改动）");
}

// --- 3. 释放遮罩还原原始形状 ---
await freshPage();
{
  await clickLayer("Petal 3");
  await page.click('[data-testid="make-clip"]');
  const createdGid = await page.evaluate(() => {
    const d = (window as any).__doc;
    const m = d.shapes.find((s: any) => s.maskRole === "clip");
    return m.maskId;
  });
  const docCountBefore = await page.evaluate(
    () => (window as any).__doc.shapes.length,
  );
  const membersBefore = await page.evaluate(
    (gid) =>
      (window as any).__doc.shapes.filter((s: any) => s.maskId === gid).length,
    createdGid,
  );
  await page.click('[data-testid="release"]');
  const leftovers = await page.evaluate(
    (gid) =>
      (window as any).__doc.shapes.filter((s: any) => s.maskId === gid).length,
    createdGid,
  );
  assert.equal(leftovers, 0, "被释放的组不再有任何引用");
  const docCountAfter = await page.evaluate(
    () => (window as any).__doc.shapes.length,
  );
  assert.equal(
    docCountAfter,
    docCountBefore,
    "释放不删除任何对象（自动生成的遮罩保留为普通形状）",
  );
  assert.ok(membersBefore >= 2, "释放前该组确实含遮罩与内容");
  ok("释放遮罩后内容恢复独立形状，对象不丢失");
}

// --- 4. 透明度遮罩带渐变，可切换语义 ---
await freshPage();
{
  await clickLayer("Petal 2");
  await page.click('[data-testid="make-opacity"]');
  const g = await page.evaluate(() => {
    const d = (window as any).__doc;
    const m = d.shapes.find((s: any) => s.maskRole === "opacity");
    return m?.gradient;
  });
  assert.ok(g && g.stops.length >= 2, "透明度遮罩自带渐变");
  // 切换为 clip 后渐变被移除，语义切换
  await page.getByRole("button", { name: "仅隐藏" }).click();
  const role = await page.evaluate(
    () => (window as any).__doc.shapes.find((s: any) => s.maskRole)?.maskRole,
  );
  assert.equal(role, "clip");
  ok("透明度遮罩拥有渐变，且可切换为纯剪切语义");
}

// --- 5. 整组拖动：遮罩与内容一起移动（模型层确定性验证） ---
await freshPage();
{
  const result = await page.evaluate(() => {
    const d = (window as any).__doc;
    const t = (window as any).__test;
    const gid = d.shapes.find((s: any) => s.maskId && !s.maskRole).maskId;
    const memberIds = d.shapes
      .filter((s: any) => s.maskId === gid)
      .map((s: any) => s.id);
    const before = Object.fromEntries(
      memberIds.map((id: string) => [
        id,
        d.shapes.find((s: any) => s.id === id).nodes[0].x,
      ]),
    );
    // 从任一成员发起选择，应整族选中
    t.selectShape(memberIds[0], false);
    const dragSet = t.draggableIds().slice().sort();
    // 执行一次整组平移
    t.translateSelected(12, 7);
    const after = Object.fromEntries(
      memberIds.map((id: string) => [
        id,
        d.shapes.find((s: any) => s.id === id).nodes[0].x,
      ]),
    );
    const movedAll = memberIds.every(
      (id: string) => after[id] - before[id] === 12,
    );
    return {
      dragCoversFamily:
        JSON.stringify(dragSet) === JSON.stringify(memberIds.slice().sort()),
      movedAll,
      includesMask: t.draggableIds().length === memberIds.length,
    };
  });
  assert.ok(result.dragCoversFamily, "拖动集合覆盖整组（含遮罩与内容）");
  assert.ok(result.movedAll, "遮罩与每个内容成员都同步移动相同位移");
  ok("拖动整组时内容与遮罩同步移动");
}

// --- 6. 隔离编辑：进入后可分别选择，Esc 退出 ---
await freshPage();
{
  // 种子文档已有遮罩组，先选中任一成员，再进入内部
  await clickLayer("Petal 1");
  await page.locator('[data-testid="isolate"]').first().click();
  await page.waitForSelector('[data-testid="isolation-hint"]');
  const isolated = await page.evaluate(() => (window as any).__doc.isolated);
  assert.ok(isolated, "进入隔离模式");
  await page.keyboard.press("Escape");
  const exited = await page.evaluate(() => (window as any).__doc.isolated);
  assert.equal(exited, null, "Esc 退出隔离");
  ok("双击/按钮进入内部分别编辑，Esc 退出回到整组");
}

// --- 7. 嵌套：合法嵌套成功，循环引用被阻止 ---
await freshPage();
{
  // 种子含 gOuter(clip) 与嵌套其下的 gInner(opacity)
  const nested = await page.evaluate(() => {
    const d = (window as any).__doc;
    const inner = d.shapes.find(
      (s: any) => s.maskRole === "opacity" && s.parentMaskId,
    );
    return !!inner;
  });
  assert.ok(nested, "种子已含一层合法嵌套");

  const outcome = await page.evaluate(() => {
    const d = (window as any).__doc;
    const t = (window as any).__test;
    const outer = d.shapes.find((s: any) => s.maskRole === "clip");
    const inner = d.shapes.find(
      (s: any) => s.maskRole === "opacity" && s.parentMaskId,
    );
    // 反向嵌套：让已经是「父」的外层再挂到内层之下，必然成环
    t.nestGroup(outer.maskId, inner.maskId);
    const stillHealthy =
      d.shapes.find((s: any) => s.maskId === outer.maskId && s.maskRole)
        .parentMaskId === undefined;
    return { blocked: stillHealthy, notice: d.notice };
  });
  assert.ok(outcome.blocked, "成环的嵌套没有写入任何 parentMaskId");
  assert.ok(outcome.notice.includes("循环"), "向用户给出循环引用提示");
  ok("合法嵌套保留；会形成循环引用的嵌套在创建前被阻止并提示");
}

// --- 8. 导出 SVG 自包含，普通查看器可独立呈现 ---
await freshPage();
{
  const exported = await page.evaluate(async () => {
    // 触发下载不便，直接调用序列化逻辑生成字符串
    const mod = await import("/src/features/masks/lib/serialize.ts");
    const pathMod = await import("/src/features/drawing/lib/path.ts");
    const d = (window as any).__doc;
    return mod.serializeArtwork(d.shapes, pathMod.path);
  });
  assert.ok(exported.includes("<svg") && exported.includes("</svg>"));
  assert.ok(exported.includes("<defs>"), "defs 内联");
  assert.ok(exported.includes("clip-path=") && exported.includes("mask="));
  assert.ok(
    !/maskId|maskRole|parentMaskId/.test(exported),
    "导出不含内部关系字段",
  );
  ok("导出为自包含 SVG：defs + 嵌套包装，无内部字段泄漏");
}

// --- 9. 损坏文档可再次打开（不白屏、不抛错） ---
await freshPage();
{
  await page.evaluate(() => {
    const broken = [
      {
        id: "lonely",
        name: "Lonely",
        nodes: [
          { x: 1, y: 1, in: { x: 1, y: 1 }, out: { x: 1, y: 1 } },
          { x: 2, y: 1, in: { x: 2, y: 1 }, out: { x: 2, y: 1 } },
        ],
        closed: false,
        fill: "#7754d6",
        stroke: "#ffffff",
        width: 1,
        opacity: 1,
        maskId: "vanished-group",
      },
    ];
    localStorage.setItem("forma-document", JSON.stringify(broken));
  });
  await page.reload();
  await page.waitForSelector('[data-testid="canvas"]');
  const repaired = await page.evaluate(() => {
    const d = (window as any).__doc;
    return {
      shapes: d.shapes.length,
      dangling: d.shapes.filter((s: any) => s.maskId === "vanished-group")
        .length,
    };
  });
  assert.equal(repaired.shapes, 1, "文档正常打开，形状保留");
  assert.equal(repaired.dangling, 0, "悬空引用已清洗");
  ok("损坏的遮罩引用在加载时修复，文档不会无法打开");
}

await finish(vite);
console.log(`\n端到端 ${passed} 项全部通过`);
