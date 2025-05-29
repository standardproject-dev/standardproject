import { Duration } from '~/duration'
import { TimeUnit } from '~/time-unit'
import { describe, test, expect } from 'vitest'

const defaults = {
  minutesPerDay: 60 * 24,
  minutesPerWeek: 60 * 24 * 7,
  daysPerMonth: 24 * 30,
}

describe('duration', () => {
  test('should convert units', () => {
    expect(Duration.convertUnits(
      1,
      TimeUnit.MINUTES,
      TimeUnit.HOURS,
      defaults.minutesPerDay,
      defaults.minutesPerWeek,
      defaults.daysPerMonth,
    )).toEqual({
      duration: 1 / 60,
      units: TimeUnit.HOURS,
    })
  })

  test('should add durations', () => {
    expect(Duration.add(
      { duration: 1, units: TimeUnit.MINUTES },
      { duration: 1, units: TimeUnit.HOURS },
      defaults.minutesPerDay,
      defaults.minutesPerWeek,
      defaults.daysPerMonth,
    )).toEqual({
      duration: 61,
      units: TimeUnit.MINUTES,
    })
  })

  test('should negative durations', () => {
    expect(Duration.add(
      { duration: 1, units: TimeUnit.MINUTES },
      { duration: -1, units: TimeUnit.HOURS },
      defaults.minutesPerDay,
      defaults.minutesPerWeek,
      defaults.daysPerMonth,
    )).toEqual({
      duration: -59,
      units: TimeUnit.MINUTES,
    })
  })
})
