import { createRouter } from '@tanstack/react-router';
import { Route as rootRoute } from './routes/__root';
import { Route as indexRoute } from './routes/index';
import { Route as loginRoute } from './routes/login';
import { Route as devDbRoute } from './routes/dev/db';
import { Route as devDbDailylogsRoute } from './routes/dev/db_dailylogs';
import { Route as dailyLogsRoute } from './routes/daily-logs';
import { Route as settingsRoute } from './routes/settings';
import { Route as adminRoute } from './routes/admin';
import { Route as dailyRoundsRoute } from './routes/daily-rounds';
import { Route as feedingSchedulesRoute } from './routes/feeding-schedules';

const routeTree = rootRoute.addChildren([
  loginRoute, 
  indexRoute, 
  devDbRoute, 
  devDbDailylogsRoute, 
  dailyLogsRoute, 
  settingsRoute, 
  adminRoute,
  dailyRoundsRoute,
  feedingSchedulesRoute
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    auth: undefined!, // Injected at runtime
  },
  defaultErrorComponent: ({ error }) => (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-slate-50">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-lg w-full shadow-sm text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h1 className="text-xl font-black text-red-900 mb-2">Module Crash Prevented</h1>
        <p className="text-sm text-red-700 mb-4">The router caught an unexpected error in this view, preventing a total application crash.</p>
        <div className="bg-white p-3 rounded-xl border border-red-100 text-left overflow-x-auto">
          <code className="text-xs text-red-600 font-mono whitespace-pre-wrap">{error.message}</code>
        </div>
      </div>
    </div>
  ),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
