import React from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { AnimalProfileView } from '../features/animals/AnimalProfileView';
import { queryClient } from '../lib/queryClient';
import { db } from '../lib/db';

export const animalProfileQueryOptions = (animalId: string) => ({
  queryKey: ['animal', animalId],
  queryFn: async () => {
    const res = await db.query("SELECT * FROM animals WHERE id = $1", [animalId]);
    return res.rows[0];
  }
});

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/animals/$animalId',
  loader: async ({ params }) => {
    // Pre-fetch the specific animal profile before transitioning the route
    await queryClient.ensureQueryData(animalProfileQueryOptions(params.animalId));
  },
  component: AnimalProfileWrapper,
});

function AnimalProfileWrapper() {
  const { animalId } = Route.useParams();
  const navigate = useNavigate();
  return <AnimalProfileView animalId={animalId} onBack={() => navigate({ to: '/' })} />;
}
