import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { TimesheetView } from '../features/timesheets/TimesheetView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/timesheets',
  component: TimesheetView,
});
