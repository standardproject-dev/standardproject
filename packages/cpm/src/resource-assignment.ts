import type { Duration } from './duration'
import type { ProjectCalendar } from './project-calendar'
import type { Resource } from './resource'

export interface ResourceAssignment {
  readonly resource: Resource | null
  readonly units: number
  readonly work: Duration
  readonly actualWork: Duration
  readonly remainingWork: Duration
  getEffectiveCalendar(): ProjectCalendar
}
