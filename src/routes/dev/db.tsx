import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from '../__root';
import { useEffect, useState } from 'react';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/db',
  component: DbDiagnostics,
});

function DbDiagnostics() {
  const [results, setResults] = useState<{
    tables?: any[];
    rowCounts?: Record<string, number>;
    schema?: any[];
    constraintTestResult?: string | null;
    animalRows?: any[];
    anomalies?: any[];
  }>({});

  useEffect(() => {
    async function runDiagnostics() {
      try {
        const tablesRes = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        
        const animalsCountRes = await db.query(`SELECT count(*) FROM animals`);
        const logsCountRes = await db.query(`SELECT count(*) FROM daily_logs`);
        const feedsCountRes = await db.query(`SELECT count(*) FROM feeding_schedules`);
        
        const schemaRes = await db.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'animals'`);
        
        let constraintTestResult = null;
        try {
          await db.query(`INSERT INTO animals (name) VALUES (null)`);
        } catch (err: any) {
          constraintTestResult = `Passed (Blocked intentional null insert with code ${err.code || err.message})`;
        }

        const animalsDataRes = await db.query('SELECT * FROM animals ORDER BY name ASC');
        const { data: cloudData } = await supabase.from('animals').select('*');

        let anomalies: any[] = [];
        if (cloudData) {
          anomalies = cloudData.filter(
            row => row.name == null || row.species == null || row.category == null
          );
        }

        setResults({
          tables: tablesRes.rows,
          rowCounts: {
            animals: Number(animalsCountRes.rows[0].count),
            daily_logs: Number(logsCountRes.rows[0].count),
            feeding_schedules: Number(feedsCountRes.rows[0].count),
          },
          schema: schemaRes.rows,
          constraintTestResult,
          animalRows: animalsDataRes.rows,
          anomalies,
        });
      } catch (err) {
        console.error("Diagnostic error:", err);
      }
    }

    runDiagnostics();
  }, []);

  const metaResults = {
    tables: results.tables,
    rowCounts: results.rowCounts,
    schema: results.schema,
    constraintTestResult: results.constraintTestResult,
  };

  const headers = results.animalRows && results.animalRows.length > 0 
    ? Object.keys(results.animalRows[0])
    : [];

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">PGLite Integrity Diagnostics</h1>
      
      <pre className="bg-slate-950 text-emerald-400 p-4 rounded-md overflow-x-auto text-sm font-mono shadow-sm">
        <code>
          {JSON.stringify(metaResults, null, 2)}
        </code>
      </pre>

      {results.anomalies && results.anomalies.length > 0 && (
        <div className="mt-8 bg-red-950 border border-red-800 rounded-md p-4 shadow-sm">
          <h2 className="text-lg font-bold text-red-400 tracking-tight mb-2">Supabase Anomaly Alert</h2>
          <p className="text-sm text-red-300 mb-4">The following records in the cloud violate local NOT NULL constraints (missing name, species, or category):</p>
          <ul className="list-disc pl-5 text-sm text-red-200 font-mono space-y-1">
            {results.anomalies.map((anomaly, idx) => (
              <li key={idx}>
                {anomaly.id} - {anomaly.name || 'NULL NAME'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.animalRows && results.animalRows.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-4">Local Animal Rows (PGLite)</h2>
          <div className="overflow-x-auto rounded-md shadow-sm border border-slate-700 bg-slate-950">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900 text-slate-400 border-b border-slate-700">
                <tr>
                  {headers.map(key => (
                    <th key={key} className="px-4 py-3 font-semibold whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.animalRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                    {headers.map(key => {
                      const val = row[key];
                      const displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);
                      return (
                        <td key={key} className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                          {displayVal === 'null' || displayVal === 'undefined' ? (
                            <span className="text-slate-600 italic">null</span>
                          ) : (
                            displayVal
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
