---
name: react-rxjs
description: Best practices for using @react-rxjs/core library to bind RxJS observables to React. Use this skill when working with react-rxjs state(), bind(), useStateObservable(), Subscribe component, or debugging infinite loops and subscription issues in React+RxJS code.
---

# React-RxJS Best Practices & Patterns

## Overview

`@react-rxjs/core` provides bindings between RxJS observables and React. This skill documents correct usage patterns to avoid common pitfalls like infinite loops and memory leaks.

## Core Concepts

### 1. `state()` - Creating State Observables

The `state()` function creates a `StateObservable` that can be consumed by React components. It has two forms:

#### Simple Observable
```typescript
import { state } from "@react-rxjs/core"

// Simple observable - no parameters
const theme$ = state(
  merge(
    fromEvent(window.matchMedia("(...)"), "change").pipe(
      map((evt) => (evt.matches ? "dark" : "light"))
    ),
    changeTheme$,
  ),
  "dark" // default value
)
```

#### Factory Function (Parameterized)
```typescript
// Factory function - creates observable per unique arguments
const storageSubscription$ = state(
  (key: string): Observable<StorageSubscription> =>
    getStorageSubscription$(key),
  null // default value
)
```

### 2. `useStateObservable()` - Consuming Observables

```typescript
import { useStateObservable } from "@react-rxjs/core"

const MyComponent = () => {
  const theme = useStateObservable(theme$)
  const subscription = useStateObservable(storageSubscription$(key))
  
  // Values are ready to use, suspense handles loading
  return <div>{theme}</div>
}
```

### 3. `bind()` - Legacy Pattern (Use with Caution)

`bind()` returns a `[useHook, observable$]` tuple. **CRITICAL**: Arguments are cached by object identity.

```typescript
// ❌ WRONG - Arrays create new references every render = infinite loop
const [useData] = bind(
  (ids: string[]) => getData$(ids),  // ids changes every render!
  []
)

// ✅ CORRECT - Serialize to primitive, parse inside factory
const [useData] = bind(
  (idsKey: string) => getData$(idsKey.split(",")),
  []
)

export const useData = (ids: string[]) => {
  const idsKey = ids.join(",")
  return useDataInternal(idsKey)
}
```

### 4. `Subscribe` Component

Wraps components that use `useStateObservable`. Required at the app root or around features using react-rxjs.

```typescript
import { Subscribe, RemoveSubscribe } from "@react-rxjs/core"

// Basic usage
<Subscribe fallback={<Loading />}>
  <MyComponent />
</Subscribe>

// Pre-warm subscriptions with source$
<Subscribe source$={merge(data$, transactions$, storage$)}>
  <RemoveSubscribe>
    <App />
  </RemoveSubscribe>
</Subscribe>

// HOC pattern (from papi-console)
export const withSubscribe = <T extends object>(
  Component: ComponentType<T>,
  options: Partial<{ source$: Observable<unknown>; fallback: ReactNode }> = {},
) => (props: T) => (
  <Subscribe {...options}>
    <Component {...props} />
  </Subscribe>
)
```

### 5. `pipeState()` - Deriving State

Chain operators while maintaining StateObservable type:

```typescript
const client$ = state(/* ... */)

const best$ = client$.pipeState(
  switchMap((client) => client.bestBlocks$.pipe(map(([best]) => best))),
)

const finalizedNum$ = client$.pipeState(
  switchMap((chainHead) => chainHead.finalizedBlock$),
  map((v) => v.number),
)
```

### 6. `withDefault()` - Provide Default Values

Converts observables to StateObservables with defaults:

```typescript
import { withDefault } from "@react-rxjs/core"

const inputValues$ = selectedEntry$.pipeState(
  filter((v) => !!v),
  map((v) => v.inputs),
  switchMap((inputs) => /* ... */),
  withDefault([] as Array<Uint8Array | null>),
)
```

### 7. `SUSPENSE` and `liftSuspense()` / `sinkSuspense()`

Handle suspense states in observables:

```typescript
import { liftSuspense, sinkSuspense, SUSPENSE } from "@react-rxjs/core"
import { filter, pipe } from "rxjs"

// Remove SUSPENSE values from stream
const removeSuspense = <T>() =>
  pipe(
    liftSuspense<T>(),
    filter<T | SUSPENSE, T>((v): v is T => v !== SUSPENSE),
  )

// Usage
const cleanData$ = data$.pipe(removeSuspense())
```

