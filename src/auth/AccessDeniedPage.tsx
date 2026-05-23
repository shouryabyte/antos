import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { Button } from "../components/ui/button";

export function AccessDeniedPage() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();

  return <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center p-4">
    <section className="w-full max-w-2xl rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-soft">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600">
        <ShieldAlert size={30} />
      </div>
      <p className="mt-6 text-xs font-black uppercase tracking-[.25em] text-purple-600">AntOS Access Control</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-black">Access Denied</h1>
      <p className="mt-3 text-slate-600">You do not have permission to access this module.</p>
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-500">Signed in as</p>
        <p className="mt-1 font-black text-slate-900">{profile?.name || "AntOS user"}</p>
        <p className="mt-1 text-slate-600">Current role: <span className="font-black text-emerald-700">{role}</span></p>
      </div>
      <Button className="mt-6 rounded-2xl" onClick={() => navigate("/dashboard", { replace: true })}>
        <ArrowLeft size={18} /> Back to dashboard
      </Button>
    </section>
  </main>;
}
