import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const openNextDir = path.join(rootDir, ".open-next");
const outPagesDir = path.join(rootDir, "out-pages");

console.log("=== Preparing Cloudflare Pages deployment ===");

// 1. Prepare out-pages directory (keep old assets to prevent cache 404s)
if (!fs.existsSync(outPagesDir)) {
  fs.mkdirSync(outPagesDir, { recursive: true });
}

// 2. Copy static assets
console.log("Copying assets...");
const assetsDir = path.join(openNextDir, "assets");
if (fs.existsSync(assetsDir)) {
  copyRecursiveSync(assetsDir, outPagesDir);
}

// 3. Copy other required server directories
console.log("Copying server-side build artifacts...");
const dirsToCopy = [".build", "cloudflare", "middleware", "server-functions"];
for (const dir of dirsToCopy) {
  const src = path.join(openNextDir, dir);
  const dest = path.join(outPagesDir, dir);
  if (fs.existsSync(src)) {
    copyRecursiveSync(src, dest);
  }
}

// 4. Modify worker.js to support env.ASSETS.fetch for static files
console.log("Modifying worker.js for Pages environment...");
const workerSrcPath = path.join(openNextDir, "worker.js");
const workerDestPath = path.join(outPagesDir, "_worker.js");

if (fs.existsSync(workerSrcPath)) {
  let content = fs.readFileSync(workerSrcPath, "utf8");

  // Inject static assets fallback at the beginning of the fetch function
  const targetCode = "const url = new URL(request.url);";
  const injection = `const url = new URL(request.url);
            // Serve static assets first from Pages CDN
            if (
              url.pathname.startsWith("/_next/static/") ||
              url.pathname.match(/\\.(ico|png|jpg|jpeg|gif|svg|css|js|txt|html|json)$/)
            ) {
                return env.ASSETS.fetch(request);
            }`;
  
  if (content.includes(targetCode)) {
    content = content.replace(targetCode, injection);
  } else {
    // Fallback injection if code style changes slightly
    content = content.replace("async fetch(request, env, ctx) {", `async fetch(request, env, ctx) {
            // Serve static assets first from Pages CDN
            if (
              request.url.includes("/_next/static/") ||
              new URL(request.url).pathname.match(/\\.(ico|png|jpg|jpeg|gif|svg|css|js|txt|html|json)$/)
            ) {
                return env.ASSETS.fetch(request);
            }
    `);
  }

  fs.writeFileSync(workerDestPath, content, "utf8");
} else {
  console.error("Error: .open-next/worker.js not found!");
  process.exit(1);
}

// Helper: recursive copy
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("Assets and _worker.js prepared successfully.");

// 5. Deploy using wrangler
if (process.argv.includes("--no-deploy")) {
  console.log("=== Build preparation complete (deploy skipped) ===");
  process.exit(0);
}

console.log("Deploying to Cloudflare Pages...");
try {
  execSync(
    "npx wrangler pages deploy out-pages --project-name church-serve --branch main --commit-dirty=true",
    { stdio: "inherit" }
  );
  console.log("=== Deployment successful! ===");
} catch (error) {
  console.error("Wrangler deployment failed:", error.message);
  process.exit(1);
}
