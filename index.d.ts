/// <reference path="./triggers.d.ts" />

type valueOf<T, K extends keyof T> = T[K][keyof T[K]];
