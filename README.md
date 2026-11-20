# Vectora 矢量路径工具

安装：Node.js 22 环境下执行 `npm ci`。

本地启动：`npm run dev`，打开终端显示的地址。

Docker 启动：`docker compose up --build`，访问 http://localhost:8119。

## 非破坏式遮罩系统

所有遮罩都以**引用关系**保存在文档里（`maskId` / `maskRole` / `parentMaskId` /
`gradient`），不会改动被遮内容的任何节点几何。

- **剪切遮罩（clip）**：只隐藏边界外的内容，不改变 alpha。导出为 SVG `clipPath`。
- **透明度遮罩（opacity）**：按遮罩明度真正改变内容透明度，支持线性渐变
  （白=不透明、黑=透明）。导出为 SVG `mask` + `linearGradient`。
- 两种语义始终独立建模、逐层包装，嵌套时不会被合并成单一裁边。
- 内容保留各自的层级与选择入口；普通模式整族选中、一起拖动；双击遮罩或点
  「进入内部」进入隔离编辑，可分别调整遮罩节点、渐变与内容，`Esc` 退出。
- 释放遮罩只解除引用，内容立即恢复原始形状。
- 嵌套前做环检测，会形成循环引用的操作直接阻止并提示；加载时再用
  `repairReferences` 清洗悬空引用与损坏的环，保证文档始终可以再次打开。
- 画布与导出共用同一棵渲染树（`src/features/masks/lib/tree.ts`），导出的
  自包含 SVG 在普通查看器中呈现相同结果，且不含任何内部关系字段。

## 测试

- `npm run typecheck`：TypeScript / Vue 类型检查。
- `npm run test:logic`：遮罩关系、环检测、损坏修复、渲染树与序列化的 14 项逻辑断言。
- `npm run test:e2e`：Playwright 端到端（先 `npx playwright install chromium`）。
