export enum ConstraintType {
  AS_SOON_AS_POSSIBLE = 0,
  AS_LATE_AS_POSSIBLE = 1,
  MUST_START_ON = 2,
  MUST_FINISH_ON = 3,
  START_NO_EARLIER_THAN = 4,
  START_NO_LATER_THAN = 5,
  FINISH_NO_EARLIER_THAN = 6,
  FINISH_NO_LATER_THAN = 7,
}

export enum TaskMode {
  MANUALLY_SCHEDULED = 0,
  AUTO_SCHEDULED = 1,
}

export type MPPDuration = {
  duration: number
  unit: string
}

export enum TaskType {
  FIXED_UNITS = 0,
  FIXED_DURATION = 1,
  FIXED_WORK = 2,
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  FIXED_DURATION_AND_UNITS = 1,
}

export enum RelationType {
  FINISH_FINISH = 0,
  FINISH_START = 1,
  START_FINISH = 2,
  START_START = 3,
}

export const RelationTypeName = {
  [RelationType.FINISH_FINISH]: 'FF',
  [RelationType.FINISH_START]: 'FS',
  [RelationType.START_FINISH]: 'SF',
  [RelationType.START_START]: 'SS',
}

export type Task = {
  id: string
  taskMode: TaskMode
  duration: MPPDuration
  work: MPPDuration
  manualDuration: MPPDuration
  constraintType: ConstraintType
  constraintDate: Date
}

export type ScheduleResult = {
  start: Date
  finish: Date
  earlyStart: Date
  earlyFinish: Date
  lateStart: Date
  lateFinish: Date
}

export type Relation = {
  predecessor: string
  successor: string
  type: RelationType
  lag: MPPDuration
}
