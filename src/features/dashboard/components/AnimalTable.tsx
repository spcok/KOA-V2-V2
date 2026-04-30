import React, { useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, createColumnHelper, ExpandedState } from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => {
          const row = info.row;
          const isGroup = row.original.isMobParent;
          const isChild = row.depth > 0;
          
          return (
            <div className={`flex items-center gap-1 sm:gap-2 ${isChild ? 'pl-4' : ''}`}>
              {isChild && <span className="text-slate-300 -ml-2">↳</span>}
              {isGroup && (
                <button
                  onClick={(e) => { e.preventDefault(); row.toggleExpanded(); }}
                  className="p-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-500 shrink-0"
                >
                  {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {row.original.isVirtualMob ? (
                <span className="font-bold text-slate-800">{info.getValue()}</span>
              ) : (
                <Link
                  to="/animals/$animalId"
                  params={{ animalId: row.original.id }}
                  className={`font-black truncate uppercase tracking-tight hover:text-indigo-600 transition-colors ${
                    isGroup ? 'text-slate-800 text-sm sm:text-base' : 'text-slate-700 text-xs sm:text-sm'
                  }`}
                >
                  {info.getValue()}
                </Link>
              )}
              {isGroup && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full ml-1">
                  {row.original.subRows?.length || 0} individuals
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('species', {
        header: () => <span className="hidden xl:table-cell">Species</span>,
        cell: ({ row, getValue }) => (
          <span className="hidden xl:table-cell text-slate-500 text-xs">
            {row.original.isVirtualMob || row.getCanExpand() ? '' : getValue()}
          </span>
        ),
      }),
    ];

    if (activeTab === 'ARCHIVED') {
      cols.push(
        columnHelper.accessor('archived', {
          header: 'Status',
          cell: ({ row }) => (row.getCanExpand() || row.original.isVirtualMob ? '' : <span className="text-xs font-bold text-slate-600">Archived</span>),
        }),
        columnHelper.accessor('archive_reason', {
          header: 'Reason',
          cell: ({ row, getValue }) => (row.getCanExpand() || row.original.isVirtualMob ? '' : <span className="text-xs text-slate-600">{getValue() || '-'}</span>),
        })
      );
    } else {
      if (activeTab !== 'Exotics') {
        cols.push(
          columnHelper.accessor('todayWeight', {
            header: "Today's Weight",
            cell: ({ row }) => {
              if (row.getCanExpand() || row.original.isVirtualMob) return '';
              const log = row.original.todayWeight;
              if (!log) return <span className="text-xs font-bold text-slate-300">-</span>;
              const wg = Number(log.weight_grams);
              if (!isNaN(wg) && wg !== -1 && wg !== 0) return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">{wg}g</span>;
              return <span className="text-xs font-medium text-slate-700">{log.value && log.value !== 'N/A' && log.value !== 'NONE' ? String(log.value) : '-'}</span>;
            },
          })
        );
      }

      cols.push(
        columnHelper.accessor('todayFeedLogs', {
          header: "Today's Feed",
          cell: ({ row }) => {
            if (row.getCanExpand() || row.original.isVirtualMob) return '';
            const logs = row.original.todayFeedLogs;
            if (!logs || logs.length === 0) return <span className="text-xs font-bold text-slate-300">-</span>;
            return (
              <div className="flex flex-col gap-1 min-w-[140px]">
                {logs.map((log: any) => {
                  const qty = log.quantity && log.quantity !== -1 ? log.quantity + 'x ' : '';
                  const food = log.food && log.food !== 'N/A' ? log.food : '';
                  const text = `${qty}${food}`.trim() || log.value || 'Fed';
                  const time = log.feed_time && log.feed_time !== '00:00:00'
                    ? log.feed_time.substring(0, 5)
                    : new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <span key={log.id} className="block leading-tight text-slate-700 font-bold text-[11px] bg-amber-50 border border-amber-100 px-2 py-1 rounded-md w-fit">
                      {text} <span className="text-[9px] text-amber-600/80 font-black ml-1 whitespace-nowrap">@ {time}</span>
                    </span>
                  );
                })}
              </div>
            );
          },
        })
      );

      if (activeTab !== 'Exotics') {
        cols.push(
          columnHelper.accessor('lastFedStr', {
            header: () => <span className="hidden md:table-cell">Last Fed</span>,
            cell: ({ row, getValue }) => (
              <span className="hidden md:table-cell text-[11px] font-bold text-slate-400">
                {row.getCanExpand() || row.original.isVirtualMob ? '' : getValue()}
              </span>
            ),
          })
        );
      }

      cols.push(
        columnHelper.accessor('location', {
          header: () => <span className="hidden md:table-cell">Location</span>,
          cell: ({ row, getValue }) => (
            <span className="hidden md:table-cell text-[10px] font-black tracking-widest uppercase text-slate-500">
              {row.getCanExpand() || row.original.isVirtualMob ? '' : getValue() || 'Unknown'}
            </span>
          ),
        })
      );
    }
    return cols;
  }, [activeTab]);

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
