import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const svgPath = join(projectRoot, "dashboard/public/logo.svg");
const buildDir = join(projectRoot, "build");

mkdirSync(buildDir, { recursive: true });

const { Resvg } = await import("@resvg/resvg-js");
const svgData = readFileSync(svgPath, "utf8");

for (const size of [16, 32, 48, 64, 128, 256, 512, 1024]) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  const png = resvg.render().asPng();
  writeFileSync(join(buildDir, `icon-${size}.png`), png);
  if (size === 1024) {
    writeFileSync(join(buildDir, "icon.png"), png);
  }
}

console.log("Generated electron icons in build/");
