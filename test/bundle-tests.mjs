import { build } from "esbuild";

await build({
  entryPoints: ["test/logic.test.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "test/.tmp/logic.test.mjs",
  logLevel: "silent",
  plugins: [
    {
      name: "stub-vue",
      setup(b) {
        b.onResolve({ filter: /\.vue$/ }, (args) => ({
          path: args.path,
          namespace: "vue-stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "vue-stub" }, () => ({
          contents: "export default {};",
          loader: "js",
        }));
      },
    },
  ],
});
