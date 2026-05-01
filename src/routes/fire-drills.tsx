import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { FireDrillView } from '../features/safety/FireDrillView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fire-drills',
  component: FireDrillView,
});
