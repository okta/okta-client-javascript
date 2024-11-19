// confirms both arrays contains the same elements, regardless of order
// NOTE: THIS WILL NOT HANDLE cases like: [1,2,2] vs [1,1,2]
export function hasSameValues<T> (a1: T[], a2: T[]) {
  if (!Array.isArray(a1) || !Array.isArray(a2)) {return false;}
  const s1: Set<T> = new Set(a1);
  const s2: Set<T> = new Set(a2);
  return s1.size === s2.size && ([...s1].every(t => s2.has(t)));
}
