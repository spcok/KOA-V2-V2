import { PGlite } from '@electric-sql/pglite';

export const db = new PGlite('idb://koa-local-db');

let isInitializing = false;
let hasInitialized = false;

export async function initDb() {
  if (isInitializing || hasInitialized) {
      console.log("[DB Core] Boot sequence already locked by another thread. Bypassing.");
      return;
  }
  isInitializing = true;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamp with time zone DEFAULT now()
      )
    `);

    const runMigration = async (version: string, queries: string[]) => {
      const { rows } = await db.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);
      if (rows.length === 0) {
        console.log(`[DB Core] Deploying Schema ${version}...`);
        for (const q of queries) await db.query(q);
        await db.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [version]);
        console.log(`[DB Core] Schema ${version} Secured.`);
      }
    };

    // V1 to V5: Strict Alignments (No 'status' phantom column in animals)
    await runMigration('V1', [
      `CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text, initials text NOT NULL, role text DEFAULT 'KEEPER', job_position text DEFAULT 'KEEPER', signature_data text, pin text DEFAULT '1111', is_deleted boolean DEFAULT false, deleted_at timestamp with time zone, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS animals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL DEFAULT 'unknown', species text NOT NULL DEFAULT 'unknown', location text NOT NULL DEFAULT 'unknown', is_deleted boolean NOT NULL DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS daily_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), animal_id uuid NOT NULL, log_type text NOT NULL DEFAULT 'GENERAL', log_date timestamp with time zone NOT NULL DEFAULT '1900-01-01', notes text DEFAULT 'none', weight_grams numeric DEFAULT -1, weight_unit text DEFAULT '-1', basking_temp_c numeric DEFAULT -1, cool_temp_c numeric DEFAULT -1, temperature_c numeric DEFAULT -1, food text DEFAULT 'N/A', quantity numeric DEFAULT -1, feed_time time without time zone DEFAULT '00:00:00', feed_method text DEFAULT 'N/A', cast_status text DEFAULT 'N/A', misted text DEFAULT 'N/A', water text DEFAULT 'N/A', is_deleted boolean NOT NULL DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS feeding_schedules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), animal_id uuid NOT NULL, scheduled_date date NOT NULL DEFAULT '1900-01-01', food_type text NOT NULL DEFAULT 'none', quantity numeric NOT NULL DEFAULT -1, calci_dust boolean NOT NULL DEFAULT false, additional_notes text DEFAULT 'NONE', is_completed boolean NOT NULL DEFAULT false, completed_at timestamp with time zone, completed_by uuid, is_deleted boolean NOT NULL DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now())`
    ]);

    await runMigration('V2', [
      `CREATE TABLE IF NOT EXISTS daily_rounds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), animal_id uuid NOT NULL, date date NOT NULL DEFAULT '1900-01-01', shift text NOT NULL DEFAULT 'AM', section text DEFAULT 'ALL', is_alive boolean NOT NULL DEFAULT true, water_checked boolean NOT NULL DEFAULT false, locks_secured boolean NOT NULL DEFAULT false, animal_issue_note text DEFAULT 'NONE', general_section_note text DEFAULT 'NONE', completed_by uuid NOT NULL, completed_at timestamp with time zone NOT NULL DEFAULT now(), is_deleted boolean NOT NULL DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now())`
    ]);

    await runMigration('V3', [
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'INDIVIDUAL'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS parent_mob_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS census_count integer NOT NULL DEFAULT 1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS latin_name text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '-1'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS distribution_map_url text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS hazard_rating text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_venomous boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'g'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS flying_weight_g numeric NOT NULL DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS winter_weight_g numeric NOT NULL DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS average_target_weight numeric NOT NULL DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_of_birth date NOT NULL DEFAULT '1900-01-01'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_dob_unknown boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS microchip_id text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS ring_number text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS has_no_id boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS red_list_status text NOT NULL DEFAULT 'UNK'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS description text[] NOT NULL DEFAULT ARRAY['none']`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS special_requirements text[] NOT NULL DEFAULT ARRAY['none']`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS critical_husbandry_notes text[] NOT NULL DEFAULT ARRAY['none']`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS ambient_temp_only boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_day_temp_c numeric NOT NULL DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_night_temp_c numeric NOT NULL DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS water_tipping_temp numeric DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_humidity_min_percent numeric DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_humidity_max_percent numeric DEFAULT -1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS misting_frequency text DEFAULT '-1'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS acquisition_date date NOT NULL DEFAULT '1900-01-01'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS acquisition_type text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS origin_location text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS lineage_unknown boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS sire_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS dam_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_boarding boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_quarantine boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_reason text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_type text NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone NOT NULL DEFAULT '1900-01-01 00:00:00+00'`
    ]);

    await runMigration('V4', [`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false`]);
    await runMigration('V5', [`ALTER TABLE animals ADD COLUMN IF NOT EXISTS sign_content text`]);

    // V6: Tasks Module
    await runMigration('V6', [
        `CREATE TABLE IF NOT EXISTS tasks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL DEFAULT 'NONE',
          description text DEFAULT 'NONE',
          assigned_to uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          due_date date DEFAULT '1900-01-01',
          task_type text DEFAULT 'GENERAL',
          status text DEFAULT 'PENDING',
          location text DEFAULT 'None',
          priority text DEFAULT 'MEDIUM',
          completed_at timestamp with time zone DEFAULT now(),
          completed_by uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          modified_by uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
      )`
    ]);

    // V7: Maintenance Module
    await runMigration('V7', [
        `CREATE TABLE IF NOT EXISTS maintenance_tickets (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL DEFAULT 'NONE',
          description text DEFAULT 'NONE',
          category text NOT NULL DEFAULT 'SITE',
          status text NOT NULL DEFAULT 'OPEN',
          priority text NOT NULL DEFAULT 'MEDIUM',
          location text NOT NULL DEFAULT 'None',
          equipment_tag text DEFAULT 'NONE',
          assigned_to uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          reported_by uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          modified_by uuid DEFAULT '00000000-0000-0000-0000-000000000000',
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now()
      )`
    ]);

    const { rows } = await db.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
    console.log(`[DB Core] Boot sequence complete. Active Schema: ${rows[0]?.version || 'Unknown'}`);
    hasInitialized = true;

  } catch (err) {
    console.error('[DB Core] FATAL INITIALIZATION ERROR:', err);
  } finally {
    isInitializing = false;
  }
}
