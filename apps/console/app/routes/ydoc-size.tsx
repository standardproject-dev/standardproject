import React from "react";
import type { Route } from "./+types/ydoc-size";

export function clientLoader() {
  return {
    message: 'Hello from YDoc Size',
    size: window.localStorage.getItem('ydoc-size')
  }
}

export default function YDocSize(props: Route.ComponentProps) {

  let size = 0
  size++
  window.localStorage.setItem('ydoc-size', size.toString())

  React.useEffect(() => {

    window.localStorage.setItem('ydoc-size', '0')

  }, [])

  return (
    <div>
      <h1>YDoc Size</h1>
      {/* <div>
        { props.loaderData?.message }
      </div>
      <div>
        { props.loaderData?.size }
      </div> */}
    </div>
  )
}
