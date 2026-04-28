import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { Dashboard } from '../features/dashboard/Dashboard';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <Dashboard />
    </div>
  );
}
