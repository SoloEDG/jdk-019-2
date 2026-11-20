#!/usr/bin/env bash
# 运行 Playwright 端到端测试。
# 沙箱/无 root 环境下，Chromium 的系统依赖可能被解包到用户目录，
# 通过 LD_LIBRARY_PATH 注入；正常环境中该目录不存在则自动跳过。
set -euo pipefail

EXTRA_LIBS=""
for d in /tmp/chromelibs/usr/lib/aarch64-linux-gnu /tmp/chromelibs/lib/aarch64-linux-gnu; do
  if [ -d "$d" ]; then
    EXTRA_LIBS="${EXTRA_LIBS:+$EXTRA_LIBS:}$d"
  fi
done

if [ -n "$EXTRA_LIBS" ]; then
  export LD_LIBRARY_PATH="${EXTRA_LIBS}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

exec node --experimental-strip-types test/e2e.test.ts
