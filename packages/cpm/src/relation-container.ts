import type { Relation } from './relation'
import type { Task } from './task'

export class RelationContainer {
  readonly relations: Relation[] = []

  getSuccessors(task: Task): Relation[] {
    return this.relations.filter(relation => relation.predecessorTask === task)
  }

  getPredecessors(task: Task): Relation[] {
    return this.relations.filter(relation => relation.successorTask === task)
  }
}
