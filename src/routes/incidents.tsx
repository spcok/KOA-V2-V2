import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { IncidentView } from '../features/incidents/IncidentView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/incidents',
  component: IncidentView,
});
