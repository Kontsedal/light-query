# light-query

[![npm version](https://img.shields.io/npm/v/@kontsedal/light-query)](https://www.npmjs.com/package/@kontsedal/light-query)
[![gzip size](https://img.shields.io/badge/gzip-~2kb-brightgreen)](https://bundlephobia.com/package/@kontsedal/light-query)
[![license](https://img.shields.io/npm/l/@kontsedal/light-query)](https://github.com/kontsedal/light-query/blob/main/LICENSE)

A tiny (~2kb gzipped) React data-fetching library. Simple hooks for caching, retries, pagination, and keeping your server state in sync — without the bundle bloat.

## Why light-query?

- **Tiny** — ~2kb gzipped, zero runtime dependencies
- **Simple API** — three hooks cover most data-fetching needs
- **TypeScript-first** — full type inference, generic hooks
- **Familiar** — if you've used react-query, you already know this

## Installation

```bash
npm install @kontsedal/light-query
# or
yarn add @kontsedal/light-query
# or
pnpm add @kontsedal/light-query
```

## Basic Usage

### Fetching data

```tsx
import { useQuery } from "@kontsedal/light-query";

function Users() {
  const { data, isLoading, error } = useQuery("users", () =>
    fetch("/api/users").then((r) => r.json())
  );

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Failed to load</p>;
  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### Submitting data

```tsx
import { useMutation } from "@kontsedal/light-query";

function CreatePost() {
  const { mutate, isLoading, error } = useMutation((post) =>
    fetch("/api/posts", { method: "POST", body: JSON.stringify(post) }).then(
      (r) => r.json()
    )
  );

  return (
    <div>
      <button onClick={() => mutate({ title: "Hello" })} disabled={isLoading}>
        Create
      </button>
      {error && <p>Something went wrong</p>}
    </div>
  );
}
```

### Paginated data

```tsx
import { usePagination } from "@kontsedal/light-query";

function Posts() {
  const { pages, pageId, fetchPage, hasPage, isLoading } = usePagination(
    "posts",
    (page) => fetch(`/api/posts?page=${page}`).then((r) => r.json()),
    { getFetchPageParams: (requestedPage) => requestedPage }
  );

  return (
    <div>
      {pages.map((page) =>
        page.items.map((item) => <Post key={item.id} item={item} />)
      )}
      {hasPage(pageId + 1) && (
        <button onClick={() => fetchPage(pageId + 1)} disabled={isLoading}>
          Load more
        </button>
      )}
    </div>
  );
}
```

## API Reference

### `useQuery`

Fetches and caches data. Subsequent calls with the same key return cached data without refetching.

```typescript
const result = useQuery<T>(key: string, fetchFn: () => Promise<T> | T, options?: UseQueryOptions<T>)
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Set to `false` to disable automatic fetching |
| `staleTime` | `number` | `0` | Milliseconds before data is considered stale and refetched on next access |
| `cacheTime` | `number` | `300000` | Milliseconds to keep unused data in cache before garbage collection |
| `initialData` | `T` | — | Pre-populate cache before first fetch |
| `refetchInterval` | `(data?: T) => number \| Promise<number>` | — | Return interval in ms. Return `0` to stop polling |
| `refetchOnWindowFocus` | `boolean` | `false` | Refetch when browser tab regains focus |
| `refetchOnReconnect` | `boolean` | `false` | Refetch when network connection is restored |
| `retry` | `(attempt, error, state?) => number \| Promise<number>` | — | Return delay in ms. Return `0` to stop retrying |
| `onSuccess` | `(data: T) => void` | — | Called after a successful fetch |
| `onError` | `(error: unknown) => void` | — | Called after a failed fetch |
| `cache` | `Cache` | global | Use a custom cache instance |

#### Return Value

| Field | Type | Description |
|---|---|---|
| `data` | `T \| undefined` | The fetched data |
| `error` | `unknown \| undefined` | The error, if the fetch failed |
| `isLoading` | `boolean` | Currently fetching |
| `isIdle` | `boolean` | Never fetched yet (`!isLoading && !lastFetchedAt`) |
| `isUpdating` | `boolean` | Refetching after a previous successful load |
| `isSuccess` | `boolean` | Has data, no error, not loading |
| `isError` | `boolean` | Has error, not loading |
| `isFetched` | `boolean` | At least one fetch attempt has completed |
| `lastFetchedAt` | `number \| undefined` | Timestamp of the last fetch attempt |
| `refetch` | `() => Promise` | Force a refetch, bypassing stale checks |
| `reset` | `() => void` | Clear cached data, returning to idle state |
| `setData` | `(data: T \| ((prev?: T) => T)) => void` | Manually update cached data (useful for optimistic updates) |
| `getData` | `() => T \| undefined` | Read cached data outside of render (avoids stale closures) |

---

### `useMutation`

A simple wrapper for async side effects (form submissions, API calls, etc.) without caching.

```typescript
const { isLoading, error, mutate } = useMutation<T, D>(
  mutationFn: (vars: T) => Promise<D> | D
)
```

When `T` is `void` (default), `mutate()` can be called with no arguments. When `T` is a specific type, the first argument is required.

#### Return Value

| Field | Type | Description |
|---|---|---|
| `isLoading` | `boolean` | Currently executing |
| `error` | `unknown \| undefined` | Error from the last execution |
| `mutate` | `(vars: T, throwError?: boolean) => Promise<D>` | Execute the mutation. Pass `throwError: true` to re-throw errors |

---

### `usePagination`

Built on top of `useQuery` for managing paginated / infinite query data. Accumulates pages as you navigate, supports both numeric offsets and string cursors.

```typescript
const result = usePagination<T, D, P = number>(
  key: string,
  fetchFn: (params: D | undefined) => Promise<T> | T,
  options: UsePaginationOptions<T, D, P>
)
```

#### Options

Extends all `useQuery` options, plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultPageId` | `P` | `1` | Initial page identifier |
| `getFetchPageParams` | `(requestedPageId, currentPageId, currentPage, allPages) => D \| undefined` | **required** | Maps a page ID to fetch parameters. Return `undefined` to indicate the page doesn't exist |

The `allPages` argument is a `Map<P, T>` containing all fetched pages.

#### Return Value

All `useQuery` return fields, plus:

| Field | Type | Description |
|---|---|---|
| `pages` | `T[]` | Array of all fetched pages |
| `pageId` | `P` | Current page identifier |
| `hasPage` | `(pageId: P) => boolean` | Check if a page can be fetched |
| `fetchPage` | `(pageId: P) => void` | Navigate to a page |

---

### `createCache`

Create a custom cache instance. A global cache is used by default.

```typescript
const cache = createCache(options?: CreateCacheOptions)
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `staleTime` | `number` | `0` | Default stale time for all queries |
| `cacheTime` | `number` | `300000` | Default cache lifetime (5 min) |
| `garbageCollectorInterval` | `number` | `500` | How often to check for expired entries (ms) |
| `refetchOnWindowFocus` | `boolean` | `false` | Default for all queries |
| `refetchOnReconnect` | `boolean` | `false` | Default for all queries |

#### Methods

| Method | Description |
|---|---|
| `invalidate(keyOrPrefix)` | Invalidate entries by exact key or prefix. Matching queries will refetch on next access |
| `get(key)` | Read the current state for a key |
| `set(key, values, notify?)` | Update state. Set `notify: false` to skip listener notifications |
| `toggleGc(enabled)` | Enable/disable the garbage collector |

---

### `CacheContext` / `useCache`

Provide a custom cache to a component tree via React context.

```tsx
import { createCache, CacheContext } from "@kontsedal/light-query";

const myCache = createCache({ staleTime: 30000 });

function App() {
  return (
    <CacheContext.Provider value={myCache}>
      <MyComponent />
    </CacheContext.Provider>
  );
}
```

## Advanced Patterns

### Retry with Exponential Backoff

```typescript
const { data } = useQuery("posts", fetchPosts, {
  retry: (attempt, error) => {
    if (attempt >= 3) return 0; // stop after 3 attempts
    return Math.min(1000 * 2 ** attempt, 30000); // 2s, 4s, 8s...
  },
});
```

### Optimistic Updates

```typescript
const { setData, refetch } = useQuery("todos", fetchTodos);
const { mutate } = useMutation(addTodo);

async function handleAdd(todo) {
  setData((prev) => [...(prev ?? []), todo]); // optimistic update
  try {
    await mutate(todo);
  } catch {
    refetch(); // rollback on failure
  }
}
```

### Cache Invalidation After Mutation

```typescript
import { globalCache } from "@kontsedal/light-query";

const { mutate } = useMutation(updateUser);

async function handleSave(userData) {
  await mutate(userData);
  globalCache.invalidate("user-"); // invalidate all user-* queries
}
```

### Conditional Fetching

```typescript
const { data: user } = useQuery("user", fetchUser);
const { data: posts } = useQuery(
  `posts-${user?.id}`,
  () => fetchPosts(user.id),
  { enabled: !!user?.id }
);
```

### Cursor-Based Pagination

```typescript
type Page = { items: Item[]; nextCursor?: string };

const { pages, pageId, fetchPage, hasPage } = usePagination<Page, string, string>(
  "feed",
  (cursor) => fetchFeed(cursor),
  {
    defaultPageId: "initial",
    getFetchPageParams: (requestedId, currentId, currentPage, allPages) => {
      if (requestedId === "initial") return "";
      // Find the page that has the cursor pointing to the requested page
      for (const [, page] of allPages) {
        if (page.nextCursor === requestedId) return requestedId;
      }
      return undefined; // page not reachable
    },
  }
);
```

### Numeric Pagination

```typescript
const { data, pages, pageId, fetchPage, hasPage } = usePagination(
  "posts",
  (page) => fetch(`/api/posts?page=${page}`).then((r) => r.json()),
  {
    getFetchPageParams: (requestedPage) => requestedPage,
  }
);

// Navigate
if (hasPage(pageId + 1)) fetchPage(pageId + 1);
```

### Polling

```typescript
const { data } = useQuery("status", fetchStatus, {
  refetchInterval: (data) => {
    if (data?.status === "completed") return 0; // stop polling
    return 3000; // poll every 3 seconds
  },
});
```

## Comparison with react-query

| Feature | light-query | react-query |
|---|:---:|:---:|
| Bundle size (gzip) | ~2kb | ~13kb |
| Basic caching | Y | Y |
| Stale time / cache time | Y | Y |
| Retry logic | Y | Y |
| Infinite / paginated queries | Y | Y |
| Mutations | Y | Y |
| Window focus refetch | Y | Y |
| Network reconnect refetch | Y | Y |
| Cache invalidation | Y | Y |
| Optimistic updates | Y | Y |
| Initial data | Y | Y |
| onSuccess / onError | Y | Y |
| DevTools | - | Y |
| SSR / Suspense | - | Y |
| Structural sharing | - | Y |

light-query is designed for apps that need the core data-fetching primitives without the overhead. If you need advanced features like SSR, Suspense, or DevTools, use react-query.

## License

MIT
