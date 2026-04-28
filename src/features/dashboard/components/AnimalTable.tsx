import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  ExpandedState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

    // Add standalone animals and attach subRows if they act as a parent
    standalone.forEach((animal) => {
      const children = grouped.get(animal.id);
      if (children && children.length > 0) {
        finalData.push({ ...animal, isMobParent: true, subRows: children });
        grouped.delete(animal.id);
      } else {
        finalData.push(animal);
      }
    });

    // Handle "Virtual" parents (children whose parent isn't in the current tab/filter)
    Array.from(grouped.entries()).forEach(([pid, children]) => {
      finalData.push({
        id: `virtual-${pid}`,
        name: 'Grouped Mob',
        isVirtualMob: true,
        subRows: children,
      });
    });

    return finalData;
  }, [animals]);

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row, getValue }) => {
          if (row.getCanExpand() || row.original.isVirtualMob) {
            return (
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={row.getToggleExpandedHandler()}
              >
                {row.getIsExpanded() ? (
                  <ChevronDown size={16} className="text-slate-500" />
                ) : (
                  <ChevronRight size={16} className="text-slate-500" />
                )}
                <span className="font-bold text-slate-800">{getValue()}</span>
                <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                  {row.original.subRows?.length || 0} individuals
                </span>
              </div>
            );
          }
          return (
            <div className={`font-bold text-slate-900 ${row.depth > 0 ? 'pl-6 flex items-center gap-2' : ''}`}>
              {row.depth > 0 && <span className="text-slate-300">↳</span>}
              {getValue()}
            </div>
          );
        },
      }),
      columnHelper.accessor('species', {
        header: () => <span className="hidden xl:table-cell">Species</span>,
        cell: ({ row, getValue }) => (
          <span className="hidden xl:table-cell text-slate-500">
            {row.original.isVirtualMob || row.getCanExpand() ? '' : getValue()}
          </span>
        ),
      }),
    ];

    if (activeTab === 'ARCHIVED') {
      cols.push(
        columnHelper.accessor('status', {
          header: 'Status',
          cell: ({ row }) => (row.getCanExpand() || row.original.isVirtualMob ? '' : 'Archived'),
        }),
        columnHelper.accessor('archive_reason', {
          header: 'Reason',
          cell: ({ row, getValue }) => (row.getCanExpand() || row.original.isVirtualMob ? '' : getValue() || '-'),
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
              if (!log) return '-';
              const wg = Number(log.weight_grams);
              if (!isNaN(wg) && wg !== -1 && wg !== 0) return `${wg}g`;
              return log.value && log.value !== 'N/A' && log.value !== 'NONE' ? String(log.value) : '-';
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
            if (!logs || logs.length === 0) return '-';
            return (
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                {logs.map((log: any) => {
                  const qty = log.quantity && log.quantity !== -1 ? log.quantity + 'x ' : '';
                  const food = log.food && log.food !== 'N/A' ? log.food : '';
                  const text = `${qty}${food}`.trim() || log.value || 'Fed';
                  const time = log.feed_time && log.feed_time !== '00:00:00'
                    ? log.feed_time.substring(0, 5)
                    : new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <span key={log.id} className="block whitespace-normal break-words leading-tight text-slate-700 font-medium text-xs">
                      {text} <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">@ {time}</span>
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
              <span className="hidden md:table-cell text-slate-400">
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
            <span className="hidden md:table-cell text-emerald-500">
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
    <div className="w-full overflow-x-auto overflow-y-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-white border-b border-slate-200 text-slate-600 font-medium">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => {
            const isGroupHeader = row.getCanExpand() || row.original.isVirtualMob;
            return (
              <tr
                key={row.id}
                className={`transition-colors ${
                  isGroupHeader ? 'bg-slate-100/50 border-y border-slate-200 hover:bg-slate-100' : 'hover:bg-slate-50'
                } ${row.depth > 0 ? 'bg-slate-50/30' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs ${
                      isGroupHeader ? 'py-3 lg:py-4' : ''
                    }`}
                    colSpan={isGroupHeader && cell.column.id === 'name' ? columns.length : 1}
                  >
                    {isGroupHeader && cell.column.id !== 'name'
                      ? null
                      : flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-400 text-sm">
                No active animals found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