## @react-rxjs/utils Utilities

### `createSignal()` - Event Emitters

```typescript
import { createSignal } from "@react-rxjs/utils"

// Simple signal
const [changeTheme$, changeTheme] = createSignal<"light" | "dark">()

// Usage
changeTheme("dark")  // emit
const theme$ = state(changeTheme$, "light")  // consume
```

### `createKeyedSignal()` - Keyed Events

```typescript
import { createKeyedSignal } from "@react-rxjs/utils"

const [removeResult$, removeResult] = createKeyedSignal<string>()

// Usage
removeResult("key-123")  // emit for specific key
const shouldRemove$ = removeResult$("key-123")  // observe specific key
```

### `partitionByKey()` - Split Streams by Key

```typescript
import { partitionByKey, toKeySet } from "@react-rxjs/utils"

const [getSubscription$, keyChange$] = partitionByKey(
  newQuery$,
  () => uuid(),  // key generator
  (src$, id) =>  // per-key observable factory
    src$.pipe(
      switchMap(({ promise, ...props }) =>
        from(promise).pipe(
          map((result) => ({ ...props, result })),
          catchError((ex) => of({ ...props, error: ex })),
          startWith(props),
        ),
      ),
      takeUntil(removeResult$(id)),
    ),
)

// Get all active keys
const resultKeys$ = state(
  keyChange$.pipe(
    toKeySet(),
    map((keys) => [...keys].reverse()),
  ),
  [],
)

// Get specific result
const result$ = state(
  (key: string): Observable<Result> => getSubscription$(key),
  null,
)
```

### `combineKeys()` - Combine Multiple Keyed Observables

```typescript
import { combineKeys } from "@react-rxjs/utils"

const hintedAccounts$ = state(
  combineKeys(
    addrToAccount$.pipe(/* ... */),
    accountDetail$,
  ),
  /* ... */
)
```

### `mergeWithKey()` - Tag Merged Streams

```typescript
import { mergeWithKey } from "@react-rxjs/utils"

const transactions$ = mergeWithKey({ signedTx$, unsignedTx$ }).pipe(
  withLatestFrom(chainClient$),
  mergeMap(([tx, { client }]) => {
    // tx.type is "signedTx$" or "unsignedTx$"
    // tx.payload is the value
  }),
)
```

## Critical Rules

### Rule 1: Factory Arguments Must Be Primitives or Stable References

```typescript
// ❌ Arrays/objects create new references = cache miss = new subscription = infinite loop
const [useHook] = bind((items: Item[]) => getData$(items), [])

// ✅ Serialize to string, parse inside
const [useHook] = bind(
  (itemsKey: string) => getData$(parseItems(itemsKey)),
  []
)
```

### Rule 2: Use `getCachedObservable$` for Internal Caching

When the same observable might be requested with the same parameters, cache it:

```typescript
const getData$ = (key: string) =>
  getCachedObservable$("getData$", key, () =>
    someSource$.pipe(
      switchMap(/* expensive operation */),
    ),
  )
```

### Rule 3: Prefer `state()` + `useStateObservable()` over `bind()`

The `state()` pattern is more explicit and the recommended approach:

```typescript
// Modern pattern
const data$ = state(
  (key: string) => getData$(key),
  null,
)

const Component = ({ key }) => {
  const data = useStateObservable(data$(key))
}
```

### Rule 4: Always Wrap with `Subscribe`

Components using `useStateObservable` must be wrapped in `Subscribe`:

```typescript
// At app root
<Subscribe source$={merge(globalState$)}>
  <App />
</Subscribe>

// Or per-feature with HOC
export const MyFeature = withSubscribe(MyFeatureComponent)
```

### Rule 5: Handle Default Values Properly

Default value can be a function receiving the same args:

```typescript
const [useBalances] = bind(
  (balanceDefsKey: string) => getBalances$(parseKey(balanceDefsKey)),
  (balanceDefsKey): BalancesResult => ({
    data: parseKey(balanceDefsKey).map((bd) => ({
      ...bd,
      balance: undefined,
      isLoading: true,
    })),
    isLoading: true,
  }),
)
```

### Rule 6: Choose Separators Carefully When Serializing IDs

When serializing arrays to strings for `bind()` or `state()` factory functions, **choose separators that cannot appear in the values being joined**:

