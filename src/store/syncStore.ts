import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { queryClient } from '../lib/queryClient';

interface SyncState {
  isSyncing: boolean;
  isPushing: boolean;
  lastSyncedAt: string | null;
  lastPushedAt: number;
  realtimeChannel: any | null;
  _workerActive: boolean;
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
  syncAll: () => Promise<void>;
  initRealtimeSubscription: () => void;
  startBackgroundWorker: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isSyncing: false,
      isPushing: false,
      lastSyncedAt: null,
      lastPushedAt: 0,
      realtimeChannel: null,
      _workerActive: false,

      pushToCloud: async () => {
        const { isPushing, lastSyncedAt } = get();
        if (isPushing || !navigator.onLine) return; // Concurrency & Network Lock

        set({ isPushing: true });
        try {
          const params = lastSyncedAt ? [lastSyncedAt] : [];
          const baseWhere = lastSyncedAt ? ' WHERE updated_at > $1' : '';
          const andWhere = lastSyncedAt ? ' AND updated_at > $1' : '';

          const pushDefinitions = [
            { table: 'animals', filter: baseWhere },
            { table: 'daily_logs', filter: baseWhere },
            { table: 'feeding_schedules', filter: baseWhere },
            { table: 'daily_rounds', filter: ` WHERE completed_by IS NOT NULL${andWhere}` }
          ];

          for (const def of pushDefinitions) {
            const { rows } = await db.query(`SELECT * FROM ${def.table}${def.filter}`, params);
            if (rows.length > 0) {
               const { error } = await supabase.from(def.table).upsert(rows);
               if (error) throw new Error(`Push Error on ${def.table}: ${error.message}`);
            }
          }
          set({ lastPushedAt: Date.now() });
        } catch (err) {
          console.error('Background Push Failed:', err);
        } finally {
          set({ isPushing: false });
        }
      },

      pullFromCloud: async () => {
        set({ isSyncing: true });
        const { lastSyncedAt } = get();
        
        try {
          const { data: usersData, error: usersError } = await supabase.from('users').select('*');
          if (usersError) throw usersError;
          if (usersData && usersData.length > 0) {
            await db.transaction(async (tx) => {
              for (const r of usersData) {
                await tx.query(`INSERT INTO users (id, email, name, initials, role, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, initials = EXCLUDED.initials, role = EXCLUDED.role, is_deleted = EXCLUDED.is_deleted, updated_at = EXCLUDED.updated_at`, [r.id, r.email, r.name, r.initials, r.role, r.is_deleted, r.created_at, r.updated_at]);
              }
            });
          }

          const tablesToPull = [
            { name: 'animals', cols: ['id', 'entity_type', 'parent_mob_id', 'census_count', 'name', 'species', 'latin_name', 'category', 'location', 'image_url', 'distribution_map_url', 'hazard_rating', 'is_venomous', 'weight_unit', 'flying_weight_g', 'winter_weight_g', 'average_target_weight', 'date_of_birth', 'is_dob_unknown', 'gender', 'microchip_id', 'ring_number', 'has_no_id', 'red_list_status', 'description', 'special_requirements', 'critical_husbandry_notes', 'ambient_temp_only', 'target_day_temp_c', 'target_night_temp_c', 'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent', 'misting_frequency', 'acquisition_date', 'acquisition_type', 'origin', 'origin_location', 'lineage_unknown', 'sire_id', 'dam_id', 'is_boarding', 'is_quarantine', 'display_order', 'archived', 'archive_reason', 'archive_type', 'archived_at', 'is_deleted', 'created_by', 'modified_by', 'created_at', 'updated_at', 'sign_content'] },
            { name: 'daily_logs', cols: ['id', 'animal_id', 'log_type', 'log_date', 'notes', 'weight_grams', 'weight_unit', 'basking_temp_c', 'cool_temp_c', 'temperature_c', 'food', 'quantity', 'feed_time', 'feed_method', 'cast_status', 'misted', 'water', 'is_deleted', 'created_by', 'modified_by', 'created_at', 'updated_at'] },
            { name: 'feeding_schedules', cols: ['id', 'animal_id', 'scheduled_date', 'food_type', 'quantity', 'calci_dust', 'additional_notes', 'is_completed', 'completed_at', 'completed_by', 'is_deleted', 'created_by', 'modified_by', 'created_at', 'updated_at'] },
            { name: 'daily_rounds', cols: ['id', 'animal_id', 'date', 'shift', 'section', 'is_alive', 'water_checked', 'locks_secured', 'animal_issue_note', 'general_section_note', 'completed_by', 'completed_at', 'is_deleted', 'created_by', 'modified_by', 'created_at', 'updated_at'] }
          ];

          for (const table of tablesToPull) {
            let req = supabase.from(table.name).select('*');
            if (lastSyncedAt) req = req.gt('updated_at', lastSyncedAt);
            const { data, error } = await req;
            if (error) throw new Error(`Pull Error on ${table.name}: ${error.message}`);
            
            if (data && data.length > 0) {
              await db.transaction(async (tx) => {
                for (const record of data) {
                  const placeholders = table.cols.map((_, i) => `$${i + 1}`).join(', ');
                  const setClause = table.cols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
                  const values = table.cols.map(col => record[col]);
                  await tx.query(`INSERT INTO ${table.name} (${table.cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${setClause}`, values);
                }
              });
            }
          }

          queryClient.invalidateQueries();
        } catch (err) {
          console.error('Master Replication Pipeline Error:', err);
        } finally {
          set({ isSyncing: false });
        }
      },

      syncAll: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });
        try {
          await get().pushToCloud();
          await get().pullFromCloud();
          const paddedTime = new Date(Date.now() - 5 * 60000).toISOString();
          set({ lastSyncedAt: paddedTime });
        } catch (err) {
          console.error('Master Sync execution failed', err);
        } finally {
          set({ isSyncing: false });
        }
      },

      initRealtimeSubscription: () => {
        if (get().realtimeChannel) return;
        const channel = supabase.channel('koa_master_sync');
        set({ realtimeChannel: channel });

        channel
          .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
            const { lastPushedAt } = get();
            if (Date.now() - lastPushedAt < 3000) return;
            await get().pullFromCloud();
          })
          .subscribe();
      },

      startBackgroundWorker: () => {
        if (get()._workerActive) return;
        set({ _workerActive: true });

        // Wake up every 15 seconds to flush the PGLite queue
        setInterval(() => {
          if (navigator.onLine) {
            get().pushToCloud();
          }
        }, 15000);

        // Instantly flush the queue the moment Wi-Fi reconnects
        window.addEventListener('online', () => {
          get().pushToCloud();
        });
      }
    }),
    {
      name: 'koa-sync-storage',
      partialize: (state) => ({ lastSyncedAt: state.lastSyncedAt, lastPushedAt: state.lastPushedAt }),
    }
  )
);
