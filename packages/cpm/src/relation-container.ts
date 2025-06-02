import type { AdjList } from './lib/graph'
import type { Relation } from './relation'
import type { Task } from './task'

export class RelationContainer {
  constructor(readonly relations: Relation[] = []) {
    this.relations = relations
  }

  getSuccessors(task: Task): Relation[] {
    return this.relations.filter(relation => relation.predecessorTask === task)
  }

  getPredecessors(task: Task): Relation[] {
    return this.relations.filter(relation => relation.successorTask === task)
  }

  toAdjList (): AdjList<string> {
    const ret: AdjList<string> = {}
    for (const relation of this.relations) {
      const { predecessorTask, successorTask } = relation
      if (!ret[predecessorTask.guid]) {
        ret[predecessorTask.guid] = []
      }
      ret[predecessorTask.guid].push(successorTask.guid)
    }
    return ret
  }
}
