import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(env => {

  const IS_EXPRESS = process.env['BUILD_RUNTIME'] === 'express';
  const IS_CLOUDFLARE = !IS_EXPRESS

  const plugins = [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ]

  if (IS_CLOUDFLARE) {
    plugins.unshift(
      cloudflare({ viteEnvironment: { name: "ssr" } }),
    )
  }

  const rollupOptions = IS_EXPRESS && env.isSsrBuild
    ? {
        input: "./express/app.ts",
      }
    : undefined

  const build = {
    rollupOptions,
    manifest: true,
  }
  
  return {
    define: {
      'import.meta.env.BUILD_RUNTIME': JSON.stringify(process.env['BUILD_RUNTIME']),
    },
    optimizeDeps: {
      force: true,
    },
    build,
    plugins,
  }
})
