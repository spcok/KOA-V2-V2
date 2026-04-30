import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { Dashboard } from '../features/dashboard/Dashboard';
import { queryClient } from '../lib/queryClient';
import { db } from '../lib/db';

const getLocalToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const dashboardQueryOptions = (viewDate: string) => ({
  queryKey: ['dashboardData', viewDate],
  queryFn: async () => {
    const animalsRes = await db.query("SELECT * FROM animals ORDER BY name ASC");
    
    const boundaryDate = new Date();
    boundaryDate.setDate(boundaryDate.getDate() - 60);
    const isoBound = boundaryDate.toISOString().split('T')[0];

    const logsRes = await db.query(
      "SELECT * FROM daily_logs WHERE is_deleted = false AND log_date >= $1 ORDER BY log_date DESC",
      [isoBound]
    );
    
    return { animals: animalsRes.rows, logs: logsRes.rows };
  }
});

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: async () => {
    // Pre-fetch today's dashboard data before transitioning the route
    await queryClient.ensureQueryData(dashboardQueryOptions(getLocalToday()));
  },
  component: Dashboard,
});
