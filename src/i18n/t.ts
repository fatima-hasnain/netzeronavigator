import labels from './labels.en.json'

const table = labels as Record<string, string>

/** English UI string by feature id or unit key; falls back to the key. */
export function t(key: string): string {
  return table[key] ?? key
}
