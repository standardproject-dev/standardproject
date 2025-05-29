export function isNonNullable<T = any>(x: T): x is NonNullable<T> {
  // eslint-disable-next-line eqeqeq
  return x != null
}
