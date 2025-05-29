import { expect, test, describe } from 'vitest'
import { type AdjList, Graph } from '../src/lib/graph'
import { topologicalSort } from '../src/lib/topological-sort'

describe('topological sort', () => {
  describe('basic', () => {
    test('empty', () => {
      const g = Graph.fromAdjList({})
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: [],
        cycle: [],
      })
    })

    test('single node graph', () => {
      const g = Graph.fromAdjList({
        A: [],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A'],
        cycle: [],
      })
    })

    test('linear graph', () => {
      const g = Graph.fromAdjList({
        A: ['B'],
        B: ['C'],
        C: [],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A', 'B', 'C'],
        cycle: [],
      })
    })
  })

  describe('complex', () => {
    test('diamond-shaped', () => {
      const g = Graph.fromAdjList({
        A: ['B'],
        B: ['D'],
        C: ['D'],
        D: [],
      })
      const result = topologicalSort(g)
      expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('B'))
      expect(result.sorted.indexOf('A')).toBeLessThan(result.sorted.indexOf('C'))
      expect(result.sorted.indexOf('B')).toBeLessThan(result.sorted.indexOf('D'))
      expect(result.sorted.indexOf('C')).toBeLessThan(result.sorted.indexOf('D'))
    })

    test('multiple independent paths', () => {
      const g = Graph.fromAdjList({
        A: ['B'],
        B: ['C'],
        D: ['E'],
        E: ['F'],
        C: [],
        F: [],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A', 'D', 'B', 'E', 'C', 'F'],
        cycle: [],
      })
    })
  })

  describe('cycle detect', () => {
    test('simple cycle', () => {
      const g = Graph.fromAdjList({
        A: ['B'],
        B: ['C'],
        C: ['A'],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: [],
        cycle: ['B', 'C', 'A'],
      })
    })

    test('self-loop', () => {
      const g = Graph.fromAdjList({
        A: ['A'],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: [],
        cycle: ['A'],
      })
    })

    test('cycle in complex graph', () => {
      const g = Graph.fromAdjList({
        A: ['B'],
        B: ['C', 'D'],
        C: ['E'],
        D: ['E'],
        E: ['B'],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A'],
        cycle: ['C', 'E', 'B'],
      })
    })
  })

  describe('edge case', () => {
    test('disconnected components', () => {
      const g = Graph.fromAdjList({
        A: [],
        B: [],
        C: [],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A', 'B', 'C'],
        cycle: [],
      })
    })

    test('multiple entry points', () => {
      const g = Graph.fromAdjList({
        A: ['C'],
        B: ['C'],
        C: ['D'],
        D: [],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A', 'B', 'C', 'D'],
        cycle: [],
      })
    })

    test('complex cycle with branches', () => {
      const g = Graph.fromAdjList({
        A: ['B', 'C'],
        B: ['D'],
        C: ['D'],
        D: ['E'],
        E: ['B'],
        F: ['A'],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['F', 'A', 'C'],
        cycle: ['D', 'E', 'B'],
      })
    })
  })

  describe('performance', () => {
    test('large acyclic graph', () => {
      const adjList: AdjList<string> = {}
      // 创建一个有 1000 个节点的大图
      const N = 1000
      for (let i = 0; i < N; i++) {
        adjList[i] = i < (N - 1) ? [`${i + 1}`] : []
      }

      const g = Graph.fromAdjList(adjList)
      const startTime = performance.now()
      const result = topologicalSort(g)
      const endTime = performance.now()
      expect(result.cycle).toEqual([])
      expect(result.sorted.length).toBe(N)
      expect(endTime - startTime).toBeLessThan(100)
    })

    test('large cyclic graph', () => {
      const adjList: AdjList<string> = {}
      // 创建一个有 1000 个节点的环形图
      const N = 1000
      for (let i = 0; i < N; i++) {
        adjList[i] = [(i < (N - 1) ? `${i + 1}` : '0')]
      }

      const g = Graph.fromAdjList(adjList)
      const startTime = performance.now()
      const result = topologicalSort(g)
      const endTime = performance.now()
      expect(result.cycle.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('special Input test', () => {
    test('graph with duplicate edges', () => {
      const g = Graph.fromAdjList({
        A: ['B', 'B'], // 重复边
        B: [],
      })
      const result = topologicalSort(g)
      expect(result).toEqual({
        sorted: ['A', 'B'],
        cycle: [],
      })
    })
  })
})
