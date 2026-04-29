import { createRoute, useNavigate } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { AnimalProfileView } from '../features/animals/AnimalProfileView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/animals/$animalId',
  component: AnimalProfileWrapper,
});

function AnimalProfileWrapper() {
  const { animalId } = Route.useParams();
  const navigate = useNavigate();
  return <AnimalProfileView animalId={animalId} onBack={() => navigate({ to: '/' })} />;
}
