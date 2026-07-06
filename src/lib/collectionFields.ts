/**
 * Browser-safe helpers for presenting and editing a v2 collection's typed
 * fields (dense `vector`, `sparse`, `multi_vector`). Pure functions — no server
 * imports — shared across the collection pages.
 */

import { formatSpaceType } from "@/api/client"
import type { FieldDefinition, FieldValue, SparseValue } from "@/api/client"

// ── presentation ─────────────────────────────────────────────────────────────

export const FIELD_TYPE_LABEL: Record<string, string> = {
  vector: "Dense",
  sparse: "Sparse",
  multi_vector: "Multi-Vector",
}

export const FIELD_TYPE_BADGE: Record<string, string> = {
  vector: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
  sparse: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
  multi_vector: "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
}

export const typeLabel = (type?: string): string =>
  FIELD_TYPE_LABEL[type ?? ""] ?? (type || "Field")

export const typeBadge = (type?: string): string =>
  FIELD_TYPE_BADGE[type ?? ""] ??
  "bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200"

/** Sparse model for a sparse field (server nests it under `params`). */
export function sparseModel(field: FieldDefinition): string | undefined {
  return (field.params?.sparse_model ?? field.sparse_model) as string | undefined
}

/** Dimension of a (multi-)vector field, if known. */
export function fieldDimension(field: FieldDefinition): number | undefined {
  const d = field.params?.dimension
  return typeof d === "number" ? d : undefined
}

/** A short, human-readable spec line for one field (dim · space · precision …). */
export function fieldSpec(field: FieldDefinition): string {
  const p = field.params ?? {}
  if (field.type === "sparse") {
    const model = sparseModel(field)
    return model ? `model: ${model}` : "sparse"
  }
  const parts: string[] = []
  if (p.dimension != null) parts.push(`${p.dimension}d`)
  if (p.space_type) parts.push(formatSpaceType(String(p.space_type)))
  if (p.precision) parts.push(String(p.precision))
  if (field.type === "multi_vector" && p.pooling) parts.push(`${p.pooling} pooling`)
  return parts.join(" · ")
}

/** Distinct field types present, in a stable display order. */
export function fieldTypes(fields: FieldDefinition[]): string[] {
  const order = ["vector", "sparse", "multi_vector"]
  const present = new Set((fields ?? []).map((f) => f.type))
  return order.filter((t) => present.has(t as FieldDefinition["type"]))
}

// ── value parsing (string inputs → FieldValue) ────────────────────────────────

/** Parse a comma-separated list like `0.1, 0.2, 0.3` into a dense vector. */
export function parseDense(input: string): number[] {
  const arr = JSON.parse(`[${input}]`)
  if (
    !Array.isArray(arr) ||
    arr.length === 0 ||
    arr.some((n) => typeof n !== "number" || !Number.isFinite(n))
  ) {
    throw new Error("expected a non-empty comma-separated list of numbers")
  }
  return arr
}

/**
 * Parse a multi-vector: either JSON `[[...],[...]]` or one comma-separated
 * vector per line.
 */
export function parseMulti(input: string): number[][] {
  const trimmed = input.trim()
  let rows: unknown
  if (trimmed.startsWith("[")) {
    rows = JSON.parse(trimmed)
  } else {
    rows = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(`[${line}]`))
  }
  if (
    !Array.isArray(rows) ||
    rows.length === 0 ||
    !rows.every(
      (r) =>
        Array.isArray(r) &&
        r.length > 0 &&
        r.every((n) => typeof n === "number" && Number.isFinite(n))
    )
  ) {
    throw new Error("expected an array of equal-length numeric vectors")
  }
  return rows as number[][]
}

/** Parse parallel sparse indices / values strings into a SparseValue. */
export function parseSparse(indices: string, values: string): SparseValue {
  const idx = JSON.parse(`[${indices}]`) as number[]
  const val = JSON.parse(`[${values}]`) as number[]
  if (!Array.isArray(idx) || !Array.isArray(val)) {
    throw new Error("sparse indices and values must both be numeric lists")
  }
  if (idx.length !== val.length) {
    throw new Error("sparse indices and values must have the same length")
  }
  return { indices: idx, values: val }
}

/** Parse a field's raw text input(s) into the FieldValue for its type. */
export function parseFieldValue(
  field: FieldDefinition,
  raw: { value: string; sparseIndices?: string; sparseValues?: string }
): FieldValue {
  if (field.type === "vector") return parseDense(raw.value)
  if (field.type === "multi_vector") return parseMulti(raw.value)
  return parseSparse(raw.sparseIndices ?? "", raw.sparseValues ?? "")
}
