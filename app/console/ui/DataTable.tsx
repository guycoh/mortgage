"use client";

// One table for the whole console: sort, search, page, export.
//
// TanStack Table is headless — it owns the row model and nothing else, so the
// markup below is ours and inherits the panel's type scale instead of fighting
// a component library's. Search is a plain substring match across the rendered
// text of every column, which is what someone actually means when they type a
// client's name into a monitoring panel.

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "start" | "end" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === "start" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Flatten a row to the words a person would search for. */
function haystack(row: unknown): string {
  if (row == null) return "";
  if (typeof row !== "object") return String(row);
  return Object.values(row as Record<string, unknown>)
    .map((v) =>
      v == null
        ? ""
        : Array.isArray(v)
          ? v.map((x) => (typeof x === "object" ? "" : String(x))).join(" ")
          : typeof v === "object"
            ? ""
            : String(v)
    )
    .join(" ")
    .toLowerCase();
}

/**
 * Export what the table currently holds — the filter and the sort included,
 * because "export" means "this, in a spreadsheet", not "everything".
 *
 * Values are pulled through the column model rather than off the raw object,
 * so a column defined by an accessor function exports the same number it
 * shows instead of an empty cell.
 */
function toCsv(table: ReturnType<typeof useReactTable<any>>): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join(" · ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = table.getVisibleLeafColumns();
  const lines = [
    cols
      .map((c) => cell(typeof c.columnDef.header === "string" ? c.columnDef.header : c.id))
      .join(","),
  ];
  for (const row of table.getSortedRowModel().rows) {
    lines.push(cols.map((c) => cell(row.getValue(c.id))).join(","));
  }
  // A BOM so Excel opens Hebrew as UTF-8 instead of mojibake — this file is
  // going to be opened in Excel roughly always.
  return "﻿" + lines.join("\n");
}

export default function DataTable<T>({
  data,
  columns,
  empty,
  searchPlaceholder,
  pageSize = 12,
  onRowClick,
  csvName,
  maxHeight,
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  empty: React.ReactNode;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  csvName?: string;
  maxHeight?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => haystack(r).includes(q));
  }, [data, query]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const download = () => {
    const blob = new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName ?? "console"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = table.getRowModel().rows;
  const page = table.getState().pagination.pageIndex;
  const pages = table.getPageCount();

  return (
    <>
      {searchPlaceholder || csvName ? (
        <div className="cns-tools">
          {searchPlaceholder ? (
            <div className="cns-search">
              <IconSearch />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  table.setPageIndex(0);
                }}
                placeholder={searchPlaceholder}
                spellCheck={false}
              />
            </div>
          ) : null}
          {csvName ? (
            <button type="button" className="cns-btn" onClick={download} style={{ marginInlineStart: "auto" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 4v11m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 19h16" strokeLinecap="round" />
              </svg>
              CSV
            </button>
          ) : null}
        </div>
      ) : null}

      {!data.length ? (
        empty
      ) : !rows.length ? (
        <div className="cns-empty" style={{ padding: "34px 10px" }}>
          <p>אין תוצאות ל״{query}״</p>
        </div>
      ) : (
        <div
          className="cns-tbl-wrap"
          style={maxHeight ? ({ "--tbl-max": `${maxHeight}px` } as React.CSSProperties) : undefined}
        >
          <table className="cns-tbl">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const sortable = h.column.getCanSort();
                    const dir = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        onClick={sortable ? h.column.getToggleSortingHandler() : undefined}
                        data-sortable={sortable || undefined}
                        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span className="cns-sort">{dir === "asc" ? "↑" : dir === "desc" ? "↓" : ""}</span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  data-click={onRowClick ? "" : undefined}
                  onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                >
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="cns-foot">
          <span className="num">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} מתוך {filtered.length}
          </span>
          <div className="cns-pager">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="הקודם"
            >
              <Chevron dir="end" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="הבא"
            >
              <Chevron dir="start" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
