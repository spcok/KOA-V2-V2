import React, { useState } from 'react';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { Loader2, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export function TaskSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedTasks = async () => {
    setIsSeeding(true);
    try {
      const usersRes = await db.query("SELECT id FROM users WHERE is_deleted = false LIMIT 5");
      const users = usersRes.rows;
      if (users.length === 0) throw new Error("No users found to assign tasks to. Please seed users first.");

      const mockTasks = [
        { title: 'Repair Aviary Netting', desc: 'Hole found in section B netting. Needs immediate patching before tomorrow.', type: 'MAINTENANCE', status: 'PENDING', daysOffset: 1 },
        { title: 'Administer Meds to Barn Owl', desc: 'Morning dose of Meloxicam (0.5ml).', type: 'MEDICAL', status: 'PENDING', daysOffset: 0 },
        { title: 'Deep Clean Enclosure 4', desc: 'Full scrub down using F10 disinfectant. Replace all substrate.', type: 'HUSBANDRY', status: 'COMPLETED', daysOffset: -1 },
        { title: 'Order Frozen Mice', desc: 'Running low on fuzzies and hoppers. Order from standard supplier.', type: 'GENERAL', status: 'PENDING', daysOffset: 5 },
        { title: 'Fix broken heat lamp', desc: 'Reptile house basking bulb blew in tank 3.', type: 'MAINTENANCE', status: 'COMPLETED', daysOffset: -2 },
        { title: 'Update Flight Records', desc: 'Log the weekend display flight times.', type: 'GENERAL', status: 'PENDING', daysOffset: -3 } // Overdue task test
      ];

      for (const t of mockTasks) {
         // Randomly assign to an active user
         const uId = users[Math.floor(Math.random() * users.length)].id;
         
         const dDate = new Date();
         dDate.setDate(dDate.getDate() + t.daysOffset);
         const dateStr = dDate.toISOString().split('T')[0];

         await db.query(
            `INSERT INTO tasks (title, description, assigned_to, due_date, task_type, status, created_by, modified_by, completed_at, completed_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7, ${t.status === 'COMPLETED' ? 'now()' : 'null'}, ${t.status === 'COMPLETED' ? '$3' : 'null'})`,
            [t.title, t.desc, uId, dateStr, t.type, t.status, uId]
         );
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Successfully seeded 6 mock tasks.");
    } catch (err: any) {
      toast.error(`Seeding Failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <button onClick={handleSeedTasks} disabled={isSeeding} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs uppercase tracking-widest font-bold shadow-lg shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-colors">
      {isSeeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} Seed Mock Tasks
    </button>
  );
}
