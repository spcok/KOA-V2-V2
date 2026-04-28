import { ReactNode } from 'react';

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
}

export function StatWidget({ title, value, icon, trend }: StatWidgetProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
        {trend && <p className="text-xs font-semibold text-emerald-600 mt-2">{trend}</p>}
      </div>
      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
        {icon}
      </div>
    </div>
  );
}
