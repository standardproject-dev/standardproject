import { isAfter, isBefore } from 'date-fns'

export class DateUtils {

  static min<T extends Date | null>( d1: T, d2: T): T {
    if (!d1) {
      return d2
    }
    if (!d2) {
      return d1
    }
    return isBefore(d1, d2)
      ? d1
      : d2
  }

  static max<T extends Date | null>( d1: T, d2: T): T {
    if (!d1) {
      return d2
    }
    if (!d2) {
      return d1
    }
    return isAfter(d1, d2)
      ? d1
      : d2
  }
}
