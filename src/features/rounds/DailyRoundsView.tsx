import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { 
    ClipboardCheck, Sun, Moon, Check, X, Droplets, Lock, 
    Heart, AlertTriangle, ShieldCheck, Loader2, Calendar as CalendarIcon,
    Info, ChevronDown, ChevronRight, CornerDownRight, ChevronLeft
} from 'lucide-react';

const CATEGORIES = ['Mammal', 'Bird', 'Reptile', 'Amphibian', 'Invertebrate', 'Fish'];

export function DailyRoundsView() {
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    const [roundType, setRoundType] = useState('Morning');
    const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
    const [expandedMobs, setExpandedMobs] = useState<Set<string>>(new Set());
    
    const [signingInitials, setSigningInitials] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState<'HEALTH' | 'SECURITY'>('HEALTH');
    const [reportAnimalId, setReportAnimalId] = useState<string | null>(null);
    const [issueText, setIssueText] = useState('');

    const session = useAuthStore((state) => state.session);
    const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    // 1. Fetch Animals & Rounds Data
    const { data, isLoading } = useQuery({
        queryKey: ['daily_rounds', viewDate, roundType, activeTab],
        queryFn: async () => {
            const animalRes = await db.query(
                "SELECT * FROM animals WHERE category = $1 AND is_deleted = false ORDER BY display_order ASC, name ASC", 
                [activeTab]
            );
            const roundRes = await db.query(
                "SELECT * FROM daily_rounds WHERE date = $1 AND shift = $2 AND section = $3 AND is_deleted = false",
                [viewDate, roundType, activeTab]
            );
            
            const checksMap: Record<string, any> = {};
            roundRes.rows.forEach(r => { checksMap[r.animal_id] = r; });
            
            return { animals: animalRes.rows, checks: checksMap };
        }
    });

    const animals = data?.animals || [];
    const checks = data?.checks || {};

    // Calculate Progress
    const totalAnimals = animals.filter(a => a.entity_type !== 'GROUP').length + animals.filter(a => a.entity_type === 'GROUP').length;
    const completedChecks = animals.filter(a => {
        const state = checks[a.id];
        if (!state) return false;
        return state.is_alive !== null && state.water_checked !== null && state.locks_secured !== null;
    }).length;
    const progress = totalAnimals === 0 ? 0 : Math.round((completedChecks / totalAnimals) * 100);
    const isComplete = progress === 100;
    const isPastRound = new Date(viewDate) < new Date(new Date().toISOString().split('T')[0]);

    // 2. Mutation Engine
    const toggleMutation = useMutation({
        mutationFn: async ({ animalId, field, value, note }: any) => {
            const existing = checks[animalId];
            if (existing) {
                await db.query(`UPDATE daily_rounds SET ${field} = $1, animal_issue_note = $2, updated_at = now(), modified_by = $3 WHERE id = $4`, [value, note || null, currentUserId, existing.id]);
            } else {
                const cols = ['animal_id', 'date', 'shift', 'section', field, 'animal_issue_note', 'created_by', 'modified_by'];
                await db.query(`INSERT INTO daily_rounds (${cols.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`, [animalId, viewDate, roundType, activeTab, value, note || null, currentUserId]);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily_rounds'] })
    });

    const signOffMutation = useMutation({
        mutationFn: async () => {
            await db.query(
                `UPDATE daily_rounds SET completed_by = $1, completed_at = now(), general_section_note = $2, updated_at = now() WHERE date = $3 AND shift = $4 AND section = $5 AND is_deleted = false`,
                [currentUserId, generalNotes, viewDate, roundType, activeTab]
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily_rounds'] });
            useSyncStore.getState().pushToCloud().catch(console.error);
            setSigningInitials('');
            setGeneralNotes('');
        }
    });

    const handleAction = (animalId: string, field: string, value: boolean, note?: string) => {
        toggleMutation.mutate({ animalId, field, value, note });
    };

    const toggleMob = (id: string) => {
        const next = new Set(expandedMobs);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedMobs(new Set(next));
    };

    const confirmIssue = () => {
        if (!reportAnimalId || !issueText) return;
        if (reportType === 'HEALTH') handleAction(reportAnimalId, 'is_alive', false, issueText);
        else handleAction(reportAnimalId, 'locks_secured', false, issueText);
        setReportModalOpen(false);
    };

    const changeDate = (days: number) => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() + days);
        setViewDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-6 bg-slate-50 min-h-screen pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <ClipboardCheck className="text-emerald-600" size={28} /> Daily Rounds
                        </h1>
                        <div className="flex items-center gap-1 mt-3 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
                            <button onClick={() => changeDate(-1)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md"><ChevronLeft size={16} /></button>
                            <div className="flex items-center gap-2 px-3 border-x border-slate-200">
                                <CalendarIcon size={14} className="text-slate-400" />
                                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none" />
                            </div>
                            <button onClick={() => changeDate(1)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md"><ChevronRight size={16} /></button>
                            <button onClick={() => setViewDate(new Date().toISOString().split('T')[0])} className="ml-1 px-3 py-1 text-[10px] font-bold uppercase rounded-md text-indigo-700 bg-indigo-50">Today</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <button onClick={() => setRoundType('Morning')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${roundType === 'Morning' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Sun size={16} /> Morning</button>
                        <button onClick={() => setRoundType('Evening')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${roundType === 'Evening' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Moon size={16} /> Evening</button>
                    </div>
                </div>
                
                {/* Category Tabs */}
                <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1.5 rounded-xl gap-1 mt-6">
                    {CATEGORIES.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-fit px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
                    ))}
                </div>
            </div>

            {/* Animal Grid */}
            <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto space-y-3">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
                ) : animals.length === 0 ? (
                    <div className="text-center py-12 opacity-50"><Info className="mx-auto mb-2 text-slate-300" size={32}/><p className="font-bold text-slate-400 text-sm">No animals in this section.</p></div>
                ) : (
                    animals.map(animal => {
                        const isChild = animal.parent_mob_id && animal.parent_mob_id !== '00000000-0000-0000-0000-000000000000';
                        if (isChild && !expandedMobs.has(animal.parent_mob_id)) return null;

                        const state = checks[animal.id] || { is_alive: null, water_checked: null, locks_secured: null };
                        const isDone = state.is_alive !== null && state.water_checked !== null && state.locks_secured !== null;
                        const hasIssue = state.is_alive === false || state.locks_secured === false;

                        return (
                            <div key={animal.id} className={`bg-white border-2 rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-6 transition-all ${isDone && !hasIssue ? 'border-emerald-100 shadow-sm' : hasIssue ? 'border-rose-100 bg-rose-50' : 'border-slate-200'} ${isChild ? 'ml-8 bg-slate-50/50' : ''}`}>
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {isChild && <CornerDownRight className="text-slate-300 shrink-0" size={20} />}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {animal.entity_type === 'GROUP' && (
                                                <button onClick={() => toggleMob(animal.id)} className="p-1 hover:bg-slate-200 rounded-md">
                                                    {expandedMobs.has(animal.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                                </button>
                                            )}
                                            <h3 className="font-black text-slate-800 text-sm md:text-base truncate uppercase">{animal.name}</h3>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{animal.location}</p>
                                    </div>
                                </div>

                                {/* Check Buttons */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                        onClick={() => state.is_alive ? setReportModalOpen(true) & setReportType('HEALTH') & setReportAnimalId(animal.id) : handleAction(animal.id, 'is_alive', true)} 
                                        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all ${state.is_alive === true ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : state.is_alive === false ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-300'}`}
                                    >
                                        <Heart size={20} fill={state.is_alive === true ? "currentColor" : "none"} />
                                        <span className="text-[8px] font-black uppercase mt-1">Health</span>
                                    </button>
                                    <button 
                                        onClick={() => handleAction(animal.id, 'water_checked', true)} 
                                        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all ${state.water_checked ? 'border-blue-100 bg-blue-50 text-blue-500' : 'border-slate-100 bg-slate-50 text-slate-300'}`}
                                    >
                                        {state.water_checked ? <Check size={20} strokeWidth={4} /> : <Droplets size={20} />}
                                        <span className="text-[8px] font-black uppercase mt-1">Water</span>
                                    </button>
                                    <button 
                                        onClick={() => state.locks_secured ? setReportModalOpen(true) & setReportType('SECURITY') & setReportAnimalId(animal.id) : handleAction(animal.id, 'locks_secured', true)} 
                                        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all ${state.locks_secured === true ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : state.locks_secured === false ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-300'}`}
                                    >
                                        {state.locks_secured === true ? <Check size={20} strokeWidth={4} /> : state.locks_secured === false ? <X size={20} strokeWidth={4} /> : <Lock size={20} />}
                                        <span className="text-[8px] font-black uppercase mt-1">Locks</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Sign-off */}
            <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] lg:pl-64">
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                            <span className="text-slate-400">Section Progress</span>
                            <span className={isComplete ? 'text-emerald-600' : 'text-slate-600'}>{completedChecks}/{totalAnimals}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="flex-1 flex gap-3">
                        <input type="text" placeholder="Initials" value={signingInitials} onChange={e => setSigningInitials(e.target.value.toUpperCase())} maxLength={3} className="w-20 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-black focus:outline-none" />
                        <input type="text" placeholder="General section notes..." value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 text-sm focus:outline-none" />
                        <button onClick={() => signOffMutation.mutate()} disabled={!isComplete || !signingInitials || signOffMutation.isPending} className="bg-slate-900 text-white px-6 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50">
                            {signOffMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />} Sign Off
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {reportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
                        <div className={`p-6 border-b flex gap-3 ${reportType === 'HEALTH' ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-orange-50 border-orange-100 text-orange-900'}`}>
                            {reportType === 'HEALTH' ? <AlertTriangle size={24} /> : <Lock size={24}/>}
                            <h2 className="font-black text-lg uppercase tracking-tight">{reportType === 'HEALTH' ? 'Health Issue' : 'Security Alert'}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea autoFocus value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="Describe the issue..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm h-32 focus:outline-none" />
                            <div className="flex gap-3">
                                <button onClick={() => setReportModalOpen(false)} className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-[10px] text-slate-500">Cancel</button>
                                <button onClick={confirmIssue} disabled={!issueText} className={`flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] disabled:opacity-50 ${reportType === 'HEALTH' ? 'bg-rose-600' : 'bg-orange-600'}`}>Confirm Issue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
