import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { Loader2, CalendarPlus, Stethoscope, FileText } from 'lucide-react';

export function MedicalTab({ animalId }: { animalId: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['animal_medical', animalId],
        queryFn: async () => {
            const records = await db.query(`SELECT c.*, u.name as staff_name FROM clinical_records c LEFT JOIN users u ON c.conducted_by = u.id WHERE c.animal_id = $1 AND c.is_deleted = false ORDER BY c.record_date DESC`, [animalId]);
            const schedule = await db.query(`SELECT * FROM clinical_schedule WHERE animal_id = $1 AND is_deleted = false ORDER BY start_date DESC`, [animalId]);
            return { records: records.rows, schedule: schedule.rows };
        }
    });

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

    return (
        <div className="space-y-8">
            <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4"><h2 className="text-sm font-black uppercase text-indigo-900 tracking-widest flex items-center gap-2"><CalendarPlus size={18}/> Clinical Schedule (Read Only)</h2></div>
                {data?.schedule.length === 0 ? <p className="text-slate-400 text-sm font-bold">No active schedules.</p> : (
                    <div className="space-y-2">
                        {data?.schedule.map((s: any) => (
                            <div key={s.id} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50">
                                <div><p className="font-bold text-sm text-slate-800">{s.title}</p><p className="text-[10px] font-black uppercase text-slate-400">{s.schedule_type.replace('_', ' ')} • {s.frequency.replace('_', ' ')}</p></div>
                                <div className="text-right"><p className="text-xs font-bold text-slate-600">{new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}</p><span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{s.status}</span></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-sm font-black uppercase text-indigo-900 tracking-widest flex items-center gap-2"><Stethoscope size={18}/> Clinical Records (Read Only)</h2></div>
                {data?.records.length === 0 ? <p className="text-slate-400 text-sm font-bold text-center py-8">No clinical records found.</p> : (
                    <div className="space-y-6">
                        {data?.records.map((r: any) => (
                            <div key={r.id} className="border border-slate-200 rounded-2xl overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-400"></div>
                                <div className="bg-slate-50 border-b p-4 pl-6 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-3"><span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{r.record_type.replace('_', ' ')}</span><span className="text-xs font-bold text-slate-500">{new Date(r.record_date).toLocaleString()}</span></div>
                                        <p className="text-xs font-bold text-slate-700 mt-2 flex items-center gap-1"><FileText size={12}/> By: {r.conductor_role === 'EXTERNAL_SPECIALIST' ? `${r.external_vet_name} (${r.external_vet_clinic})` : r.staff_name}</p>
                                    </div>
                                    {r.weight_grams > 0 && <div className="text-right"><p className="text-[10px] font-black uppercase text-slate-400">Weight</p><p className="text-sm font-bold text-slate-800">{(r.weight_grams / 1000).toFixed(2)} kg</p></div>}
                                </div>
                                <div className="p-4 pl-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                                    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-1">Subjective</p><p className="text-sm text-slate-700">{r.soap_subjective}</p></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-1">Objective</p><p className="text-sm text-slate-700">{r.soap_objective}</p></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-1">Assessment</p><p className="text-sm text-slate-700">{r.soap_assessment}</p></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-1">Plan</p><p className="text-sm text-slate-700 font-bold">{r.soap_plan}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
