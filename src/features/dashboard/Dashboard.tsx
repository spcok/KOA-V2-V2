import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { AnimalTable } from './components/AnimalTable';
import { Heart, AlertCircle, Plus, Calendar, Scale, Drumstick, ArrowUpDown, Loader2, ClipboardCheck, CheckCircle, Lock, Unlock, ChevronUp, ChevronDown } from 'lucide-react';

export function Dashboard() {
  const getLocalToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [activeTab, setActiveTab] = useState('Owls');
  const [viewDate, setViewDate] = useState(getLocalToday());
  const [isBentoMinimized, setIsBentoMinimized] = useState(false);
  const [sortOption, setSortOption] = useState<'alpha-asc' | 'alpha-desc'>('alpha-asc');
  const [isOrderLocked, setIsOrderLocked] = useState(false);

  const permissions = { view_animals: true, add_animals: true, isAdmin: true, isOwner: true };

  const cycleSort = () => setSortOption(prev => prev === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboardData', viewDate],
    queryFn: async () => {
      const animalsRes = await db.query("SELECT * FROM animals ORDER BY name ASC");
      const logsRes = await db.query("SELECT * FROM daily_logs WHERE is_deleted = false ORDER BY log_date DESC");
      return { animals: animalsRes.rows, logs: logsRes.rows };
    }
  });

  useEffect(() => {
    const handleDbUpdate = () => refetch();
    window.addEventListener('db-updated', handleDbUpdate);
    return () => window.removeEventListener('db-updated', handleDbUpdate);
  }, [refetch]);

  const parseLocalDate = (val: any) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val).substring(0, 10);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return String(val).substring(0, 10);
    }
  };

  // 1. Process & Map Animals
  const processedAnimals = (data?.animals || []).map((a: any) => {
    const animalLogs = data?.logs.filter((l: any) => String(l.animal_id) === String(a.id)) || [];
    const todayLogs = animalLogs.filter((l: any) => parseLocalDate(l.log_date) === viewDate);
    
    const todayWeight = todayLogs.find((l: any) => String(l.log_type).toLowerCase() === 'weight');
    const todayFeedLogs = todayLogs.filter((l: any) => String(l.log_type).toLowerCase() === 'feed');
    
    const pastFeedLogs = animalLogs.filter((l: any) => 
        String(l.log_type).toLowerCase() === 'feed' && parseLocalDate(l.log_date) < viewDate
    );
    const lastFedLog = pastFeedLogs.length > 0 ? pastFeedLogs[0] : null; 

    return {
      ...a,
      displayId: a.ring_number || a.microchip_id || 'N/A',
      todayWeight: todayWeight || null,
      todayFeedLogs: todayFeedLogs,
      lastFedStr: lastFedLog ? new Date(lastFedLog.log_date).toLocaleDateString('en-GB') : 'N/A',
      nextFeedTask: null 
    };
  });

  // 2. Filter & Sort
  const filteredAnimals = processedAnimals.filter((a: any) => {
      if (activeTab === 'ARCHIVED') return a.is_deleted === true;
      return a.is_deleted === false && a.category?.toLowerCase() === activeTab.toLowerCase();
  });

  if (sortOption === 'alpha-asc') {
      filteredAnimals.sort((a, b) => a.name.localeCompare(b.name));
  } else {
      filteredAnimals.sort((a, b) => b.name.localeCompare(a.name));
  }

  // 3. Stats
  const animalStats = {
      total: filteredAnimals.length,
      weighed: filteredAnimals.filter(a => a.todayWeight).length,
      fed: filteredAnimals.filter(a => a.todayFeedLogs.length > 0).length
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-0.5 flex items-center gap-2 text-xs">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} <span className="text-slate-300">|</span> 🌤️ 14°C Partly Cloudy
          </p>
        </div>
      </div>

      {/* Tasks & Health Rota Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><ClipboardCheck size={18} /></div>
                      <h2 className="text-base font-semibold text-slate-800">Pending Duties</h2>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      {isBentoMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-3 flex-1 overflow-y-auto max-h-48 pr-2 space-y-2 scrollbar-hide">
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                          <div className="p-2 bg-emerald-50 rounded-full mb-2">
                            <CheckCircle size={24} className="text-emerald-500 opacity-80"/>
                          </div>
                          <p className="text-xs font-medium text-slate-500">All Duties Satisfied</p>
                      </div>
                  </div>
              )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Heart size={18} /></div>
                      <h2 className="text-base font-semibold text-slate-800">Health Rota</h2>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      {isBentoMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-3 flex-1 overflow-y-auto max-h-48 pr-2 space-y-2 scrollbar-hide">
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                          <div className="p-2 bg-rose-50 rounded-full mb-2">
                            <Heart size={24} className="text-rose-300 opacity-60"/>
                          </div>
                          <p className="text-xs font-medium text-slate-500">Collection Stable</p>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-[#0fa968] rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[10px] font-medium opacity-90 mb-0.5">Weighed Today</div>
            <div className="text-xl lg:text-2xl font-bold">
              {animalStats?.weighed || 0}<span className="text-xs lg:text-sm opacity-80">/{animalStats?.total || 0}</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Scale size={20} className="text-white" />
          </div>
        </div>
        <div className="bg-[#f97316] rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[10px] font-medium opacity-90 mb-0.5">Fed Today</div>
            <div className="text-xl lg:text-2xl font-bold">
              {animalStats?.fed || 0}<span className="text-xs lg:text-sm opacity-80">/{animalStats?.total || 0}</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Drumstick size={20} className="text-white" />
          </div>
        </div>
      </div>

      {/* Viewing Options Control Bar */}
      <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap text-[10px] lg:text-xs">
            <Calendar size={16} className="text-emerald-600" />
            Viewing Date:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">← Prev</button>
            <div className="relative flex-1 sm:flex-none min-w-[120px]">
              <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="w-full pl-2 pr-8 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d.toISOString().split('T')[0]); }} className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">Next →</button>
            <button onClick={() => setViewDate(getLocalToday())} className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">Today</button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            <button onClick={cycleSort} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] lg:text-xs font-medium hover:bg-slate-50 text-slate-700 bg-white min-w-[80px]">
              <ArrowUpDown size={14} /> {sortOption === 'alpha-asc' ? 'A-Z' : 'Z-A'}
            </button>
            <button onClick={() => setIsOrderLocked(!isOrderLocked)} className={`shrink-0 p-2 border border-slate-200 rounded-lg ${isOrderLocked ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
              {isOrderLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl gap-0.5 sm:gap-1">
        {['Owls', 'Raptors', 'Mammals', 'Exotics'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 min-w-fit sm:min-w-[100px] py-1.5 px-1 sm:py-2 sm:px-4 text-[11px] sm:text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`shrink-0 sm:flex-1 min-w-[80px] sm:min-w-[100px] py-1.5 px-3 sm:py-2 sm:px-4 text-[11px] sm:text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'ARCHIVED' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <AnimalTable animals={filteredAnimals} activeTab={activeTab} />
      </div>
    </div>
  );
}
