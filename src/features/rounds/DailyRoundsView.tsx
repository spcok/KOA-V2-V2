import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/db';
import { useQuery } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { ClipboardList, Plus, Loader2 } from 'lucide-react';
import { RoundModal } from './components/RoundModal';

export function DailyRoundsView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>();

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ['daily_rounds'],
    queryFn: async () => {
      const res = await db.query("SELECT * FROM daily_rounds WHERE is_deleted = false ORDER BY round_date DESC, round_time DESC");
      return res.rows;
    }
  });

  const columns = useMemo(() => [
    { accessorKey: 'round_date', header: 'Date', cell: (info: any) => new Date(info.getValue()).toLocaleDateString() },
    { accessorKey: 'round_time', header: 'Time' },
    { accessorKey: 'status', header: 'Status', cell: (info: any) => (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${info.getValue() === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {info.getValue()}
      </span>
    )},
    { accessorKey: 'notes', header: 'Notes', cell: (info: any) => <span className="truncate max-w-[200px] block">{info.getValue() || '-'}</span> }
  ], []);

  const table = useReactTable({ data: rounds, columns, getCoreRowModel: getCoreRowModel() });

  const openModal = (id?: string) => {
    setSelectedRoundId(id);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardList className="text-emerald-500" size={32} /> Daily Rounds
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage and track daily keeper routines</p>
        </div>
        <button onClick={() => openModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm tracking-wide flex items-center gap-2 transition-colors">
          <Plus size={18} /> New Round
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Loader2 size={32} className="text-emerald-500 animate-spin" /></div>
        ) : rounds.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-slate-500 font-medium">No active rounds found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} onClick={() => openModal(row.original.id)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 text-slate-700">
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

      <RoundModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} existingRoundId={selectedRoundId} />
    </div>
  );
}
