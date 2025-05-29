type NoInfer<T> = [T][T extends any ? 0 : never]

export type AdjList<T extends string> = Record<T, NoInfer<T>[]>

export class Graph<T extends string> {
  /**
   * 前置
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  predesessors: Record<T, Set<T>> = {} as any

  /**
   * 后置
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  successors: Record<T, Set<T>> = {} as any

  get size() {
    return Object.keys(this.successors).length
  }

  addNode(node: T) {
    this.predesessors[node] = new Set()
    this.successors[node] = new Set()
  }

  addEdge(from: T, to: T) {
    this.predesessors[to].add(from)
    this.successors[from].add(to)
  }

  removeEdge(from: T, to: T) {
    this.predesessors[to].delete(from)
    this.successors[from].delete(to)
  }

  static toAdjList <T extends string>(graph: Graph<T>) {
    return {
      predesessorAdjList: map(graph.predesessors, (it) => {
        return Array.from(it)
      }),
      successorsAdjList: map(graph.successors, (it) => {
        return Array.from(it)
      }),
    }
  }

  static fromAdjList <T extends string>(adjList: AdjList<T>): Graph<T> {
    const g = new Graph<T>()

    const entries = Object.entries<T[]>(adjList)

    // 第一遍：添加节点
    entries.forEach((it) => {
      const from = it[0] as T
      g.addNode(from)
    })

    // 第二遍：添加边
    entries.forEach((it) => {
      const from = it[0] as T
      it[1].forEach((to) => {
        g.addEdge(from, to)
      })
    })

    return g
  }
}

export function map<K extends string, V, U>(record: Record<K, V>, fn: (it: V) => U) {
  return Object.fromEntries(
    Object.entries<V>(record).map((it) => {
      return [it[0], fn(it[1])]
    }),
  ) as unknown as Record<K, U>
}

export function forEach<K extends string, V>(record: Record<K, V>, fn: (k: K, v: V) => void) {
  Object.entries<V>(record).forEach((it) => {
    fn(it[0] as K, it[1])
  })
}

export function find<K extends string, V>(record: Record<K, V>, fn: (k: K, v: V) => boolean): [K, V] | undefined {
  const entires = Object.entries<V>(record) as [K, V][]
  return entires.find((it) => {
    return fn(it[0], it[1])
  })
}
