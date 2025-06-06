import { Graph, type AdjList } from './lib/graph'
import { topologicalSort } from './lib/topological-sort'
import type { Relation } from './relation'
import { RelationContainer } from './relation-container'
import type { Task } from './task'

export class ProjectFile implements ProjectEntity {

  readonly tasks: Task[] = []

  readonly relations: Relation[] = []

  getSortedTasks(_getSuccessors = this.defaultGetSuccessors): Task[] {
    // todo(hc): allow passing a custom getSuccessors function

    const adjList: AdjList<string> = {}
    for (const relation of this.relations) {
      const { predecessorTask, successorTask } = relation
      if (!adjList[predecessorTask.guid]) {
        adjList[predecessorTask.guid] = []
      }
      adjList[predecessorTask.guid].push(successorTask.guid)
    }

    const graph = Graph.fromAdjList(adjList)
    const sortResult = topologicalSort(graph)
    if (sortResult.cycle.length > 0) {
      throw new Error('Project contains cycle, cannot sort tasks')
    }
    return sortResult.sorted.map(guid => {
      const task = this.tasks.find(task => task.guid === guid)
      if (!task) {
        throw new Error(`Task with guid ${guid} not found`)
      }
      return task
    })
  }

  getTask(guid: string) {
    return this.tasks.find(task => task.guid === guid)
  }

  getTasks() {
    return this.tasks
  }

  getSuccessors(task: Task): Relation[] {
    return this.relations.filter(relation => relation.predecessorTask === task)
  }

  getPredecessors(task: Task): Relation[] {
    return this.relations.filter(relation => relation.successorTask === task)
  }

  private defaultGetSuccessors = (task: Task) => {
    return task.successors
  }

  getTopLevelTasks(): Task[] {
    return this.tasks.filter(task => !task.parentTask && !task.isNull)
  }

  get project () {
    return this
  }

}

export interface ProjectEntity {
  readonly project: ProjectFile
}
