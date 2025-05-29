import type { ProjectFile } from './project'

export interface Scheduler {
  schedule (file: ProjectFile, startDate: Date): void
}
