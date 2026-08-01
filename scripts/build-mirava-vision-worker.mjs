import { build } from "esbuild"

await build({
  entryPoints: ["src/components/studio/mirava-vision.worker.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  outfile: "public/visual-engine/vision/mirava-vision.worker.js",
})
