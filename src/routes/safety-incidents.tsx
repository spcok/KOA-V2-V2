import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { SafetyIncidentView } from '../features/safety/SafetyIncidentView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/safety-incidents',
  component: SafetyIncidentView,
});
