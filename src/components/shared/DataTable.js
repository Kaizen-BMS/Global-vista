"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

/**
 * Generic table shell: sticky header, per-column resize (drag the right
 * edge), a column-visibility menu (persisted per tableId), sortable headers,
 * and an optional right-click row context menu. Callers supply column defs
 * with a `render(row)` function — DataTable owns all the chrome, callers own
 * only what a cell looks like.
 */
export default function DataTable({
  tableId, columns, rows, rowKey = "id",
  sortKey, sortDir, onSort,
  rowContextMenuItems, onRowClick,
  leadingColumn, // optional { width, render(row) } for a checkbox column, rendered unhideable
}) {
  const [colWidths, setColWidths] = useLocalStorageState(`gv:table:${tableId}:widths`, {});
  const [hiddenCols, setHiddenCols] = useLocalStorageState(`gv:table:${tableId}:hidden`, []);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, row }
  const columnMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const resizingRef = useRef(null);

  const onResizeMove = useCallback((e) => {
    const r = resizingRef.current;
    if (!r) return;
    const next = Math.max(r.minWidth || 60, r.startWidth + (e.clientX - r.startX));
    setColWidths((w) => ({ ...w, [r.key]: next }));
  }, [setColWidths]);

  const onResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
  }, [onResizeMove]);

  function startResize(e, key, currentWidth, minWidth) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth, minWidth };
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
  }

  useEffect(() => {
    function onClick(e) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) setColumnMenuOpen(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenu(null);
    }
    function onKey(e) { if (e.key === "Escape") { setColumnMenuOpen(false); setContextMenu(null); } }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  function handleContextMenu(e, row) {
    if (!rowContextMenuItems) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row });
  }

  const visibleColumns = columns.filter((c) => c.hideable === false || !hiddenCols.includes(c.key));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-end px-2 py-1.5 border-b border-border">
        <div className="relative" ref={columnMenuRef}>
          <button
            type="button"
            onClick={() => setColumnMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition"
          >
            <Settings2 className="h-3.5 w-3.5" /> Columns
          </button>
          {columnMenuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-popover border border-border rounded-lg shadow-2xl z-30 p-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {columns.filter((c) => c.hideable !== false).map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.includes(c.key)}
                    onChange={() => setHiddenCols((h) => (h.includes(c.key) ? h.filter((k) => k !== c.key) : [...h, c.key]))}
                    className="cursor-pointer"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="text-left text-muted-foreground border-b border-border">
              {leadingColumn && <th style={{ width: leadingColumn.width || 36 }} className="px-4 py-3">{leadingColumn.headerRender?.()}</th>}
              {visibleColumns.map((c) => {
                const width = colWidths[c.key] || c.width || 150;
                return (
                  <th key={c.key} style={{ width }} className="relative px-4 py-3 select-none group/th">
                    <div
                      className={`flex items-center gap-1 ${c.sortable ? "cursor-pointer hover:text-foreground" : ""}`}
                      onClick={() => c.sortable && onSort?.(c.key)}
                    >
                      <span className="truncate">{c.label}</span>
                      {c.sortable && (
                        sortKey === c.key
                          ? (sortDir === "ASC" ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />)
                          : <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover/th:opacity-40" />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => startResize(e, c.key, width, c.minWidth)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-indigo-500/40 transition-colors"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[rowKey]}
                onContextMenu={(e) => handleContextMenu(e, row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {leadingColumn && <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>{leadingColumn.render(row)}</td>}
                {visibleColumns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-foreground/90 truncate">{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y }}
          className="z-50 w-48 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden p-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {rowContextMenuItems(contextMenu.row).map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { item.onClick(); setContextMenu(null); }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs cursor-pointer transition-colors ${item.danger ? "text-red-400 hover:bg-red-500/10" : "text-popover-foreground hover:bg-accent"}`}
            >
              {item.icon && <item.icon className="h-3.5 w-3.5" />} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
