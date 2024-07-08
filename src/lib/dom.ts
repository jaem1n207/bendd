export function querySelector<T extends string>(query: T): QueryResult<T> {
  return document.querySelector(query) as QueryResult<T>;
}

export function querySelectorAll<T extends string>(query: T): QueryResult<T>[] {
  return Array.from(document.querySelectorAll(query)) as QueryResult<T>[];
}
