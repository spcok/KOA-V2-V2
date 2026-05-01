import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { GlobalMedicationLogsView } from '../features/medical/GlobalMedicationLogsView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medication-logs',
  component: GlobalMedicationLogsView,
});
