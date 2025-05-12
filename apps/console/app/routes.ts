import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route('ydoc-size', 'routes/ydoc-size.tsx'),
  route('canvas-ui', 'routes/canvas-ui.tsx'),
  route('dynamic-logo', 'routes/dynamic-logo.tsx'),
] satisfies RouteConfig;
