import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import type { RoleName } from "../../auth/permissions";
import { Button } from "../../components/ui/button";
import { isSupabaseConfigured } from "../../lib/supabase";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(true)
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState<RoleName | null>(null);
  const seededPassword = isSupabaseConfigured ? "Antos@12345" : "password";
  const form = useForm<LoginForm>({ resolver: zodResolver(schema), defaultValues: { email:"superadmin@antos.dev", password:seededPassword, remember:true } });
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";

  useEffect(() => {
    const inviteToken = new URLSearchParams(location.search).get("invite");
    if (inviteToken) {
      navigate(`/accept-invite?token=${encodeURIComponent(inviteToken)}`, { replace: true });
      return;
    }
    if (auth.isAuthenticated) navigate("/dashboard", { replace: true });
  }, [auth.isAuthenticated, location.search, navigate]);

  if (auth.isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await auth.login(values);
      navigate(from === "/login" ? "/dashboard" : from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    }
  });

  const loginAs = async (role: RoleName) => {
    setError("");
    const account = seededAccounts.find((item) => item.role === role);
    if (!account) return;

    form.setValue("email", account.email, { shouldValidate: true });
    form.setValue("password", seededPassword, { shouldValidate: true });

    if (isSupabaseConfigured) return;

    setDemoLoading(role);
    try {
      await auth.loginAsDemo(role);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setDemoLoading(null);
    }
  };

  return <main className="min-h-screen bg-[#f5f2ea] p-4">
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white bg-white/70 shadow-soft lg:grid-cols-[1.05fr_.95fr]">
        <section className="bg-[#050505] p-8 text-white lg:p-12">
          <Link to="/dashboard" className="flex items-center gap-3"><img src="/logo.svg" alt="AntBox" className="h-12 w-12 rounded-2xl object-contain" /><div><p className="text-xl font-black">AntOS</p><p className="text-xs text-white/50">AntBox Operating System</p></div></Link>
          <p className="mt-16 text-xs font-black uppercase tracking-[.25em] text-purple-300">AI Talent Readiness Platform</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight lg:text-6xl">One secure operating system for AntBox teams.</h1>
          <p className="mt-5 max-w-xl text-white/65">Sign in to access employees, students, sprints, projects, deployment, finance, and corporate talent operations.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {["Protected ERP routes",isSupabaseConfigured ? "Supabase Auth active" : "Demo mode fallback","Session persistence","Database-backed RBAC"].map((item)=><div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="mb-3 text-emerald-400" size={20}/><p className="font-bold">{item}</p></div>)}
          </div>
        </section>
        <section className="p-6 lg:p-10">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Secure login</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Enter AntOS</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{isSupabaseConfigured ? "Use seeded Supabase accounts. Password: Antos@12345." : "Supabase env is missing. Demo fallback is active. Password: password."}</p>
            {auth.authError && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{auth.authError}</div>}
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">Email
              <input className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-emerald-400" {...form.register("email")} />
              {form.formState.errors.email && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.email.message}</span>}
            </label>
            <label className="block text-sm font-bold text-slate-700">Password
              <input type="password" className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-emerald-400" {...form.register("password")} />
              {form.formState.errors.password && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.password.message}</span>}
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" className="h-4 w-4 accent-emerald-500" {...form.register("remember")} /> Remember session</label>
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            <Button className="h-12 w-full rounded-2xl" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <LockKeyhole size={18}/>} Sign in <ArrowRight size={18}/>
            </Button>
          </form>
          <div className="mt-8">
            <p className="mb-3 text-sm font-black text-slate-700">{isSupabaseConfigured ? "Seeded Supabase accounts" : "Demo role login"}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {seededAccounts.map((u)=><button key={u.email} type="button" onClick={()=>loginAs(u.role)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold transition hover:border-emerald-300 hover:bg-emerald-50">
                <span>{u.role}</span>{demoLoading === u.role ? <Loader2 className="animate-spin" size={16}/> : <ArrowRight size={16}/>}
              </button>)}
            </div>
            <p className="mt-4 text-xs text-slate-500">{isSupabaseConfigured ? "Selecting a role fills the seeded email and password. Use Sign in to authenticate with Supabase." : <>Demo password for every account is <span className="font-bold">{seededPassword}</span>.</>}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Employee, intern, and admin access is invitation-only. Student registration and partner access requests are limited-role workflows.</p>
          </div>
        </section>
      </div>
    </div>
  </main>;
}

const seededAccounts: Array<{ role: RoleName; email: string }> = [
  { role: "Super Admin", email: "superadmin@antos.dev" },
  { role: "HR Manager", email: "hr@antos.dev" },
  { role: "Project Manager", email: "pm@antos.dev" },
  { role: "Mentor", email: "mentor@antos.dev" },
  { role: "Finance Manager", email: "finance@antos.dev" },
  { role: "Employee", email: "employee@antos.dev" },
  { role: "Intern", email: "intern@antos.dev" },
  { role: "Student", email: "student@antos.dev" },
  { role: "Corporate Partner", email: "partner@antos.dev" }
];
