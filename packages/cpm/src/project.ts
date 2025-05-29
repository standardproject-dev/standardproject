import { Relation } from './relation'
import { RelationContainer } from './relation-container'
import type { Task } from './task'

export class ProjectFile {
  declare readonly tasks: Task[]

  readonly relationContainer = new RelationContainer()

  getSortedTasks(_getSuccessors = this.defaultGetSuccessors): Task[] {
    // todo
    return []
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
