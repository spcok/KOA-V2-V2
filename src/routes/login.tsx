import { createRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Route as rootRoute } from './__root';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginView,
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

function LoginView() {
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate({ from: '/login' });
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        setAuthError(null);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: value.email,
          password: value.password,
        });
        
        if (error) {
          setAuthError(error.message);
          return;
        }
        
        if (data.session) {
          setSession(data.session);
          navigate({ to: '/' });
        }
      } catch (err: any) {
        setAuthError(err?.message || 'An error occurred during sign in.');
      }
    },
  });

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900 font-sans text-slate-300">
      <div className="w-full max-w-sm p-8 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl">
        <div className="flex flex-col items-center gap-2 mb-6 justify-center">
          <div className="w-10 h-10 bg-emerald-500 rounded-md flex items-center justify-center text-slate-950 font-bold italic text-xl">
            K
          </div>
          <div className="text-center">
             <h1 className="text-xl font-bold tracking-tight text-slate-100">KOA Manager</h1>
             <p className="text-xs text-slate-400 font-mono tracking-wider mt-1">SYSTEM AUTHORIZATION</p>
          </div>
        </div>
        
        {authError && (
          <div className="mb-4 bg-rose-950/50 border border-rose-500 text-rose-500 p-3 rounded-md text-sm font-medium">
            {authError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="email"
            children={(field) => {
              const hasError = field.state.meta.errors.length > 0 || !!authError;
              return (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operator Email</label>
                  <input
                    type="email"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => { setAuthError(null); field.handleChange(e.target.value); }}
                    className={clsx(
                      "px-3 py-2 bg-slate-900 border rounded-md text-sm text-slate-200 focus:outline-none transition-colors",
                      hasError 
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" 
                        : "border-slate-700 focus:border-emerald-500"
                    )}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-xs text-rose-500">{field.state.meta.errors.join(', ')}</span>
                  )}
                </div>
              );
            }}
          />
          <form.Field
            name="password"
            children={(field) => {
              const hasError = field.state.meta.errors.length > 0 || !!authError;
              return (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passphrase</label>
                  <input
                    type="password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => { setAuthError(null); field.handleChange(e.target.value); }}
                    className={clsx(
                      "px-3 py-2 bg-slate-900 border rounded-md text-sm text-slate-200 focus:outline-none transition-colors",
                      hasError 
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" 
                        : "border-slate-700 focus:border-emerald-500"
                    )}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-xs text-rose-500">{field.state.meta.errors.join(', ')}</span>
                  )}
                </div>
              );
            }}
          />
          <button
            type="submit"
            disabled={form.state.isSubmitting}
            className="w-full flex items-center justify-center mt-6 px-4 py-2.5 bg-emerald-600 text-slate-50 text-sm font-bold rounded-md hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {form.state.isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Authenticating...
              </>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>
        
        <p className="mt-8 text-center text-[10px] text-slate-500 leading-relaxed">
          Warning: Unauthorized access to this system is strictly prohibited under the <strong className="text-slate-400 font-semibold">Computer Misuse Act 1990</strong>. All activity is logged.
        </p>
      </div>
    </div>
  );
}
