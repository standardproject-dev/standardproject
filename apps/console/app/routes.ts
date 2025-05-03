import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route('ydoc-size', 'routes/ydoc-size.tsx'),
] satisfies RouteConfig;
