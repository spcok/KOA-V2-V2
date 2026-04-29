import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { FeedingScheduleView } from '../features/feeding/FeedingScheduleView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feeding-schedules',
  component: FeedingScheduleView,
});
