import type { Shape } from "../../../shared/types";

export function byId(shapes: Shape[], id: string | undefined) {
  return shapes.find((s) => s.id === id);
}

/** 该遮罩组的遮罩形状（一个组最多一个遮罩） */
export function masksOf(shapes: Shape[], maskId: string) {
  return shapes.filter((s) => s.maskId === maskId && s.maskRole);
}

/** 该遮罩组的内容形状（保留独立层级与选择入口） */
export function contentsOf(shapes: Shape[], maskId: string) {
  return shapes.filter((s) => s.maskId === maskId && !s.maskRole);
}

/** 一个形状所属遮罩组的全部成员（用于整组选择/拖动） */
export function familyIds(shapes: Shape[], id: string): string[] {
  const s = byId(shapes, id);
  if (!s?.maskId) return [id];
  return shapes.filter((x) => x.maskId === s.maskId).map((x) => x.id);
}

/** 沿嵌套关系向外的遮罩组链（外 → 内），用于循环检测与嵌套包装 */
export function chainOf(shapes: Shape[], maskId: string): string[] {
  const chain: string[] = [];
  let current: string | undefined = maskId;
  const guard = new Set<string>();
  while (current && !guard.has(current)) {
    guard.add(current);
    chain.push(current);
    const mask: Shape | undefined = masksOf(shapes, current)[0];
    current = mask?.parentMaskId;
  }
  return chain;
}

/** 若把 maskId 挂到 parentMaskId 之下是否会产生循环（含自引用） */
export function wouldCycle(
  shapes: Shape[],
  maskId: string,
  parentMaskId: string | undefined,
): boolean {
  if (!parentMaskId) return false;
  if (parentMaskId === maskId) return true;
  return chainOf(shapes, parentMaskId).includes(maskId);
}

/**
 * 加载时清洗：修复悬空引用与损坏的循环引用，保证文档始终可以再次打开。
 * 规则：
 *  - 遮罩 id 不存在 → 清除引用（内容恢复为普通形状，绝不丢几何）
 *  - 组内没有遮罩 → 所有成员的 maskId 引用作废
 *  - 遮罩嵌套出现环 → 断开最内层一环
 *  - 同一组出现多个遮罩 → 保留第一个，其余降级为普通内容
 */
export function repairReferences(shapes: Shape[]): string[] {
  const problems: string[] = [];

  // 两遍法：先收集所有出现过的组 id，再逐组修复，
  // 避免成员在其它组的处理过程中被提前改写而漏修。
  const groupIds = [
    ...new Set(shapes.map((s) => s.maskId).filter((v): v is string => !!v)),
  ];

  for (const gid of groupIds) {
    const masks = masksOf(shapes, gid);
    if (!masks.length) {
      // 组内已无遮罩（遮罩被删但内容仍引用该组）：解除全部引用
      problems.push(`group ${gid} lost its mask, links dropped`);
      shapes
        .filter((s) => s.maskId === gid)
        .forEach((s) => {
          s.maskId = undefined;
          s.parentMaskId = undefined;
        });
      continue;
    }
    // 同一组出现多个遮罩：保留第一个，其余完全移出组（几何保留）
    masks.slice(1).forEach((extra) => {
      problems.push(`duplicate mask ${extra.id} demoted to content`);
      extra.maskRole = undefined;
      extra.maskId = undefined;
      extra.parentMaskId = undefined;
    });
  }

  // 嵌套父组不存在（悬空的 parentMaskId）或形成环：断开该嵌套关系
  const liveGroups = new Set(groupIds);
  for (const s of shapes) {
    if (s.maskRole && s.parentMaskId && !liveGroups.has(s.parentMaskId)) {
      problems.push(`dangling parent mask on ${s.id}, unlinked`);
      s.parentMaskId = undefined;
    }
  }

  const seen = new Set<string>();
  const visit = (gid: string, stack: string[]) => {
    if (stack.includes(gid)) {
      const mask = masksOf(shapes, gid)[0];
      if (mask) {
        problems.push(`cyclic mask nesting at ${gid}, link broken`);
        mask.parentMaskId = undefined;
      }
      return;
    }
    if (seen.has(gid)) return;
    seen.add(gid);
    const mask = masksOf(shapes, gid)[0];
    if (mask?.parentMaskId) visit(mask.parentMaskId, [...stack, gid]);
  };
  groupIds.forEach((gid) => visit(gid, []));

  return problems;
}
