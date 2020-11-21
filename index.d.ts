/// <reference path="./triggers.d.ts" />

//extracts value from type T given key K
type valueOf<T, K extends keyof T> = T[K];

type InstType<T extends { prototype: any }> = T["prototype"];

type StatementType = "test" | "death" | "positive test";