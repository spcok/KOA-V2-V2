import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../lib/db';
import { Loader2, Play, AlertCircle, Table as TableIcon } from 'lucide-react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

const MODULES = [
  { id: 'animals', label: 'Animals Vault' },
  { id: 'daily_logs', label: 'Daily Logs' },
  { id: 'daily_rounds', label: 'Daily Rounds' },
  { id: 'users', label: 'Staff Users' },
  { id: 'feeding_schedules', label: 'Schedules' }
];

export function DatabaseHarness() {
  const [selectedTable, setSelectedTable] = useState(MODULES[0].id);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState(0);

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await db.query(`SELECT * FROM ${selectedTable} ORDER BY created_at DESC LIMIT 100`);
      setData(res.rows || []);
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
      setData([]);
    } finally {
      const end = performance.now();
      setQueryTime(Math.round(end - start));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [selectedTable]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).map((key) => ({
      id: key,
      accessorKey: key,
      header: key,
      cell: (info: any) => {
        let val = info.getValue();
        let displayClass = "text-slate-700";
        if (val === null) {
          val = "NULL";
          displayClass = "text-slate-300 italic";
        } else if (typeof val === 'boolean') {
          val = val ? 'TRUE' : 'FALSE';
          displayClass = val === 'TRUE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
        } else if (key.includes('id') || key.includes('uuid')) {
          displayClass = "text-blue-600 font-mono text-[10px]";
        }
        return <span className={displayClass}>{String(val)}</span>;
      }
    }));
  }, [data]);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Module Button Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MODULES.map(mod => (
          <button
            key={mod.id}
            onClick={() => setSelectedTable(mod.id)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedTable === mod.id ? 'border-amber-500 bg-amber-50 shadow-md transform -translate-y-0.5' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'}`}
          >
            <TableIcon className={selectedTable === mod.id ? 'text-amber-600 mb-2' : 'text-slate-400 mb-2'} size={24} />
            <span className={`text-sm font-bold ${selectedTable === mod.id ? 'text-amber-900' : 'text-slate-600'}`}>{mod.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">
          {data.length} Rows Returned <span className="mx-2">|</span> {queryTime}ms Execution
        </div>
        <button onClick={fetchTableData} disabled={loading} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Refresh Vault
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 mt-0.5" size={18} />
          <div><h3 className="text-sm font-bold text-red-800">Query Failed</h3><p className="text-sm text-red-600 font-mono mt-1">{error}</p></div>
        </div>
      )}

      {/* TanStack Table Render */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-[400px]">
        {loading && data.length === 0 ? (
          <div className="h-full flex items-center justify-center p-12"><Loader2 size={32} className="text-amber-500 animate-spin" /></div>
        ) : data.length === 0 && !error ? (
          <div className="h-full flex items-center justify-center p-12 text-slate-400 text-sm font-medium">No records found in {selectedTable}.</div>
        ) : (
          <div className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-r border-slate-200 last:border-0 bg-slate-100">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-2 border-r border-slate-100 last:border-0 max-w-[300px] truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
