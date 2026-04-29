import React, { useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, createColumnHelper, ExpandedState } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface AnimalTableProps {
  animals: any[];
  activeTab: string;
}

const columnHelper = createColumnHelper<any>();

export function AnimalTable({ animals, activeTab }: AnimalTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const data = useMemo(() => {
    const grouped = new Map<string, any[]>();
    const standalone: any[] = [];

    animals.forEach((animal: any) => {
      const pid = animal.parent_mob_id;
      const isFakeParent = !pid || pid === '00000000-0000-0000-0000-000000000000';
      if (!isFakeParent) {
        if (!grouped.has(pid)) grouped.set(pid, []);
        grouped.get(pid)!.push(animal);
      } else {
        standalone.push(animal);
      }
    });

    const finalData: any[] = [];

    standalone.forEach((animal) => {
      const children = grouped.get(animal.id);
      if (children && children.length > 0) {
        finalData.push({ ...animal, isMobParent: true, subRows: children });
        grouped.delete(animal.id);
      } else {
        finalData.push(animal);
      }
    });

    Array.from(grouped.values()).forEach((orphans) => finalData.push(...orphans));
    return finalData;
  }, [animals]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Animal / Mob',
      cell: (info) => {
        const row = info.row;
        const isGroup = row.original.isMobParent;
        const isChild = row.depth > 0;
        
        return (
          <div className="flex items-center gap-1 sm:gap-2">
            {isChild ? <div className="w-2 sm:w-4 border-b-2 border-l-2 border-slate-300 h-4 sm:h-6 -mt-2 sm:-mt-4 ml-1 sm:ml-2 rounded-bl-lg shrink-0" /> : null}
            {isGroup ? (
              <button
                onClick={(e) => { e.preventDefault(); row.toggleExpanded(); }}
                className="p-0.5 sm:p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-500 shrink-0"
              >
                {row.getIsExpanded() ? <ChevronDown size={14} className="sm:w-4 sm:h-4" /> : <ChevronRight size={14} className="sm:w-4 sm:h-4" />}
              </button>
            ) : null}
            <Link
              to="/animals/$animalId"
              params={{ animalId: row.original.id }}
              className={`font-black truncate uppercase tracking-tight hover:text-indigo-600 transition-colors ${
                isGroup ? 'text-slate-800 text-sm sm:text-base cursor-pointer' : 'text-slate-700 text-xs sm:text-sm cursor-pointer'
              } ${isChild ? 'text-[10px] sm:text-xs text-slate-600' : ''}`}
            >
              {info.getValue()}
            </Link>
          </div>
        );
      },
    }),
    columnHelper.accessor('species', {
      header: 'Species',
      cell: (info) => <div className={`truncate max-w-[100px] sm:max-w-none text-[10px] sm:text-xs ${info.row.depth > 0 ? 'text-slate-400 italic' : 'font-bold text-slate-500'}`}>{info.getValue()}</div>,
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: (info) => <div className="text-[10px] sm:text-xs text-slate-500 font-medium">{info.getValue() || '-'}</div>,
    }),
    columnHelper.accessor('gender', {
      header: 'Sex',
      cell: (info) => <div className="text-[10px] sm:text-xs text-slate-500 capitalize">{info.getValue() || '-'}</div>,
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      cell: (info) => <div className={`truncate max-w-[80px] sm:max-w-none text-[10px] sm:text-xs font-black uppercase tracking-widest ${info.row.depth > 0 ? 'text-slate-300' : 'text-slate-400'}`}>{info.getValue()}</div>,
    }),
    columnHelper.display({
      id: 'flags',
      header: 'Flags',
      cell: (info) => {
        const animal = info.row.original;
        return (
          <div className="flex gap-1">
             {animal.is_venomous && <span className="bg-red-100 text-red-800 p-0.5 rounded" title="Venomous"><AlertTriangle size={12}/></span>}
             {animal.is_boarding && <span className="bg-orange-100 text-orange-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Boarding</span>}
             {animal.is_quarantine && <span className="bg-purple-100 text-purple-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Quarantine</span>}
          </div>
        )
      }
    })
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {table.getFlatHeaders().map((header) => (
              <th key={header.id} className="px-2 py-3 lg:px-4 lg:py-4 text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 sticky top-0 z-10">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => {
            const isGroupHeader = row.original.isMobParent;
            return (
              <tr 
                key={row.id} 
                className={`transition-colors hover:bg-slate-50 ${isGroupHeader ? 'bg-slate-50/50' : ''} ${row.depth > 0 ? 'bg-slate-50/30' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`px-2 py-3 lg:px-4 lg:py-4 text-xs ${isGroupHeader ? 'py-3 lg:py-4' : ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
