import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // node 构建时，需要先注释掉
  // future: {
  //   unstable_viteEnvironmentApi: true,
  // },
} satisfies Config;
