import { TimeUnit } from './time-unit'

export type Duration = {
  duration: number
  units: TimeUnit
}

export const Duration = new class DurationHelper {
  from(duration: number, units: TimeUnit): Duration {
    return {
      duration,
      units,
    }
  }

  convertUnits(
    duration: number,
    fromUnits: TimeUnit,
    toUnits: TimeUnit,
    minutesPerDay: number,
    minutesPerWeek: number,
    daysPerMonth: number,
  ): Duration {
    switch (fromUnits) {
      case TimeUnit.YEARS:
        duration *= (minutesPerWeek * 52)
        break
      case TimeUnit.ELAPSED_YEARS:
        duration *= (60 * 24 * 7 * 52)
        break
      case TimeUnit.MONTHS:
        duration *= (minutesPerDay * daysPerMonth)
        break
      case TimeUnit.ELAPSED_MONTHS:
        duration *= (60 * 24 * 30)
        break
      case TimeUnit.WEEKS:
        duration *= minutesPerWeek
        break
      case TimeUnit.ELAPSED_WEEKS:
        duration *= (60 * 24 * 7)
        break
      case TimeUnit.DAYS:
        duration *= minutesPerDay
        break
      case TimeUnit.ELAPSED_DAYS:
        duration *= (60 * 24)
        break
      case TimeUnit.HOURS:
      case TimeUnit.ELAPSED_HOURS:
        duration *= 60
        break
    }

    if (toUnits !== TimeUnit.MINUTES && toUnits !== TimeUnit.ELAPSED_MINUTES) {
      switch (toUnits) {
        case TimeUnit.HOURS:
        case TimeUnit.ELAPSED_HOURS:
          duration /= 60
          break
        case TimeUnit.DAYS:
          if (minutesPerDay !== 0) {
            duration /= minutesPerDay
          } else {
            duration = 0
          }
          break
        case TimeUnit.ELAPSED_DAYS:
          duration /= (60 * 24)
          break
        case TimeUnit.WEEKS:
          if (minutesPerWeek !== 0) {
            duration /= minutesPerWeek
          } else {
            duration = 0
          }
          break
        case TimeUnit.ELAPSED_WEEKS:
          duration /= (60 * 24 * 7)
          break
        case TimeUnit.MONTHS:
          if (minutesPerDay !== 0 && daysPerMonth !== 0) {
            duration /= (minutesPerDay * daysPerMonth)
          } else {
            duration = 0
          }
          break
        case TimeUnit.ELAPSED_MONTHS:
          duration /= (60 * 24 * 30)
          break
        case TimeUnit.YEARS:
          if (minutesPerWeek !== 0) {
            duration /= (minutesPerWeek * 52)
          } else {
            duration = 0
          }
          break
        case TimeUnit.ELAPSED_YEARS:
          duration /= (60 * 24 * 7 * 52)
          break
      }
    }

    return { duration, units: toUnits }
  }

  add(
    a: Duration,
    b: Duration,
    minutesPerDay: number,
    minutesPerWeek: number,
    daysPerMonth: number,
  ): Duration {
    const unit = a.units
    if (b.units !== unit) {
      b = Duration.convertUnits(
        b.duration,
        b.units,
        unit,
        minutesPerDay,
        minutesPerWeek,
        daysPerMonth,
      )
    }
    return {
      duration: a.duration + b.duration,
      units: unit,
    }
  }

  negate(duration: Duration): Duration {
    return {
      duration: -duration.duration,
      units: duration.units,
    }
  }
}()
