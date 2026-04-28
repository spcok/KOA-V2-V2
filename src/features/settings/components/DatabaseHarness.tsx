import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../lib/db';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

const TABLES = ['animals', 'daily_logs', 'users', 'feeding_schedules'];

export function DatabaseHarness() {
  const [selectedTable, setSelectedTable] = useState(TABLES[0]);
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

  // Dynamically generate TanStack columns based on the data keys
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
          displayClass = "text-blue-600";
        }
        
        return <span className={displayClass}>{String(val)}</span>;
      }
    }));
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Target Table</label>
          <select 
            value={selectedTable} 
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          >
            {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button 
          onClick={fetchTableData}
          disabled={loading}
          className="mt-5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Execute Query
        </button>
      </div>

      {/* Results Meta */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">
          {data.length} Rows Returned
        </div>
        <div className="text-xs font-mono text-slate-400">
          Execution Time: {queryTime}ms
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h3 className="text-sm font-bold text-red-800">Query Failed</h3>
            <p className="text-sm text-red-600 font-mono mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-[400px]">
        {loading && data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center p-12">
            <Loader2 size={32} className="text-amber-500 animate-spin opacity-50" />
          </div>
        ) : data.length === 0 && !error ? (
          <div className="h-full w-full flex items-center justify-center p-12 text-slate-400 text-sm font-medium">
            No records found in {selectedTable}.
          </div>
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
                      <td key={cell.id} className="px-3 py-2 border-r border-slate-100 last:border-0 max-w-[250px] truncate">
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
