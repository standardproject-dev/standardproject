import { Graph } from './lib/graph'
import { topologicalSort } from './lib/topological-sort'
import { RelationContainer } from './relation-container'
import type { Task } from './task'

export class ProjectFile {
  declare readonly tasks: Task[]

  readonly relationContainer = new RelationContainer()

  getSortedTasks(_getSuccessors = this.defaultGetSuccessors): Task[] {
    // todo(hc): allow passing a custom getSuccessors function
    const graph = Graph.fromAdjList(this.relationContainer.toAdjList())
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

  getTasks() {
    return this.tasks
  }

  private defaultGetSuccessors = (task: Task) => {
    return task.successors
  }

  getTopLevelTasks(): Task[] {
    return this.tasks.filter(task => !task.parentTask && !task.isNull)
  }
}
