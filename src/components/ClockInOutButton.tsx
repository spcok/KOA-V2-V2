import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../lib/db';
import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function ClockInOutButton() {
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data: activeShift, isLoading } = useQuery({
    queryKey: ['active_shift', currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const res = await db.query(
        `SELECT id FROM timesheets WHERE user_id = $1 AND status = 'CLOCKED_IN' AND is_deleted = false ORDER BY clock_in_time DESC LIMIT 1`,
        [currentUserId]
      );
      return res.rows.length > 0 ? res.rows[0] : null;
    }
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("No user ID");
      await db.query(
        `INSERT INTO timesheets (user_id, status, created_by, modified_by) VALUES ($1, 'CLOCKED_IN', $1, $1)`, 
        [currentUserId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_shift'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Clocked In Successfully");
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      if (!currentUserId) throw new Error("No user ID");
      await db.query(
        `UPDATE timesheets SET status = 'CLOCKED_OUT', clock_out_time = now(), modified_by = $1, updated_at = now() WHERE id = $2`, 
        [currentUserId, shiftId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_shift'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Clocked Out Successfully");
    }
  });

  if (isLoading || !currentUserId) return null;

  if (activeShift) {
    return (
      <button 
        onClick={() => clockOutMutation.mutate(activeShift.id)}
        disabled={clockOutMutation.isPending}
        className="px-5 py-1.5 border border-rose-500 text-rose-600 font-bold tracking-wide text-sm uppercase rounded-full hover:bg-rose-50 transition-colors bg-white shadow-sm"
      >
        Clock Out
      </button>
    );
  }

  return (
    <button 
      onClick={() => clockInMutation.mutate()}
      disabled={clockInMutation.isPending}
      className="px-5 py-1.5 border border-emerald-500 text-emerald-600 font-bold tracking-wide text-sm uppercase rounded-full hover:bg-emerald-50 transition-colors bg-white shadow-sm"
    >
      Clock In
    </button>
  );
}
