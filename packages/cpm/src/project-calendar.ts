import type { Duration } from './duration'
import type { TimeUnit } from './time-unit'

export interface ProjectCalendar {
  getDate (date: Date, duration: Duration): Date
  getNextWorkStart(date: Date): Date
  getPreviousWorkFinish(date: Date): Date
  getWork(startDate: Date, endDate: Date, format: TimeUnit): Duration
}
