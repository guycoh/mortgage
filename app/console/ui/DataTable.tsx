"use client";

// One table for the whole console: sort, search, filter, page, export.
//
// TanStack Table owns the row model and nothing else; the markup is shadcn's
// Table, so the type scale, borders and hover states are the same ones every
// other surface here uses. Search is a plain substring match over the rendered
// text of every column, which is what someone means when they type a client's
// name into a monitoring panel.

import { Fragment, useMemo, useState } from "react";
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
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./kit";

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
 * Export what the table currently holds — filter and sort included, because
 * "export" means "this, in a spreadsheet", not "everything".
 *
 * Values come through the column model rather than off the raw object, so a
 * column defined by an accessor function exports the number it displays
 * instead of an empty cell.
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
  // A BOM so Excel opens Hebrew as UTF-8 rather than mojibake — this file is
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
  maxHeight = 560,
  toolbar,
  groupBy,
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  empty: React.ReactNode;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  csvName?: string;
  maxHeight?: number;
  /** Filters the parent owns — they sit in the same row as the search box. */
  toolbar?: React.ReactNode;
  /**
   * Turns the table into a journal: whenever this key changes between two
   * consecutive rows, a labelled rule is drawn across the table. A log of
   * things that happened wants to be read in days, not as an undifferentiated
   * run of 200 rows.
   */
  groupBy?: (row: T) => string;
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
    <div className="flex min-w-0 flex-col">
      {searchPlaceholder || toolbar || csvName ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-cns-line px-4 pb-3">
          {searchPlaceholder ? (
            <div className="relative w-full max-w-[260px]">
              <Search className="pointer-events-none absolute inset-inline-start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-cns-mutedfg" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  table.setPageIndex(0);
                }}
                placeholder={searchPlaceholder}
                spellCheck={false}
                className="ps-8"
              />
            </div>
          ) : null}
          {toolbar}
          {csvName ? (
            <Button variant="ghost" size="sm" onClick={download}>
              <Download />
              CSV
            </Button>
          ) : null}
          <span className="cns-num ms-auto text-[11px] text-cns-mutedfg">
            {filtered.length}
          </span>
        </div>
      ) : null}

      {!data.length ? (
        empty
      ) : !rows.length ? (
        <div className="px-4 py-12 text-center text-[12.5px] text-cns-mutedfg">
          אין תוצאות ל״{query}״
        </div>
      ) : (
        <div className="min-w-0 overflow-auto" style={{ maxHeight }}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((h) => {
                    const sortable = h.column.getCanSort();
                    const dir = h.column.getIsSorted();
                    return (
                      <TableHead
                        key={h.id}
                        aria-sort={
                          dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined
                        }
                        className={sortable ? "cursor-pointer hover:text-cns-fg" : undefined}
                        onClick={sortable ? h.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === "asc" ? (
                            <ArrowUp className="size-3 text-cns-accent" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="size-3 text-cns-accent" />
                          ) : null}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                const group = groupBy?.(r.original);
                const newGroup = group != null && group !== (i > 0 ? groupBy?.(rows[i - 1].original) : null);
                return (
                  <Fragment key={r.id}>
                    {newGroup ? (
                      <tr aria-hidden className="bg-cns-muted/60">
                        <td
                          colSpan={r.getVisibleCells().length}
                          className="border-y border-cns-line px-3 py-1 font-[family-name:var(--cns-mono)] text-[10px] tracking-[0.12em] text-cns-mutedfg uppercase"
                        >
                          {group}
                        </td>
                      </tr>
                    ) : null}
                    <TableRow
                      className={onRowClick ? "cursor-pointer" : undefined}
                      onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                    >
                      {r.getVisibleCells().map((c) => (
                        <TableCell key={c.id}>
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center gap-2 border-t border-cns-line px-4 py-2.5 text-[11.5px] text-cns-mutedfg">
          <span className="cns-num">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} מתוך{" "}
            {filtered.length}
          </span>
          <div className="ms-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="הקודם"
            >
              <ChevronRight />
            </Button>
            <span className="cns-num px-1">
              {page + 1}/{pages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="הבא"
            >
              <ChevronLeft />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
