// vite.config.ts
import { jsxLocPlugin } from "file:///D:/chainslay-site/node_modules/.pnpm/@builder.io+vite-plugin-jsx_507101ee9b64682fd78090cd22bab3b3/node_modules/@builder.io/vite-plugin-jsx-loc/dist/index.js";
import tailwindcss from "file:///D:/chainslay-site/node_modules/.pnpm/@tailwindcss+vite@4.1.14_vi_3d2b98f0499fab07e5541e1c1096adf0/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///D:/chainslay-site/node_modules/.pnpm/@vitejs+plugin-react@5.0.4__94d75084908fd62ac71fe531774e4fe9/node_modules/@vitejs/plugin-react/dist/index.js";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "file:///D:/chainslay-site/node_modules/.pnpm/vite@7.1.9_@types+node@24.7_61597552e415200265e44ff54b51c03e/node_modules/vite/dist/node/index.js";
import { vitePluginManusRuntime } from "file:///D:/chainslay-site/node_modules/.pnpm/vite-plugin-manus-runtime@0.0.58/node_modules/vite-plugin-manus-runtime/dist/index.js";
var __vite_injected_original_dirname = "D:\\chainslay-site";
var PROJECT_ROOT = __vite_injected_original_dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
function vitePluginStorageProxy() {
  return {
    name: "manus-storage-proxy",
    configureServer(server) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }
        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }
        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);
          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` }
          });
          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }
          const { url } = await forgeResp.json();
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }
          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "client", "src"),
      "@shared": path.resolve(__vite_injected_original_dirname, "shared"),
      "@assets": path.resolve(__vite_injected_original_dirname, "attached_assets")
    }
  },
  envDir: path.resolve(__vite_injected_original_dirname),
  root: path.resolve(__vite_injected_original_dirname, "client"),
  build: {
    outDir: path.resolve(__vite_injected_original_dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    port: 3e3,
    strictPort: false,
    // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxjaGFpbnNsYXktc2l0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcY2hhaW5zbGF5LXNpdGVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L2NoYWluc2xheS1zaXRlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsganN4TG9jUGx1Z2luIH0gZnJvbSBcIkBidWlsZGVyLmlvL3ZpdGUtcGx1Z2luLWpzeC1sb2NcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBmcyBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0eXBlIFBsdWdpbiwgdHlwZSBWaXRlRGV2U2VydmVyIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IHZpdGVQbHVnaW5NYW51c1J1bnRpbWUgfSBmcm9tIFwidml0ZS1wbHVnaW4tbWFudXMtcnVudGltZVwiO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTWFudXMgRGVidWcgQ29sbGVjdG9yIC0gVml0ZSBQbHVnaW5cbi8vIFdyaXRlcyBicm93c2VyIGxvZ3MgZGlyZWN0bHkgdG8gZmlsZXMsIHRyaW1tZWQgd2hlbiBleGNlZWRpbmcgc2l6ZSBsaW1pdFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgUFJPSkVDVF9ST09UID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcbmNvbnN0IExPR19ESVIgPSBwYXRoLmpvaW4oUFJPSkVDVF9ST09ULCBcIi5tYW51cy1sb2dzXCIpO1xuY29uc3QgTUFYX0xPR19TSVpFX0JZVEVTID0gMSAqIDEwMjQgKiAxMDI0OyAvLyAxTUIgcGVyIGxvZyBmaWxlXG5jb25zdCBUUklNX1RBUkdFVF9CWVRFUyA9IE1hdGguZmxvb3IoTUFYX0xPR19TSVpFX0JZVEVTICogMC42KTsgLy8gVHJpbSB0byA2MCUgdG8gYXZvaWQgY29uc3RhbnQgcmUtdHJpbW1pbmdcblxudHlwZSBMb2dTb3VyY2UgPSBcImJyb3dzZXJDb25zb2xlXCIgfCBcIm5ldHdvcmtSZXF1ZXN0c1wiIHwgXCJzZXNzaW9uUmVwbGF5XCI7XG5cbmZ1bmN0aW9uIGVuc3VyZUxvZ0RpcigpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKExPR19ESVIpKSB7XG4gICAgZnMubWtkaXJTeW5jKExPR19ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyaW1Mb2dGaWxlKGxvZ1BhdGg6IHN0cmluZywgbWF4U2l6ZTogbnVtYmVyKSB7XG4gIHRyeSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZ1BhdGgpIHx8IGZzLnN0YXRTeW5jKGxvZ1BhdGgpLnNpemUgPD0gbWF4U2l6ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxpbmVzID0gZnMucmVhZEZpbGVTeW5jKGxvZ1BhdGgsIFwidXRmLThcIikuc3BsaXQoXCJcXG5cIik7XG4gICAgY29uc3Qga2VwdExpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBrZXB0Qnl0ZXMgPSAwO1xuXG4gICAgLy8gS2VlcCBuZXdlc3QgbGluZXMgKGZyb20gZW5kKSB0aGF0IGZpdCB3aXRoaW4gNjAlIG9mIG1heFNpemVcbiAgICBjb25zdCB0YXJnZXRTaXplID0gVFJJTV9UQVJHRVRfQllURVM7XG4gICAgZm9yIChsZXQgaSA9IGxpbmVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBjb25zdCBsaW5lQnl0ZXMgPSBCdWZmZXIuYnl0ZUxlbmd0aChgJHtsaW5lc1tpXX1cXG5gLCBcInV0Zi04XCIpO1xuICAgICAgaWYgKGtlcHRCeXRlcyArIGxpbmVCeXRlcyA+IHRhcmdldFNpemUpIGJyZWFrO1xuICAgICAga2VwdExpbmVzLnVuc2hpZnQobGluZXNbaV0pO1xuICAgICAga2VwdEJ5dGVzICs9IGxpbmVCeXRlcztcbiAgICB9XG5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGxvZ1BhdGgsIGtlcHRMaW5lcy5qb2luKFwiXFxuXCIpLCBcInV0Zi04XCIpO1xuICB9IGNhdGNoIHtcbiAgICAvKiBpZ25vcmUgdHJpbSBlcnJvcnMgKi9cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRvTG9nRmlsZShzb3VyY2U6IExvZ1NvdXJjZSwgZW50cmllczogdW5rbm93bltdKSB7XG4gIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIGVuc3VyZUxvZ0RpcigpO1xuICBjb25zdCBsb2dQYXRoID0gcGF0aC5qb2luKExPR19ESVIsIGAke3NvdXJjZX0ubG9nYCk7XG5cbiAgLy8gRm9ybWF0IGVudHJpZXMgd2l0aCB0aW1lc3RhbXBzXG4gIGNvbnN0IGxpbmVzID0gZW50cmllcy5tYXAoKGVudHJ5KSA9PiB7XG4gICAgY29uc3QgdHMgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgcmV0dXJuIGBbJHt0c31dICR7SlNPTi5zdHJpbmdpZnkoZW50cnkpfWA7XG4gIH0pO1xuXG4gIC8vIEFwcGVuZCB0byBsb2cgZmlsZVxuICBmcy5hcHBlbmRGaWxlU3luYyhsb2dQYXRoLCBgJHtsaW5lcy5qb2luKFwiXFxuXCIpfVxcbmAsIFwidXRmLThcIik7XG5cbiAgLy8gVHJpbSBpZiBleGNlZWRzIG1heCBzaXplXG4gIHRyaW1Mb2dGaWxlKGxvZ1BhdGgsIE1BWF9MT0dfU0laRV9CWVRFUyk7XG59XG5cbi8qKlxuICogVml0ZSBwbHVnaW4gdG8gY29sbGVjdCBicm93c2VyIGRlYnVnIGxvZ3NcbiAqIC0gUE9TVCAvX19tYW51c19fL2xvZ3M6IEJyb3dzZXIgc2VuZHMgbG9ncywgd3JpdHRlbiBkaXJlY3RseSB0byBmaWxlc1xuICogLSBGaWxlczogYnJvd3NlckNvbnNvbGUubG9nLCBuZXR3b3JrUmVxdWVzdHMubG9nLCBzZXNzaW9uUmVwbGF5LmxvZ1xuICogLSBBdXRvLXRyaW1tZWQgd2hlbiBleGNlZWRpbmcgMU1CIChrZWVwcyBuZXdlc3QgZW50cmllcylcbiAqL1xuZnVuY3Rpb24gdml0ZVBsdWdpbk1hbnVzRGVidWdDb2xsZWN0b3IoKTogUGx1Z2luIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcIm1hbnVzLWRlYnVnLWNvbGxlY3RvclwiLFxuXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJwcm9kdWN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBodG1sLFxuICAgICAgICB0YWdzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGFnOiBcInNjcmlwdFwiLFxuICAgICAgICAgICAgYXR0cnM6IHtcbiAgICAgICAgICAgICAgc3JjOiBcIi9fX21hbnVzX18vZGVidWctY29sbGVjdG9yLmpzXCIsXG4gICAgICAgICAgICAgIGRlZmVyOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluamVjdFRvOiBcImhlYWRcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogVml0ZURldlNlcnZlcikge1xuICAgICAgLy8gUE9TVCAvX19tYW51c19fL2xvZ3M6IEJyb3dzZXIgc2VuZHMgbG9ncyAod3JpdHRlbiBkaXJlY3RseSB0byBmaWxlcylcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvX19tYW51c19fL2xvZ3NcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYW5kbGVQYXlsb2FkID0gKHBheWxvYWQ6IGFueSkgPT4ge1xuICAgICAgICAgIC8vIFdyaXRlIGxvZ3MgZGlyZWN0bHkgdG8gZmlsZXNcbiAgICAgICAgICBpZiAocGF5bG9hZC5jb25zb2xlTG9ncz8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgd3JpdGVUb0xvZ0ZpbGUoXCJicm93c2VyQ29uc29sZVwiLCBwYXlsb2FkLmNvbnNvbGVMb2dzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBheWxvYWQubmV0d29ya1JlcXVlc3RzPy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3cml0ZVRvTG9nRmlsZShcIm5ldHdvcmtSZXF1ZXN0c1wiLCBwYXlsb2FkLm5ldHdvcmtSZXF1ZXN0cyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwYXlsb2FkLnNlc3Npb25FdmVudHM/Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHdyaXRlVG9Mb2dGaWxlKFwic2Vzc2lvblJlcGxheVwiLCBwYXlsb2FkLnNlc3Npb25FdmVudHMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0pO1xuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZXFCb2R5ID0gKHJlcSBhcyB7IGJvZHk/OiB1bmtub3duIH0pLmJvZHk7XG4gICAgICAgIGlmIChyZXFCb2R5ICYmIHR5cGVvZiByZXFCb2R5ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGhhbmRsZVBheWxvYWQocmVxQm9keSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYm9keSA9IFwiXCI7XG4gICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgYm9keSArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgIGhhbmRsZVBheWxvYWQocGF5bG9hZCk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiB2aXRlUGx1Z2luU3RvcmFnZVByb3h5KCk6IFBsdWdpbiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJtYW51cy1zdG9yYWdlLXByb3h5XCIsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogVml0ZURldlNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9tYW51cy1zdG9yYWdlXCIsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSByZXEudXJsPy5yZXBsYWNlKC9eXFwvLywgXCJcIik7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgXCJDb250ZW50LVR5cGVcIjogXCJ0ZXh0L3BsYWluXCIgfSk7XG4gICAgICAgICAgcmVzLmVuZChcIk1pc3Npbmcgc3RvcmFnZSBrZXlcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9yZ2VCYXNlVXJsID0gKHByb2Nlc3MuZW52LkJVSUxUX0lOX0ZPUkdFX0FQSV9VUkwgfHwgXCJcIikucmVwbGFjZSgvXFwvKyQvLCBcIlwiKTtcbiAgICAgICAgY29uc3QgZm9yZ2VLZXkgPSBwcm9jZXNzLmVudi5CVUlMVF9JTl9GT1JHRV9BUElfS0VZO1xuXG4gICAgICAgIGlmICghZm9yZ2VCYXNlVXJsIHx8ICFmb3JnZUtleSkge1xuICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7IFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9wbGFpblwiIH0pO1xuICAgICAgICAgIHJlcy5lbmQoXCJTdG9yYWdlIHByb3h5IG5vdCBjb25maWd1cmVkXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgZm9yZ2VVcmwgPSBuZXcgVVJMKFwidjEvc3RvcmFnZS9wcmVzaWduL2dldFwiLCBmb3JnZUJhc2VVcmwgKyBcIi9cIik7XG4gICAgICAgICAgZm9yZ2VVcmwuc2VhcmNoUGFyYW1zLnNldChcInBhdGhcIiwga2V5KTtcblxuICAgICAgICAgIGNvbnN0IGZvcmdlUmVzcCA9IGF3YWl0IGZldGNoKGZvcmdlVXJsLCB7XG4gICAgICAgICAgICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtmb3JnZUtleX1gIH0sXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIWZvcmdlUmVzcC5vaykge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDIsIHsgXCJDb250ZW50LVR5cGVcIjogXCJ0ZXh0L3BsYWluXCIgfSk7XG4gICAgICAgICAgICByZXMuZW5kKFwiU3RvcmFnZSBiYWNrZW5kIGVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHsgdXJsIH0gPSAoYXdhaXQgZm9yZ2VSZXNwLmpzb24oKSkgYXMgeyB1cmw6IHN0cmluZyB9O1xuICAgICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMiwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9KTtcbiAgICAgICAgICAgIHJlcy5lbmQoXCJFbXB0eSBzaWduZWQgVVJMXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlcy53cml0ZUhlYWQoMzA3LCB7IExvY2F0aW9uOiB1cmwsIFwiQ2FjaGUtQ29udHJvbFwiOiBcIm5vLXN0b3JlXCIgfSk7XG4gICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMiwgeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvcGxhaW5cIiB9KTtcbiAgICAgICAgICByZXMuZW5kKFwiU3RvcmFnZSBwcm94eSBlcnJvclwiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcbiAgfTtcbn1cblxuY29uc3QgcGx1Z2lucyA9IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpLCBqc3hMb2NQbHVnaW4oKSwgdml0ZVBsdWdpbk1hbnVzUnVudGltZSgpLCB2aXRlUGx1Z2luTWFudXNEZWJ1Z0NvbGxlY3RvcigpLCB2aXRlUGx1Z2luU3RvcmFnZVByb3h5KCldO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoaW1wb3J0Lm1ldGEuZGlybmFtZSwgXCJjbGllbnRcIiwgXCJzcmNcIiksXG4gICAgICBcIkBzaGFyZWRcIjogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsIFwic2hhcmVkXCIpLFxuICAgICAgXCJAYXNzZXRzXCI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcImF0dGFjaGVkX2Fzc2V0c1wiKSxcbiAgICB9LFxuICB9LFxuICBlbnZEaXI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lKSxcbiAgcm9vdDogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsIFwiY2xpZW50XCIpLFxuICBidWlsZDoge1xuICAgIG91dERpcjogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsIFwiZGlzdC9wdWJsaWNcIiksXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsIC8vIFdpbGwgZmluZCBuZXh0IGF2YWlsYWJsZSBwb3J0IGlmIDMwMDAgaXMgYnVzeVxuICAgIGhvc3Q6IHRydWUsXG4gICAgYWxsb3dlZEhvc3RzOiBbXG4gICAgICBcIi5tYW51c3ByZS5jb21wdXRlclwiLFxuICAgICAgXCIubWFudXMuY29tcHV0ZXJcIixcbiAgICAgIFwiLm1hbnVzLWFzaWEuY29tcHV0ZXJcIixcbiAgICAgIFwiLm1hbnVzY29tcHV0ZXIuYWlcIixcbiAgICAgIFwiLm1hbnVzdm0uY29tcHV0ZXJcIixcbiAgICAgIFwibG9jYWxob3N0XCIsXG4gICAgICBcIjEyNy4wLjAuMVwiLFxuICAgIF0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gICAgZnM6IHtcbiAgICAgIHN0cmljdDogdHJ1ZSxcbiAgICAgIGRlbnk6IFtcIioqLy4qXCJdLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU8sU0FBUyxvQkFBb0I7QUFDdFEsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLG9CQUFxRDtBQUM5RCxTQUFTLDhCQUE4QjtBQU52QyxJQUFNLG1DQUFtQztBQWF6QyxJQUFNLGVBQWU7QUFDckIsSUFBTSxVQUFVLEtBQUssS0FBSyxjQUFjLGFBQWE7QUFDckQsSUFBTSxxQkFBcUIsSUFBSSxPQUFPO0FBQ3RDLElBQU0sb0JBQW9CLEtBQUssTUFBTSxxQkFBcUIsR0FBRztBQUk3RCxTQUFTLGVBQWU7QUFDdEIsTUFBSSxDQUFDLEdBQUcsV0FBVyxPQUFPLEdBQUc7QUFDM0IsT0FBRyxVQUFVLFNBQVMsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLEVBQzNDO0FBQ0Y7QUFFQSxTQUFTLFlBQVksU0FBaUIsU0FBaUI7QUFDckQsTUFBSTtBQUNGLFFBQUksQ0FBQyxHQUFHLFdBQVcsT0FBTyxLQUFLLEdBQUcsU0FBUyxPQUFPLEVBQUUsUUFBUSxTQUFTO0FBQ25FO0FBQUEsSUFDRjtBQUVBLFVBQU0sUUFBUSxHQUFHLGFBQWEsU0FBUyxPQUFPLEVBQUUsTUFBTSxJQUFJO0FBQzFELFVBQU0sWUFBc0IsQ0FBQztBQUM3QixRQUFJLFlBQVk7QUFHaEIsVUFBTSxhQUFhO0FBQ25CLGFBQVMsSUFBSSxNQUFNLFNBQVMsR0FBRyxLQUFLLEdBQUcsS0FB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LGNBQUksQ0FBQyxLQUFLO0FBQ1IsZ0JBQUksVUFBVSxLQUFLLEVBQUUsZ0JBQWdCLGFBQWEsQ0FBQztBQUNuRCxnQkFBSSxJQUFJLGtCQUFrQjtBQUMxQjtBQUFBLFVBQ0Y7QUFFQSxjQUFJLFVBQVUsS0FBSyxFQUFFLFVBQVUsS0FBSyxpQkFBaUIsV0FBVyxDQUFDO0FBQ2pFLGNBQUksSUFBSTtBQUFBLFFBQ1YsUUFBUTtBQUNOLGNBQUksVUFBVSxLQUFLLEVBQUUsZ0JBQWdCLGFBQWEsQ0FBQztBQUNuRCxjQUFJLElBQUkscUJBQXFCO0FBQUEsUUFDL0I7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTSxVQUFVLENBQUMsTUFBTSxHQUFHLFlBQVksR0FBRyxhQUFhLEdBQUcsdUJBQXVCLEdBQUcsOEJBQThCLEdBQUcsdUJBQXVCLENBQUM7QUFFNUksSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUI7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFxQixVQUFVLEtBQUs7QUFBQSxNQUN0RCxXQUFXLEtBQUssUUFBUSxrQ0FBcUIsUUFBUTtBQUFBLE1BQ3JELFdBQVcsS0FBSyxRQUFRLGtDQUFxQixpQkFBaUI7QUFBQSxJQUNoRTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVEsS0FBSyxRQUFRLGdDQUFtQjtBQUFBLEVBQ3hDLE1BQU0sS0FBSyxRQUFRLGtDQUFxQixRQUFRO0FBQUEsRUFDaEQsT0FBTztBQUFBLElBQ0wsUUFBUSxLQUFLLFFBQVEsa0NBQXFCLGFBQWE7QUFBQSxJQUN2RCxhQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFDWixNQUFNO0FBQUEsSUFDTixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxJQUNBLElBQUk7QUFBQSxNQUNGLFFBQVE7QUFBQSxNQUNSLE1BQU0sQ0FBQyxPQUFPO0FBQUEsSUFDaEI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
