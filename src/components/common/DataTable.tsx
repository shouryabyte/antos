import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";

export function DataTable<T>({ data, columns }: { data:T[]; columns:ColumnDef<T>[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel:getCoreRowModel() });
  return <div className="table-scroll rounded-2xl border border-slate-200 bg-white">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        {table.getHeaderGroups().map(hg => <tr key={hg.id}>{hg.headers.map(h => <th key={h.id} className="whitespace-nowrap px-4 py-3 font-bold">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}
      </thead>
      <tbody className="divide-y divide-slate-100">
        {table.getRowModel().rows.map(row => <tr key={row.id} className="hover:bg-slate-50/70">{row.getVisibleCells().map(cell => <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-slate-700">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
      </tbody>
    </table>
  </div>;
}