```typescript
// ❌ WRONG - Token IDs contain "::" (e.g., "pah::asset::1984")
const key = items.map((i) => `${i.address}:${i.tokenId}`).join(",")
// "addr:pah::asset::1984,addr2:kah::native" splits incorrectly!

// ✅ CORRECT - Use separators that won't appear in values
const key = items.map((i) => `${i.address}||${i.tokenId}`).join(",,")
// "addr||pah::asset::1984,,addr2||kah::native" splits correctly!

// Parsing
const parseKey = (key: string) => key.split(",,").map((item) => {
  const [address, tokenId] = item.split("||")
  return { address, tokenId }
})
```

**Common separator patterns:**
- Use `||` as item delimiter (won't appear in addresses or token IDs)
- Use `,,` as array delimiter (won't appear in individual items)
- Never use `:` when values contain `::` (common in Polkadot token IDs)
- Consider URL-safe characters that won't appear in your data

## Migration from `react-rx` (`useObservable`)

If migrating from the `react-rx` package:

```typescript
// Old pattern with react-rx
import { useObservable } from "react-rx"

const data = useObservable(data$, defaultValue)

// New pattern with @react-rxjs/core
import { state, useStateObservable } from "@react-rxjs/core"

const dataState$ = state(data$, defaultValue)
const data = useStateObservable(dataState$)
```

## Debugging

### Enable Observable Logging

```typescript
const withLogs = (msg: string) => <T>(base: Observable<T>): Observable<T> =>
  new Observable((observer) => {
    console.log(`${msg}: subscribed`)
    const sub = base.subscribe({
      next(v) { console.log(`${msg}: next`, v); observer.next(v) },
      error(e) { console.log(`${msg}: error`, e); observer.error(e) },
      complete() { console.log(`${msg}: complete`); observer.complete() },
    })
    return () => { console.log(`${msg}: cleanup`); sub.unsubscribe() }
  })

// Usage
const debuggedData$ = data$.pipe(withLogs("data$"))
```

## Common Patterns from Production (papi-console)

### Pattern: Keyed Results with Removal

```typescript
// State file
export const [newQuery$, addQuery] = createSignal<QueryInput>()
export const [removeResult$, removeResult] = createKeyedSignal<string>()

const [getSubscription$, keyChange$] = partitionByKey(
  newQuery$,
  () => uuid(),
  (src$, id) => src$.pipe(
    switchMap(({ promise, ...props }) =>
      from(promise).pipe(
        map((result) => ({ ...props, result })),
        catchError((ex) => of({ ...props, error: ex })),
        startWith(props),
      ),
    ),
    takeUntil(removeResult$(id)),
  ),
)

export const resultKeys$ = state(
  keyChange$.pipe(toKeySet(), map((keys) => [...keys].reverse())),
  [],
)

export const result$ = state(
  (key: string): Observable<Result> => getSubscription$(key),
  null,
)

// Component
const Results = () => {
  const keys = useStateObservable(resultKeys$)
  return keys.map((key) => <ResultItem key={key} id={key} />)
}

const ResultItem = ({ id }) => {
  const result = useStateObservable(result$(id))
  if (!result) return null
  return <div>{/* render result */}</div>
}
```

### Pattern: Theme/Preferences with Persistence

```typescript
export const [changeTheme$, changeTheme] = createSignal<"light" | "dark">()

changeTheme$.subscribe((theme) => {
  localStorage.setItem("theme", theme)
})

const defaultTheme = localStorage.getItem("theme") as "light" | "dark" || "dark"

const theme$ = state(
  merge(
    fromEvent(window.matchMedia("(prefers-color-scheme: dark)"), "change")
      .pipe(map((evt) => evt.matches ? "dark" : "light")),
    changeTheme$,
  ),
  defaultTheme,
)

export const ThemeProvider = ({ children }) => {
  const theme = useStateObservable(theme$)
  useLayoutEffect(() => {
    document.body.classList.toggle("dark", theme === "dark")
  }, [theme])
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
```

## References

- [@react-rxjs/core documentation](https://react-rxjs.org/)
- [GitHub: re-rxjs/react-rxjs](https://github.com/re-rxjs/react-rxjs)
- [GitHub: polkadot-api/papi-console](https://github.com/polkadot-api/papi-console) - Production example
