import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { IsolationView } from '../features/medical/IsolationView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/isolations',
  component: IsolationView,
});
