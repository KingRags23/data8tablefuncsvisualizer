export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function choice<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffledIndices(rng: () => number, n: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function sampleIndices(
  rng: () => number,
  n: number,
  k: number,
  withReplacement: boolean,
): number[] {
  if (withReplacement) {
    return Array.from({ length: k }, () => Math.floor(rng() * n));
  }
  if (k > n) {
    throw new Error("Cannot sample more rows than exist without replacement.");
  }
  return shuffledIndices(rng, n).slice(0, k);
}
