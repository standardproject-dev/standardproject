import type { Config } from "@react-router/dev/config";

const IS_EXPRESS = process.env['BUILD_RUNTIME'] === 'express';

export default {
  ssr: true,
  buildDirectory: "build",
  future: {
    unstable_viteEnvironmentApi: IS_EXPRESS ? false : true,

    // see https://github.com/tensorzero/tensorzero/pull/1717
    unstable_optimizeDeps: true,
  },
} satisfies Config;
