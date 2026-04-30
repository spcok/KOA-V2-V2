import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { MaintenanceView } from '../features/maintenance/MaintenanceView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maintenance',
  component: MaintenanceView,
});
