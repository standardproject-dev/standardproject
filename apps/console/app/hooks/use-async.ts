import React from "react";

export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = React.useState<T | null>(null);

  React.useEffect(() => {
    fn()
      .then((result) => {
        setData(result);
      })
  }, deps);

  return data
}
