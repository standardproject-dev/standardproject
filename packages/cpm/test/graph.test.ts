import { expect, test, describe } from 'vitest'
import { type AdjList, Graph } from '~/lib/graph'

describe('graph', () => {
  const adjList: AdjList<string> = {
    A: ['B'],
    B: ['C'],
    C: [],
  }

  test('Graph.fromAdjList', () => {
    const g = Graph.fromAdjList(adjList)
    const { predesessorAdjList, successorsAdjList } = Graph.toAdjList(g)
    expect(successorsAdjList).toEqual(adjList)
    expect(predesessorAdjList).toEqual({
      A: [],
      B: ['A'],
      C: ['B'],
    })
  })
})
