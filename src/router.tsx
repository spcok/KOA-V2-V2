import { createRouter } from '@tanstack/react-router';
import { Route as rootRoute } from './routes/__root';
import { Route as indexRoute } from './routes/index';
import { Route as loginRoute } from './routes/login';
import { Route as devDbRoute } from './routes/dev/db';
import { Route as devDbDailylogsRoute } from './routes/dev/db_dailylogs';
import { Route as dailyLogsRoute } from './routes/daily-logs';
import { Route as settingsRoute } from './routes/settings';
import { Route as adminRoute } from './routes/admin';

const routeTree = rootRoute.addChildren([loginRoute, indexRoute, devDbRoute, devDbDailylogsRoute, dailyLogsRoute, settingsRoute, adminRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
