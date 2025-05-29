import { find, forEach, Graph, map } from './graph'

type Result<T extends string> = {

  /**
   * 拓扑排序后的节点列表
   */
  sorted: T[]

  /**
   * 循环了的节点
   */
  cycle: T[]

}

export function topologicalSort<T extends string>(graph: Graph<T>): Result<T> {
  const inDegrees = map(graph.predesessors, (it) => {
    return it.size
  })

  // 将所有入度为0的节点加入队列
  const queue: T[] = []
  forEach(inDegrees, (k, v) => {
    if (v === 0) {
      queue.push(k)
    }
  })

  const result: T[] = []
  const processedNodes = new Set<T>()

  // 处理队列
  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const node = queue.shift()!
    result.push(node)
    processedNodes.add(node)

    // 获取当前节点的所有邻居
    const neighbors = graph.successors[node]

    // 更新邻居节点的入度
    for (const neighbor of neighbors) {
      const newDegree = inDegrees[neighbor] - 1
      inDegrees[neighbor] = newDegree

      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  // 如果结果长度小于图中节点数，说明存在环
  if (result.length < graph.size) {
    // 找出环
    const cycleNodes = findCycle(processedNodes, inDegrees, graph.predesessors)
    return {
      sorted: result,
      cycle: cycleNodes,
    }
  }

  return {
    sorted: result,
    cycle: [],
  }
}

function findCycle<T extends string>(
  processedNodes: Set<T>,
  inDegrees: Record<T, number>,
  nodeToParents: Record<T, Set<T>>,
): T[] {
  // 找到一个未处理且入度不为0的节点作为起点
  const startNode = find(inDegrees, (node, degree) => {
    if (!processedNodes.has(node) && degree > 0) {
      return true
    }
    return false
  })?.[0]

  if (!startNode) return []

  // 使用 DFS 查找环
  const visited = new Set<T>()
  const path = new Set<T>()
  const cycle: T[] = []
  let cycleFound = false

  const dfs = (node: T) => {
    if (cycleFound) return
    if (path.has(node)) {
      // 找到环
      cycleFound = true
      let current = node
      do {
        cycle.unshift(current)
        // 从父节点中找到那个在当前路径上的节点
        const parents = nodeToParents[current]
        for (const parent of parents) {
          if (path.has(parent)) {
            current = parent
            break
          }
        }
      } while (current !== node)
      return
    }

    if (visited.has(node)) return

    visited.add(node)
    path.add(node)

    // 检查父节点
    const parents = nodeToParents[node]
    for (const parent of parents) {
      if (!processedNodes.has(parent)) {
        dfs(parent)
      }
    }

    path.delete(node)
  }

  dfs(startNode)
  return cycle
}
