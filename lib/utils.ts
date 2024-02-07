export const pickIfDefined = <T extends object>(obj: T, keys: (keyof T)[]) => {
  return keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
    return result;
  }, {} as T);
};
