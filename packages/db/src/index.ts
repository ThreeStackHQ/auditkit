export * from "./schema";
export * from "./client";

// Re-export drizzle helpers so consumers don't get dual-version type conflicts
export {
  eq,
  and,
  or,
  not,
  gt,
  gte,
  lt,
  lte,
  ne,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  sql,
  count,
  sum,
  avg,
  max,
  min,
  desc,
  asc,
  relations,
  between,
  like,
  ilike,
} from "drizzle-orm";
