import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Clock, CalendarDays, CheckCircle } from 'lucide-react';

export function TimesheetView() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['timesheets', dateFilter],
    queryFn: async () => {
      const res = await db.query(
        `SELECT t.*, u.name, u.email FROM timesheets t 
         LEFT JOIN users u ON t.user_id = u.id 
         WHERE t.shift_date = $1 AND t.is_deleted = false 
         ORDER BY t.clock_in_time DESC`,
        [dateFilter]
      );
      return res.rows;
    }
  });

  const getDuration = (inTime: string, outTime: string, status: string) => {
    if (status === 'CLOCKED_IN') return "Active Shift";
    const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  const clockedInCount = data?.filter(t => t.status === 'CLOCKED_IN').length || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Clock className="text-blue-500" size={28}/> Timesheets Dashboard</h1>
        <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-xl shadow-sm">
            <CalendarDays size={18} className="text-slate-400" />
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="text-sm font-bold text-slate-700 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currently On Site</h3>
            <p className="text-4xl font-black text-emerald-600 mt-2">{clockedInCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Shifts Logged</h3>
            <p className="text-4xl font-black text-blue-600 mt-2">{data?.length || 0}</p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Staff Member</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Clock In</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Clock Out</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Duration</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th></tr></thead>
          <tbody className="divide-y">
            {data?.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold text-sm">No timesheets found for this date.</td></tr>}
            {data?.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{t.name || t.email}</p></td>
                <td className="px-4 py-3 text-sm font-mono text-slate-600">{new Date(t.clock_in_time).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-600">{t.status === 'CLOCKED_IN' ? '--:--' : new Date(t.clock_out_time).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{getDuration(t.clock_in_time, t.clock_out_time, t.status)}</td>
                <td className="px-4 py-3">{t.status === 'CLOCKED_IN' ? <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit"><CheckCircle size={10}/> Active</span> : <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">Complete</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
