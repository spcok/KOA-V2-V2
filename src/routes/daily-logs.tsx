import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { db } from '../lib/db';
import { DailyLogModal } from '../features/logs/components/DailyLogModal';
import { Route as rootRoute } from './__root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daily-logs',
  component: DailyLogsPage,
});

function DailyLogsPage() {
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeCategory, setActiveCategory] = useState('Owls');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | undefined>(undefined);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [selectedLogType, setSelectedLogType] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['dailyLogs', viewDate],
    queryFn: async () => {
      const animalsRes = await db.query("SELECT * FROM animals WHERE is_deleted = false ORDER BY name ASC");
      const logsRes = await db.query("SELECT * FROM daily_logs WHERE DATE(log_date) = $1 AND is_deleted = false", [viewDate]);
      return { animals: animalsRes.rows, logs: logsRes.rows };
    }
  });

  useEffect(() => {
    const handleDbUpdate = () => refetch();
    window.addEventListener('db-updated', handleDbUpdate);
    return () => window.removeEventListener('db-updated', handleDbUpdate);
  }, [refetch]);

  const filteredAnimals = data?.animals.filter((a: any) => a.category.toLowerCase() === activeCategory.toLowerCase()) || [];

  const getLogs = (animalId: string, logType: string) => {
    return data?.logs
      .filter((l: any) => l.animal_id === animalId && l.log_type.toLowerCase() === logType.toLowerCase())
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];
  };

  const handleOpenModal = (animalId: string, logType: string, logId?: string) => {
    setSelectedAnimalId(animalId);
    setSelectedLogType(logType);
    setEditingLogId(logId);
    setIsModalOpen(true);
  };

  const renderCell = (animal: any, logType: string) => {
    const type = logType.toLowerCase();
    const logs = getLogs(animal.id, type);
    const isMammalFeed = activeCategory === 'Mammals' && type === 'feed';
    const displayLogs = isMammalFeed ? logs : logs.slice(0, 1);

    return (
      <div className="flex flex-col gap-2 min-w-[120px]">
        {displayLogs.map((log: any) => {
          let text = log.value || '';
          
          if (type === 'feed') {
             const qty = log.quantity && log.quantity !== -1 ? log.quantity + 'x ' : '';
             const food = log.food && log.food !== 'N/A' ? log.food : '';
             text = `${qty}${food}`.trim() || log.value || 'Done';
          } else if (type === 'weight') {
             text = log.weight_grams && log.weight_grams !== -1 ? `${log.weight_grams}g` : log.value;
          } else if (type === 'temperature') {
             text = log.temperature_c != null ? `${log.temperature_c}°C` : log.value;
          } else if (type === 'misting') {
             text = log.misted && log.misted !== 'N/A' ? log.misted : log.value || 'Yes';
          } else if (type === 'water') {
             text = log.water && log.water !== 'N/A' ? log.water : log.value || 'Yes';
          }

          const time = log.feed_time && log.feed_time !== '00:00:00' 
            ? log.feed_time.substring(0, 5) 
            : new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <button
              key={log.id}
              onClick={() => handleOpenModal(animal.id, type, log.id)}
              className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold text-left hover:bg-indigo-100 transition-colors w-full"
            >
              <span className="block truncate">{text}</span>
              <span className="block text-[10px] opacity-75 font-medium mt-0.5">@ {time}</span>
            </button>
          );
        })}

        {(logs.length === 0 || isMammalFeed) && (
          <button
            onClick={() => handleOpenModal(animal.id, type)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>
    );
  };

  const categories = ['Owls', 'Raptors', 'Mammals', 'Exotics'];
  const headers = activeCategory === 'Exotics' 
    ? ['Feed', 'Misting', 'Water', 'Temperature'] 
    : ['Weight', 'Feed', 'Temperature'];

  const handlePrevDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    setViewDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">DAILY LOG</h1>
          <div className="flex items-center gap-1 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
            <button onClick={handlePrevDay} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-2 px-2 border-x border-slate-200">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none w-28 text-center cursor-pointer"/>
            </div>
            <button onClick={handleNextDay} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-xl gap-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-900 uppercase min-w-[150px]">Animal Name</th>
              {headers.map(h => <th key={h} className="p-4 text-xs font-semibold text-slate-900 uppercase">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
               <tr><td colSpan={headers.length + 1} className="p-8 text-center text-slate-400 text-sm">Loading data...</td></tr>
            ) : filteredAnimals.length === 0 ? (
               <tr><td colSpan={headers.length + 1} className="p-8 text-center text-slate-400 text-sm">No animals found in this category.</td></tr>
            ) : (
              filteredAnimals.map((animal: any) => (
                <tr key={animal.id} className="hover:bg-slate-50/50">
                  <td className="p-4 text-sm font-bold text-slate-900 align-top">{animal.name}</td>
                  {headers.map(h => (
                    <td key={h} className="p-4 align-top">
                      {renderCell(animal, h.toLowerCase())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedAnimalId && selectedLogType && (
        <DailyLogModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLogId(undefined);
            refetch();
          }}
          animalId={selectedAnimalId}
          initialType={selectedLogType}
          existingLogId={editingLogId}
        />
      )}
    </div>
  );
}
