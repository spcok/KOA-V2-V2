import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { DailyRoundsView } from '../features/rounds/DailyRoundsView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daily-rounds',
  component: DailyRoundsView,
});
