// import { reactRouter } from "@react-router/dev/vite";
// import { cloudflare } from "@cloudflare/vite-plugin";
// import tailwindcss from "@tailwindcss/vite";
// import { defineConfig } from "vite";
// import tsconfigPaths from "vite-tsconfig-paths";

// export default defineConfig({
//   plugins: [
//     cloudflare({ viteEnvironment: { name: "ssr" } }),
//     tailwindcss(),
//     reactRouter(),
//     tsconfigPaths(),
//   ],
// });

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: "./server/app.ts",
        }
      : undefined,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}));