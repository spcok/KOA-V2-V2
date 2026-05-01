import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { GlobalClinicalRecordsView } from '../features/medical/GlobalClinicalRecordsView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clinical-records',
  component: GlobalClinicalRecordsView,
});
