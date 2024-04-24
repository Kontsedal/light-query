# light-query

Small (1.7kb gzipped) alternative to the react-query library. It's a simple set of react hooks that allows you to 
fetch data from a server and have a control of retries and caching.

## Installation

```shell
npm i @kontsedal/light-query
```

## Usage

### useQuery

Fetches and caches the result of a function call, so consecutive calls will return the same result without making a request to the server.

```typescript
import { useQuery } from "@kontsedal/light-query";
const { data, error, isLoading, refetch, reset } = useQuery("user", () => fetch("/user"), {
  refetchInterval: () => 5000
});

```

#### Result object

- `data` - data returned by the function
- `error` - error returned by the function
- `isLoading` - boolean flag that indicates if the function is currently fetching data
- `isIdle` - boolean flag that indicates that the fetch function has not been called yet
- `isUpdating` - boolean flag that indicates that the fetch function is currently updating the data that was previously fetched
- `lastFetchedAt` - timestamp of the last fetch (successful or failed)
- `refetch` - function that forces the refetch of the data
- `reset` - function that removes the data from the cache

#### Options object

- `refetchInterval` - function that returns the interval in milliseconds to refetch the data. If the function returns non positive number, the data will not be refetched. Function is called with the last fetched data as an argument.
- `cacheTime` - the time in milliseconds to keep the data in the cache after it is no longer used. If the data is not used for this time, it will be removed from the cache.
- `staleTime` - the time in milliseconds to consider the data as fresh and not refresh it on the next access. If the data is older than this time, it will be refetched on the next access.
- `refetchOnWindowFocus` - boolean flag that indicates if the data should be refetched when the window is focused again
- `refetchOnReconnect` - boolean flag that indicates if the data should be refetched when the network connection is reestablished
- `enabled` - boolean flag that indicates if the data should be fetched. If set to false, the data will not be fetched and the cache will not be updated. If there was no data in cache, this query will have an isIdle flag set to true.
- `retry` - function that is called when the fetch function fails. Three arguments are passed to this function: number of attempt, error and the latest data. The function should return the time in milliseconds to wait before the next attempt. If it returns not positive number, it won't retry anymore.


### useMutation

The simple wrapper around the function to provide you with isLoading, error and mutate function.

```typescript

import { useMutation } from "@kontsedal/light-query";

const { isLoading, error, mutate } = useMutation(async (login: string, password: string) => {
  try {
    const response = await fetch("/login", {
      method: "POST",
      body: JSON.stringify({ login, password })
    });
    return response.json();
  } catch (error) {
    throw new Error("Failed to login");
  }
})
```

#### Result object
- `isLoading` - boolean flag that indicates if the function is currently executing
- `error` - error returned by the function
- `mutate` - function that executes the mutation



