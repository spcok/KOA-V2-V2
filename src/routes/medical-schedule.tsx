import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { GlobalMedicalScheduleView } from '../features/medical/GlobalMedicalScheduleView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical-schedule',
  component: GlobalMedicalScheduleView,
});
