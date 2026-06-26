/**
 * Maps Mongolian Cyrillic letters to their Latin transliteration so that
 * Cyrillic names produce meaningful, non-empty, URL-safe slugs.
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'ye',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  ө: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ү: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** Transliterates Cyrillic characters to Latin; leaves other characters intact. */
function transliterate(input: string): string {
  let out = '';
  for (const char of input) {
    out += char in CYRILLIC_MAP ? CYRILLIC_MAP[char] : char;
  }
  return out;
}

/** Converts arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return transliterate(input.toLowerCase())
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accent marks
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
