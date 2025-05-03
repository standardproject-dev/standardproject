import Layout from "./layout";

export function Welcome({ message }: { message: string }) {
  return (
    <Layout>
      { message }
    </Layout>
  );
}
