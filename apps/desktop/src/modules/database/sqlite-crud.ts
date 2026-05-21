import type Database from 'better-sqlite3';

/**
 * Thin functional helpers for the SQLite CRUD shape shared by the
 * better-sqlite3-backed domain services (library, diary, ...).
 *
 * These are intentionally NOT a base class: NestJS DI plus per-table
 * column maps make an abstract service awkward. Each service keeps its
 * own explicit column→field map and `rowToEntry` mapper; only the
 * mechanics (select-all / select-by-id / delete / dynamic UPDATE) live here.
 */

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ORDER_BY_RE = /^[A-Za-z_][A-Za-z0-9_]*(\s+(ASC|DESC))?$/i;

function assertIdentifier(value: string, label: string): void {
  if (!IDENTIFIER_RE.test(value)) {
    throw new Error(`Invalid SQL identifier for ${label}: "${value}"`);
  }
}

function assertOrderBy(value: string): void {
  if (!ORDER_BY_RE.test(value)) {
    throw new Error(`Invalid SQL ORDER BY clause: "${value}"`);
  }
}

/** A value that can be bound to a prepared statement parameter. */
export type SqlValue = string | number | null;

/**
 * Describes how a single updatable domain field maps onto a table column.
 *
 * `transform` converts the domain value into a SQL-bindable value (e.g.
 * serializing arrays to JSON or coercing booleans to 0/1). When omitted the
 * value is bound as-is.
 */
export interface FieldSpec<V> {
  column: string;
  transform?: (value: V) => SqlValue;
}

/**
 * Maps each updatable field of an update payload to its column/transform.
 *
 * Iteration order is preserved (insertion order), so the generated SET clause
 * order matches the field declaration order — keep this aligned with the
 * column order you want in the emitted SQL. A field without a `transform` must
 * already be a SQL-bindable value (`SqlValue`).
 */
export type FieldMap<U> = {
  [K in keyof U]-?: [Exclude<U[K], undefined>] extends [SqlValue]
    ? FieldSpec<Exclude<U[K], undefined>>
    : Required<FieldSpec<Exclude<U[K], undefined>>>;
};

/** Result of building a dynamic UPDATE statement. */
export interface BuiltUpdate {
  sql: string;
  values: SqlValue[];
}

/** Fetch all rows of a table and map them to the domain type. */
export function getAll<R, T>(
  db: Database.Database,
  table: string,
  mapper: (row: R) => T,
  orderBy?: string
): T[] {
  assertIdentifier(table, 'table');
  if (orderBy !== undefined) assertOrderBy(orderBy);
  const sql = orderBy ? `SELECT * FROM ${table} ORDER BY ${orderBy}` : `SELECT * FROM ${table}`;
  const rows = db.prepare(sql).all() as R[];
  return rows.map(mapper);
}

/** Fetch a single row by primary key, mapped to the domain type. */
export function getById<R, T>(
  db: Database.Database,
  table: string,
  id: number,
  mapper: (row: R) => T
): T | undefined {
  assertIdentifier(table, 'table');
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as R | undefined;
  return row ? mapper(row) : undefined;
}

/** Delete a row by primary key. Returns true if a row was removed. */
export function deleteById(db: Database.Database, table: string, id: number): boolean {
  assertIdentifier(table, 'table');
  const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return result.changes > 0;
}

/**
 * Build a dynamic `UPDATE` statement from a partial update payload.
 *
 * Only fields present (`!== undefined`) in `updates` and described in
 * `fieldMap` produce SET clauses. The `updated_at` column is always touched
 * with `datetime('now')` and the statement is scoped by `WHERE id = ?` (the
 * id is appended as the final bind value).
 *
 * Returns `null` when no updatable field was supplied, letting the caller skip
 * the write entirely (matching the previous per-service no-op behavior).
 */
export function buildUpdate<U extends Record<string, unknown>>(
  table: string,
  updates: U,
  fieldMap: FieldMap<U>,
  id: number
): BuiltUpdate | null {
  assertIdentifier(table, 'table');
  const setClauses: string[] = [];
  const values: SqlValue[] = [];

  for (const key of Object.keys(fieldMap) as (keyof U)[]) {
    const value = updates[key];
    if (value === undefined) continue;

    const spec = fieldMap[key] as FieldSpec<U[keyof U]>;
    assertIdentifier(spec.column, 'column');
    setClauses.push(`${spec.column} = ?`);
    values.push(spec.transform ? spec.transform(value) : (value as SqlValue));
  }

  if (setClauses.length === 0) {
    return null;
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  return {
    sql: `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`,
    values,
  };
}
