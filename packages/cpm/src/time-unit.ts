export enum TimeUnit {
  MINUTES = 0,
  HOURS = 1,
  DAYS = 2,
  WEEKS = 3,
  MONTHS = 4,
  PERCENT = 5,
  YEARS = 6,
  ELAPSED_MINUTES = 7,
  ELAPSED_HOURS = 8,
  ELAPSED_DAYS = 9,
  ELAPSED_WEEKS = 10,
  ELAPSED_MONTHS = 11,
  ELAPSED_YEARS = 12,
  ELAPSED_PERCENT = 13,
}

const TimeUnitProps: { name: string, elapsed: boolean, value: TimeUnit }[] = [
  { name: 'm', elapsed: false, value: TimeUnit.MINUTES },
  { name: 'h', elapsed: false, value: TimeUnit.HOURS },
  { name: 'd', elapsed: false, value: TimeUnit.DAYS },
  { name: 'w', elapsed: false, value: TimeUnit.WEEKS },
  { name: 'mo', elapsed: false, value: TimeUnit.MONTHS },
  { name: '%', elapsed: false, value: TimeUnit.PERCENT },
  { name: 'y', elapsed: false, value: TimeUnit.YEARS },
  { name: 'em', elapsed: true, value: TimeUnit.ELAPSED_MINUTES },
  { name: 'eh', elapsed: true, value: TimeUnit.ELAPSED_HOURS },
  { name: 'ed', elapsed: true, value: TimeUnit.ELAPSED_DAYS },
  { name: 'ew', elapsed: true, value: TimeUnit.ELAPSED_WEEKS },
  { name: 'emo', elapsed: true, value: TimeUnit.ELAPSED_MONTHS },
  { name: 'ey', elapsed: true, value: TimeUnit.ELAPSED_YEARS },
  { name: 'e%', elapsed: true, value: TimeUnit.ELAPSED_PERCENT },
]

export function isElapsedTimeUnit(unit: TimeUnit): boolean {
  return TimeUnitProps[unit].elapsed
}
