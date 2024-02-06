import { describe, expect, it } from '@jest/globals';
import { createCache } from '../lib';

describe('cache', () => {
  it('should build cache without errors', async () => {
    expect(async () => {
      createCache();
    }).not.toThrow();
  });

  it('should initialize cache with default values', () => {
    const cache = createCache({
      cacheTime: 300000,
      staleTime: 30000,
    });
    cache.initQueryParams('test');
    expect(cache.data['test']).toEqual({
      data: undefined,
      isLoading: false,
      error: undefined,
      cacheTime: 300000,
      staleTime: 30000,
    });
  });

  it('should set default params on setQueryParams', () => {
    const cache = createCache();
    cache.setQueryParams('test', { data: 'test' });
    expect(cache.data['test']).toEqual({
      data: 'test',
      isLoading: false,
      error: undefined,
      cacheTime: 5 * 60 * 1000,
      staleTime: 0,
    });
  });
});
