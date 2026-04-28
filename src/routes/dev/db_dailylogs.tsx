import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from '../__root';
import { useEffect, useState } from 'react';
import { db } from '../../lib/db';
import { DailyLogModal } from '../../features/logs/components/DailyLogModal';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/db_dailylogs',
  component: DbDailyLogsDiagnostics,
});

function DbDailyLogsDiagnostics() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | undefined>();
  const [logs, setLogs] = useState<any[]>([]);
  const [testAnimalId, setTestAnimalId] = useState<string>('');

  const fetchData = async () => {
    try {
      const animalRes = await db.query('SELECT id FROM animals LIMIT 1');
      if (animalRes.rows.length > 0) {
        setTestAnimalId(animalRes.rows[0].id);
      }
      const logsRes = await db.query('SELECT * FROM daily_logs ORDER BY updated_at DESC');
      setLogs(logsRes.rows);
    } catch (err) {
      console.error('Diagnostic error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const headers = logs.length > 0 ? Object.keys(logs[0]) : [];

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">Daily Log CRUD Test Harness</h1>
      
      <button 
        onClick={() => { setEditingLogId(undefined); setIsModalOpen(true); }}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-semibold mb-4"
      >
        Add Test Log
      </button>

      {logs.length > 0 && (
        <div className="overflow-x-auto rounded-md shadow-sm border border-slate-700 bg-slate-950 mt-4">
          <table className="w-full text-left text-sm text-emerald-400 font-mono">
            <thead className="text-xs uppercase bg-slate-900 border-b border-slate-700">
              <tr>
                {headers.map(key => <th key={key} className="px-4 py-3">{key}</th>)}
                <th className="px-4 py-3 sticky right-0 bg-slate-900 z-10 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  {headers.map(key => (
                    <td key={key} className="px-4 py-3 whitespace-nowrap text-xs">
                      {key === 'notes' && typeof log[key] === 'string' && log[key].length > 30 ? (
                        <div className="max-w-[150px] truncate" title={String(log[key])}>{log[key]}</div>
                      ) : (
                        typeof log[key] === 'object' ? JSON.stringify(log[key]) : String(log[key])
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 sticky right-0 bg-slate-950 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.5)] z-10">
                    <button 
                      onClick={() => { setEditingLogId(log.id); setIsModalOpen(true); }}
                      className="text-blue-400 hover:text-blue-300 text-xs font-semibold"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {testAnimalId && (
        <DailyLogModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); fetchData(); }}
          animalId={testAnimalId}
          existingLogId={editingLogId}
        />
      )}
    </div>
  );
}
