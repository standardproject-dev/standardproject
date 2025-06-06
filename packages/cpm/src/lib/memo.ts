/**
 * A decorator that memoizes the latest calculation result of a getter.
 * Caches the result of the getter until it's manually cleared or the instance is recreated.
 */

interface GetterMemoCache {
  hasValue: boolean;
  value: any;
}

/**
 * Decorator that memoizes the latest calculation result of a getter
 * @param target - The target object
 * @param propertyKey - The getter name
 * @param descriptor - The property descriptor
 */
export function memo(
  _target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalGetter = descriptor.get;
  
  if (typeof originalGetter !== 'function') {
    throw new Error('@memo can only be applied to getters');
  }

  // Create a unique cache key for this getter
  const cacheKey = Symbol(`memo_getter_${String(propertyKey)}`);

  descriptor.get = function (this: any) {
    // Get or initialize cache for this instance
    if (!this[cacheKey]) {
      this[cacheKey] = { hasValue: false, value: undefined };
    }

    const cache: GetterMemoCache = this[cacheKey];

    // Return cached value if available
    if (cache.hasValue) {
      return cache.value;
    }

    // Calculate and cache the value
    const result = originalGetter.call(this);
    cache.hasValue = true;
    cache.value = result;

    return result;
  };

  return descriptor;
}

/**
 * Clears the memoized cache for a specific getter on an instance
 * @param instance - The instance to clear cache for
 * @param getterName - The getter name to clear cache for
 */
export function clearGetterCache(instance: any, getterName: string | symbol): void {
  const cacheKey = Symbol.for(`memo_getter_${String(getterName)}`);
  if (instance[cacheKey]) {
    instance[cacheKey] = { hasValue: false, value: undefined };
  }
}

/**
 * Clears all memoized getter caches for an instance
 * @param instance - The instance to clear all getter caches for
 */
export function clearAllGetterCaches(instance: any): void {
  // Get all symbol properties and clear memo caches
  const symbols = Object.getOwnPropertySymbols(instance);
  for (const symbol of symbols) {
    const symbolDescription = symbol.description;
    if (symbolDescription && symbolDescription.startsWith('memo_getter_')) {
      instance[symbol] = { hasValue: false, value: undefined };
    }
  }
}
