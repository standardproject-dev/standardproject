import type { Route } from "./+types/home";
import type { Route as RootRoute } from "../+types/root";
import { Welcome } from "../welcome/welcome";
import { useRouteLoaderData } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home(props: Route.ComponentProps) {
  const data = useRouteLoaderData<RootRoute.ComponentProps['loaderData']>("root");
  return <Welcome message={data!.message} />;
}
