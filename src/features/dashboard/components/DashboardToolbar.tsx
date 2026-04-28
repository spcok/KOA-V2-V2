import React, { useState } from 'react';
import { Calendar as CalendarIcon, ArrowUpDown, Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { AddAnimalModal } from '../../animals/components/AddAnimalModal';
import { useDashboardStore, CategoryFilter } from '../../../store/dashboardStore';

const tabs: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Owls', value: 'OWL' },
  { label: 'Raptors', value: 'RAPTOR' },
  { label: 'Mammals', value: 'MAMMAL' },
  { label: 'Exotics', value: 'EXOTICS' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export function DashboardToolbar() {
  const [isAddAnimalModalOpen, setIsAddAnimalModalOpen] = useState(false);
  const { viewingDate, sortOrder, categoryFilter, setCategoryFilter, shiftDate, resetToToday, toggleSortOrder } = useDashboardStore();

  const formattedDate = viewingDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Top Controls Row */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex justify-center items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Viewing Date:</span>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden text-xs">
            <button onClick={() => shiftDate(-1)} className="px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 font-medium text-slate-700">← Prev</button>
            <span className="px-4 py-1.5 font-semibold text-slate-800">{formattedDate}</span>
            <button className="px-3 py-1.5 border-l border-r border-slate-200 hover:bg-slate-50"><CalendarIcon className="w-3.5 h-3.5 text-slate-500" /></button>
            <button onClick={() => shiftDate(1)} className="px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 font-medium text-slate-700">Next →</button>
            <button onClick={() => resetToToday()} className="px-3 py-1.5 hover:bg-slate-50 font-medium text-slate-700">Today</button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <button onClick={toggleSortOrder} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            Name ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
          </button>

          <button 
            onClick={() => setIsAddAnimalModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 border border-blue-700 rounded-md shadow-sm text-xs font-semibold text-white hover:bg-blue-700 ml-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entity
          </button>
        </div>

        {/* Category Filters Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center justify-between text-sm font-semibold text-slate-500 bg-white/50 rounded-full border border-slate-200 overflow-hidden shadow-sm p-1">
            {tabs.map((tab) => {
              const isActive = categoryFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setCategoryFilter(tab.value)}
                  className={clsx(
                    "flex-1 py-2 text-center rounded-full transition-colors",
                    isActive ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "hover:bg-white/50"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Link
            to="/dev/db"
            className="flex-shrink-0 text-xs uppercase tracking-wider text-slate-400 border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded transition-colors"
          >
            Dev: View Local DB
          </Link>
        </div>
      </div>

      <AddAnimalModal 
        isOpen={isAddAnimalModalOpen} 
        onClose={() => setIsAddAnimalModalOpen(false)} 
      />
    </>
  );
}
