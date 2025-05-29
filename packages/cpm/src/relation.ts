import { Duration } from './duration'
import { Task } from './task'

export enum RelationType {
  FINISH_FINISH = 0,
  FINISH_START = 1,
  START_FINISH = 2,
  START_START = 3,
}

export const RelationTypeProps = [
  { name: 'FF', value: RelationType.FINISH_FINISH },
  { name: 'FS', value: RelationType.FINISH_START },
  { name: 'SF', value: RelationType.START_FINISH },
  { name: 'SS', value: RelationType.START_START },
] as const

export interface Relation {
  readonly uniqueID: number
  readonly predecessorTask: Task
  readonly successorTask: Task
  readonly type: RelationType
  readonly lag: Duration
  m_notes: string
}

export const Relation = new class RelationStub {
  from(relation: Relation): Relation {
    return { ...relation }
  }
}()
