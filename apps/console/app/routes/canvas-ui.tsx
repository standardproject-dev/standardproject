import React, { Suspense } from "react";
import { useAsync } from "~/hooks/use-async";
import type { Route } from "./+types/canvas-ui";
 
export function clientLoader() {
  return {
    msgs: [
      '我能吞下玻璃而不伤身体。',
      '私はガラスを食べられます。それは私を傷つけません。',
      'The quick brown fox jumps over the lazy dog.',
    ]
  }
}

const Content = React.lazy(() => import('./canvas-ui.content').then(mod => ({ default: mod.CanvasUIContent})))

const useCanvasUI = () => {
  const mod = useAsync(() => {
    return import('@canvas-ui/react')
  }, [])
  return mod
}

export default function CanvasUI(props: Route.ComponentProps) {
  const mod = useCanvasUI()

  if (!mod) {
    return null
  }

  return (
    <div style={{ height: '200px' }}>
      <h1>Canvas UI</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <Content msgs={ props.loaderData.msgs } />
      </Suspense>
    </div>
  )
}
