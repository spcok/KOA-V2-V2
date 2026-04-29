import React from 'react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'EX': { label: 'Extinct', color: 'text-white', bg: 'bg-slate-900' },
  'EW': { label: 'Extinct in Wild', color: 'text-white', bg: 'bg-slate-800' },
  'CR': { label: 'Critically Endangered', color: 'text-white', bg: 'bg-red-600' },
  'EN': { label: 'Endangered', color: 'text-white', bg: 'bg-orange-600' },
  'VU': { label: 'Vulnerable', color: 'text-white', bg: 'bg-yellow-600' },
  'NT': { label: 'Near Threatened', color: 'text-white', bg: 'bg-lime-600' },
  'LC': { label: 'Least Concern', color: 'text-white', bg: 'bg-emerald-600' },
  'DD': { label: 'Data Deficient', color: 'text-slate-700', bg: 'bg-slate-200' },
  'NE': { label: 'Not Evaluated', color: 'text-slate-700', bg: 'bg-slate-100' },
};

export const IUCNBadge = ({ status = 'NE' }: { status?: string }) => {
  const data = STATUS_MAP[status?.toUpperCase() || 'NE'] || STATUS_MAP['NE'];
  return (
    <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-full shadow-sm ${data.bg} ${data.color}`} title={data.label}>
      <span className="text-[10px] font-black tracking-widest">{status}</span>
    </div>
  );
};
