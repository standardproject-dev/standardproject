import type { Duration } from './duration'
import type { ProjectCalendar } from './project-calendar'
import type { Relation } from './relation'
import type { ResourceAssignment } from './resource-assignment'

export enum TaskMode {
  MANUALLY_SCHEDULED = 0,
  AUTO_SCHEDULED = 1,
}

export enum TaskType {
  FIXED_UNITS = 0,
  FIXED_DURATION = 1,
  FIXED_WORK = 2,
  FIXED_DURATION_AND_UNITS = 3,
}

export enum ConstraintType {
  AS_SOON_AS_POSSIBLE = 0,
  AS_LATE_AS_POSSIBLE = 1,
  MUST_START_ON = 2,
  MUST_FINISH_ON = 3,
  START_NO_EARLIER_THAN = 4,
  START_NO_LATER_THAN = 5,
  FINISH_NO_EARLIER_THAN = 6,
  FINISH_NO_LATER_THAN = 7,
  START_ON = 8,
  FINISH_ON = 9,
}

export interface Task {

  guid: string
  uniqueID: number
  type: TaskType
  mode: TaskMode
  isActive: boolean
  isSummary: boolean
  isMilestone: boolean
  isNull: boolean
  levelingDelay: Duration | null
  duration: Duration
  remainingDuration: Duration
  actualDuration: Duration

  start: Date | null
  finish: Date | null
  earlyStart: Date | null
  earlyFinish: Date | null
  lateStart: Date | null
  lateFinish: Date | null
  isCritical: boolean | null
  actualStart: Date | null
  actualFinish: Date | null
  constraintDate: Date | null
  constraintType: ConstraintType | null
  deadline: Date | null

  isExternalTask: boolean
  readonly isExternalProject: boolean

  readonly successors: Relation[]
  readonly predecessors: Relation[]
  readonly assignments: ResourceAssignment[]

  readonly parentTask: Task | null
  readonly childTasks: Task[]

  calendarUniqueID: number
  getEffectiveCalendar(): ProjectCalendar
}

export const Task = new class TaskStub {
}()
