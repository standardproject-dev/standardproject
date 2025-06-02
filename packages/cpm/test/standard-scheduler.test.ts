import { describe, expect, test } from 'vitest';
import { ProjectFile } from '~/project';
import { StandardScheduler } from '~/standard-scheduler';

describe('standard-scheduler', () => {
  test('should schedule empty tasks', () => {
    const project = new ProjectFile()
    const scheduler = new StandardScheduler()
    const startDate = new Date('2023-01-01T00:00:00Z')
    expect(() => {
      scheduler.schedule(project, startDate)
    }).not.toThrow()
  })
})
