export * from "./schema";
export { db, getDb } from "./client";
// Re-export commonly used drizzle-orm helpers so consumers don't import a
// different instance (avoids "separate declarations of private property" errors
// in monorepos with multiple peer-dep-resolved copies of drizzle-orm).
export { eq, and, or, sql, count, gte, lte, gt, lt, ne, isNull, isNotNull, desc, asc, inArray, notInArray } from "drizzle-orm";
