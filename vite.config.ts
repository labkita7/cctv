import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handlePelindungProxy } from "./proxy/pelindung.mjs";

// Proxy /p/ juga jalan di dev (middleware Vite) memakai implementasi yang sama
// dengan server produksi (server.mjs).
function pelindungProxy(): Plugin {
  return {
    name: "pelindung-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/p/")) {
          void handlePelindungProxy(req, res);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), pelindungProxy()],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
});
