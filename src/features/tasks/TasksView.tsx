import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, CheckCircle, Circle, Clock, User, X, Save, ClipboardList, Wrench, Stethoscope, MapPin, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(''),
  assigned_to: z.string().nullable().transform(val => val === '' ? null : val),
  due_date: z.string().nullable().transform(val => val === '' ? null : val),
  task_type: z.enum(['GENERAL', 'MAINTENANCE', 'MEDICAL', 'HUSBANDRY']).default('GENERAL'),
  location: z.string().default(''),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
});

function TaskModal({ isOpen, onClose, users, editTask }: { isOpen: boolean, onClose: () => void, users: any[], editTask?: any }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const form = useForm({
    defaultValues: { 
      title: editTask?.title || '', 
      description: editTask?.description || '', 
      assigned_to: editTask?.assigned_to || '', 
      due_date: editTask?.due_date ? new Date(editTask.due_date).toISOString().split('T')[0] : '', 
      task_type: editTask?.task_type || 'GENERAL',
      location: editTask?.location || '',
      priority: editTask?.priority || 'MEDIUM'
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const payload: any = taskSchema.parse(value);
      const uId = currentUserId || null;
      try {
        if (editTask) {
          await db.query(
            `UPDATE tasks SET title=$1, description=$2, assigned_to=$3, due_date=$4, task_type=$5, location=$6, priority=$7, modified_by=$8, updated_at=now() WHERE id=$9`,
            [payload.title, payload.description, payload.assigned_to, payload.due_date, payload.task_type, payload.location, payload.priority, uId, editTask.id]
          );
          toast.success('Task updated');
        } else {
          await db.query(
            `INSERT INTO tasks (title, description, assigned_to, due_date, task_type, location, priority, created_by, modified_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
            [payload.title, payload.description, payload.assigned_to, payload.due_date, payload.task_type, payload.location, payload.priority, uId]
          );
          toast.success('Task created');
        }
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        onClose();
      } catch (err: any) {
        toast.error(`Database Error: ${err.message}`);
      }
    }
  });

  useEffect(() => {
      if (isOpen) {
        form.reset();
      }
  }, [isOpen, editTask, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">{editTask ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <form.Field name="title">{field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Task Title *</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none" placeholder="e.g., Repair Aviary Netting" />
                  </div>
                )}</form.Field>
             </div>

             <form.Field name="location">{field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Location (Enclosure/Area)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin size={14} className="text-slate-400"/></div>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50" placeholder="e.g., Reptile House" />
                  </div>
                </div>
              )}</form.Field>

              <form.Field name="priority">{field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Priority</label>
                  <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Immediate)</option>
                  </select>
                </div>
              )}</form.Field>
          </div>

          <form.Field name="description">{field => (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Description</label>
              <textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none bg-slate-50" placeholder="Task details and instructions..." />
            </div>
          )}</form.Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <form.Field name="task_type">{field => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category</label>
                <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                  <option value="GENERAL">General</option>
                  <option value="HUSBANDRY">Husbandry</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="MEDICAL">Medical</option>
                </select>
              </div>
            )}</form.Field>
            
            <form.Field name="due_date">{field => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Due Date</label>
                <input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50" />
              </div>
            )}</form.Field>

            <form.Field name="assigned_to">{field => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assign To</label>
                <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
            )}</form.Field>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors text-slate-600">Cancel</button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button onClick={form.handleSubmit} disabled={!canSubmit || isSubmitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {editTask ? 'Save Changes' : 'Create Task'}
                </button>
              )}
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}

export function TasksView() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const usersRes = await db.query("SELECT id, name, email, initials FROM users WHERE is_deleted = false");
      const tasksRes = await db.query(
        `SELECT t.*, u1.initials as assigned_initials, u2.initials as creator_initials 
         FROM tasks t 
         LEFT JOIN users u1 ON t.assigned_to = u1.id 
         LEFT JOIN users u2 ON t.created_by = u2.id 
         WHERE t.is_deleted = false 
         ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`
      );
      return { users: usersRes.rows, tasks: tasksRes.rows };
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      const uId = currentUserId || null;
      await db.query(
        `UPDATE tasks SET status = $1, completed_at = ${newStatus === 'COMPLETED' ? 'now()' : 'null'}, completed_by = ${newStatus === 'COMPLETED' ? '$2' : 'null'}, modified_by = $2, updated_at = now() WHERE id = $3`,
        [newStatus, uId, id]
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err: any) => toast.error(`Failed to update task: ${err.message}`)
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const uId = currentUserId || null;
      await db.query(`UPDATE tasks SET is_deleted = true, modified_by = $1, updated_at = now() WHERE id = $2`, [uId, id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task permanently deleted');
    },
    onError: (err: any) => toast.error(`Failed to delete task: ${err.message}`)
  });

  const handleEdit = (task: any) => {
      setTaskToEdit(task);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure you want to permanently delete this task?")) {
          deleteTaskMutation.mutate(id);
      }
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'MAINTENANCE': return <Wrench size={14} className="text-amber-600" />;
          case 'MEDICAL': return <Stethoscope size={14} className="text-rose-600" />;
          default: return <ClipboardList size={14} className="text-blue-600" />;
      }
  };

  const getPriorityColor = (priority: string) => {
      switch(priority) {
          case 'URGENT': return 'bg-rose-100 text-rose-700 border-rose-200';
          case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'LOW': return 'bg-slate-100 text-slate-600 border-slate-200';
          default: return 'bg-blue-50 text-blue-600 border-blue-100'; // Medium
      }
  };

  const filteredTasks = data?.tasks?.filter(t => t.status === activeTab) || [];

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Task Operations</h1>
          <p className="text-sm font-medium text-slate-500">Allocate and monitor facility duties</p>
        </div>
        <button onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20">
          <Plus size={16}/> Assign Task
        </button>
      </div>

      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('PENDING')} className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Pending Tasks</button>
        <button onClick={() => setActiveTab('COMPLETED')} className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'COMPLETED' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>Completed</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 w-12"></th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Details</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Priority</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Type</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Due Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Assigned To</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No {activeTab.toLowerCase()} tasks found</td></tr>
              ) : (
                filteredTasks.map((task: any) => (
                  <tr key={task.id} className={`group hover:bg-slate-50 transition-colors ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => toggleTaskMutation.mutate({ id: task.id, newStatus: task.status === 'PENDING' ? 'COMPLETED' : 'PENDING' })}
                        className={`p-0.5 rounded-full transition-colors ${task.status === 'COMPLETED' ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-300 hover:text-emerald-500'}`}
                      >
                        {task.status === 'COMPLETED' ? <CheckCircle size={22} /> : <Circle size={22} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <p className={`font-bold text-sm ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</p>
                        {task.location && <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest"><MapPin size={10}/> {task.location}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 px-2 py-1 border rounded-md text-[9px] font-black uppercase tracking-widest w-fit ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'URGENT' && <AlertTriangle size={10} />}
                          {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest w-fit">
                        {getTypeIcon(task.task_type)} {task.task_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.due_date ? (
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${new Date(task.due_date) < new Date() && task.status === 'PENDING' ? 'text-rose-600' : 'text-slate-600'}`}>
                          <Clock size={12}/> {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      ) : <span className="text-xs text-slate-400 font-medium">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {task.assigned_to ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md w-fit border border-emerald-100">
                          <User size={12}/> {task.assigned_initials || '??'}
                        </span>
                      ) : <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Task"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Task"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <TaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }} users={data?.users || []} editTask={taskToEdit} />
    </div>
  );
}
