// Gets & removes item from the set
export const take = <T>(set: Set<T>): T | undefined => {
  const iterator = set.values();
  const first = iterator.next();
  if (!first.done) {
    set.delete(first.value);
    return first.value;
  }
  return undefined;
};
