import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Stethoscope, AlertTriangle, ShieldAlert, CalendarClock, Pill, Check, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import toast from 'react-hot-toast';

export function MedicalDashboardView() {
  const currentUserId = useAuthStore(s => s.session?.user?.id) || '00000000-0000-0000-0000-000000000000';

  const { data, isLoading } = useQuery({
    queryKey: ['medical_dashboard_data'],
    queryFn: async () => {
      const scheduleRes = await db.query(`
        SELECT c.*, a.name as animal_name, a.species 
        FROM clinical_schedule c 
        LEFT JOIN animals a ON c.animal_id = a.id 
        WHERE c.status = 'ACTIVE' AND c.is_deleted = false 
        ORDER BY c.start_date ASC
      `);
      
      const isolationRes = await db.query(`
        SELECT i.*, a.name as animal_name, a.species 
        FROM isolation_logs i 
        LEFT JOIN animals a ON i.animal_id = a.id 
        WHERE i.status = 'ACTIVE' AND i.is_deleted = false
      `);

      const todayStr = new Date().toISOString().split('T')[0];
      const medLogsRes = await db.query(`
        SELECT schedule_id, status FROM medication_logs 
        WHERE is_deleted = false AND DATE(administered_at) = $1
      `, [todayStr]);

      return {
        schedule: scheduleRes.rows,
        isolations: isolationRes.rows,
        logsToday: medLogsRes.rows,
      };
    }
  });

  const logMedicationMutation = useMutation({
    mutationFn: async ({ scheduleId, animalId, status, notes }: { scheduleId: string, animalId: string, status: string, notes: string }) => {
      await db.query(
        `INSERT INTO medication_logs (schedule_id, animal_id, status, notes, administered_by, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $5, $5)`,
        [scheduleId, animalId, status, notes, currentUserId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_dashboard_data'] });
      toast.success('Dose Logged in MAR Chart');
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  const isIsolated = (animalId: string) => data?.isolations.some((i: any) => i.animal_id === animalId);
  const hasLogToday = (scheduleId: string) => data?.logsToday.some((l: any) => l.schedule_id === scheduleId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Stethoscope className="text-indigo-500" size={28}/> Veterinary & Health Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Health Rota (MAR Chart) */}
        <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><CalendarClock size={16}/> Active Health Rota / MAR Chart</h2>
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                {data?.schedule.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold text-sm">No active medications or vet checks scheduled.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Patient</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Treatment / Check</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-center w-48">Log Today's Dose</th></tr></thead>
                        <tbody className="divide-y">
                            {data?.schedule.map((task: any) => {
                                const isolated = isIsolated(task.animal_id);
                                const loggedToday = hasLogToday(task.id);
                                return (
                                <tr key={task.id} className={`hover:bg-slate-50 ${isolated ? 'bg-rose-50/30' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <Link to={`/animals/${task.animal_id}`} className="font-bold text-sm text-indigo-600 hover:underline">{task.animal_name}</Link>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{task.species}</span>
                                            {isolated && <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded w-fit mt-1 border border-rose-200"><ShieldAlert size={10} /> In Isolation</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-sm text-slate-800">{task.title}</p>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">{task.schedule_type.replace('_', ' ')} • {task.frequency.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {loggedToday ? (
                                            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-flex items-center gap-1"><Check size={12}/> Logged Today</span>
                                        ) : task.schedule_type === 'MEDICATION_COURSE' ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => logMedicationMutation.mutate({ scheduleId: task.id, animalId: task.animal_id, status: 'GIVEN', notes: 'NONE' })} className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors" title="Given"><Check size={16}/></button>
                                                <button onClick={() => { const note = window.prompt('Reason for refusal?'); if(note) logMedicationMutation.mutate({ scheduleId: task.id, animalId: task.animal_id, status: 'REFUSED', notes: note }); }} className="p-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors" title="Refused"><X size={16}/></button>
                                                <button onClick={() => { const note = window.prompt('Reason for partial dose?'); if(note) logMedicationMutation.mutate({ scheduleId: task.id, animalId: task.animal_id, status: 'PARTIAL_DOSE', notes: note }); }} className="p-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors" title="Partial Dose"><Pill size={16}/></button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-slate-400">Not Applicable</span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* Active Isolations Panel */}
        <div className="space-y-4">
            <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><AlertTriangle size={16}/> Active Biosecurity</h2>
            <div className="space-y-3">
                {data?.isolations.length === 0 ? (
                    <div className="bg-white border border-dashed rounded-2xl p-6 text-center text-slate-400 font-bold text-sm shadow-sm">No animals currently in isolation.</div>
                ) : (
                    data?.isolations.map((iso: any) => (
                        <div key={iso.id} className="bg-white border-2 border-rose-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                            <div className="pl-2 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Link to={`/animals/${iso.animal_id}`} className="font-black text-sm text-slate-800 hover:text-indigo-600">{iso.animal_name}</Link>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">{iso.species}</p>
                                    </div>
                                    <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-1 rounded shadow-sm">{iso.isolation_type.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="text-xs text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border"><span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Location</span>{iso.location}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
