import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

import {
  arrayHelpers,
  objectHelpers,
  stringHelpers,
  validationHelpers,
  fileHelpers,
  urlHelpers,
  asyncHelpers,
  storageHelpers,
} from '@/utils/helpers';
import { logger } from '@/utils/logger';

describe('helpers utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('arrayHelpers', () => {
    const sample = [
      { id: 1, name: 'Alpha', group: 'a' },
      { id: 2, name: 'Beta', group: 'b' },
      { id: 3, name: 'Beta', group: 'a' },
    ];

    it('removes and updates items by id without mutating mənbəni', () => {
      const removed = arrayHelpers.removeById(sample, 2);
      expect(removed).toHaveLength(2);
      expect(sample).toHaveLength(3);

      const updated = arrayHelpers.updateById(sample, 1, { name: 'New Alpha' });
      expect(updated.find(i => i.id === 1)?.name).toBe('New Alpha');
      expect(sample.find(i => i.id === 1)?.name).toBe('Alpha');
    });

    it('groups, deduplicates and moves items', () => {
      const groups = arrayHelpers.groupBy(sample, 'group');
      expect(groups.a).toHaveLength(2);

      const unique = arrayHelpers.uniqueBy(
        [...sample, { id: 3, name: 'Duplicate', group: 'a' }],
        'id'
      );
      expect(unique).toHaveLength(3);

      const moved = arrayHelpers.move([1, 2, 3], 0, 2);
      expect(moved).toEqual([2, 3, 1]);
    });
  });

  describe('objectHelpers', () => {
    it('deepClone clones nested structures and flatten flattens nested keys', () => {
      const original = { id: 1, meta: { nested: true, arr: [{ value: 1 }] } };
      const copy = objectHelpers.deepClone(original);
      expect(copy).toEqual(original);
      copy.meta.arr[0].value = 5;
      expect(original.meta.arr[0].value).toBe(1);

      const flattened = objectHelpers.flatten({ a: { b: { c: 1 } }, d: 2 });
      expect(flattened).toEqual({ 'a.b.c': 1, d: 2 });
    });
  });

  describe('stringHelpers', () => {
    it('formats casing and strips/escapes HTML', () => {
      expect(stringHelpers.kebabCase('HelloWorld Test')).toBe('hello-world-test');
      expect(stringHelpers.camelCase('hello-world')).toBe('helloWorld');
      expect(stringHelpers.pascalCase('hello_world')).toBe('HelloWorld');
      expect(stringHelpers.slug(' Salam! Dünya ')).toBe('salam-dnya');

      const escaped = stringHelpers.escapeHtml('<div>& test</div>');
      expect(escaped).toBe('&lt;div&gt;&amp; test&lt;/div&gt;');
      expect(stringHelpers.stripHtml('<p>text&nbsp;</p>')).toBe('text\xa0');
    });
  });

  describe('validationHelpers', () => {
    it('validates presence, length və diapazon şərtlərini', () => {
      expect(validationHelpers.isPresent('')).toBe(false);
      expect(validationHelpers.minLength('abc', 2)).toBe(true);
      expect(validationHelpers.maxLength('abc', 2)).toBe(false);
      expect(validationHelpers.inRange(5, 1, 5)).toBe(true);
      expect(validationHelpers.minArrayLength([1], 2)).toBe(false);
    });
  });

  describe('fileHelpers & urlHelpers', () => {
    it('determines extensions and formats size', () => {
      expect(fileHelpers.getExtension('report.pdf')).toBe('pdf');
      expect(fileHelpers.isDocument('data.xlsx')).toBe(true);
      expect(fileHelpers.isImage('photo.JPG')).toBe(true);
      expect(fileHelpers.formatSize(2048)).toBe('2 KB');
    });

    it('builds URLs with params and handles invalid domains', () => {
      const url = urlHelpers.buildUrl('https://example.com/base', {
        page: 1,
        tags: ['a', 'b'],
        empty: '',
      });
      expect(url).toContain('page=1');
      expect(url).toContain('tags=a');
      expect(url).toContain('tags=b');

      expect(urlHelpers.getDomain('https://sub.domain.az/path')).toBe('sub.domain.az');
      expect(urlHelpers.getDomain('::bad')).toBe('');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('asyncHelpers', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays execution və retry uğurla tamamlanır', async () => {
      vi.useFakeTimers();
      const delayPromise = asyncHelpers.delay(200);
      await vi.advanceTimersByTimeAsync(200);
      await expect(delayPromise).resolves.toBeUndefined();

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockResolvedValue('done');
      const delaySpy = vi.spyOn(asyncHelpers, 'delay').mockResolvedValue();

      await expect(asyncHelpers.retry(fn, 2, 100)).resolves.toBe('done');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(delaySpy).toHaveBeenCalled();
      delaySpy.mockRestore();
    });
  });

  describe('storageHelpers', () => {
    it('handles JSON parse errors və qaytarır default dəyər', () => {
      localStorage.setItem('bad', '{invalid');
      const result = storageHelpers.get('bad', 'fallback');
      expect(result).toBe('fallback');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('set/remove/clear əməliyyatlarında istisnaları udur', () => {
      const setSpy = vi
        .spyOn(window.localStorage.__proto__, 'setItem')
        .mockImplementation(() => {
          throw new Error('denied');
        });

      expect(storageHelpers.set('key', 'value')).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
      setSpy.mockRestore();

      expect(storageHelpers.remove('key')).toBe(true);
      expect(storageHelpers.clear()).toBe(true);
    });
  });
});
