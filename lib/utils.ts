export const pickIfDefined = <T extends object>(obj: T, keys: (keyof T)[]) => {
  return keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
    return result;
  }, {} as T);
};

export const addWindowListener = (event: string, listener: EventListener) => {
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
};

export const isUndefined = (value: unknown): value is undefined =>
  typeof value === "undefined";

export const isFunction = (value: unknown): value is () => unknown =>
  typeof value === "function";
