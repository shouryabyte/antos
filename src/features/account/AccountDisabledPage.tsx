import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/button";

export function AccountDisabledPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const logout = async () => {
    await auth.logout();
    navigate("/login", { replace:true });
  };
  return <main className="grid min-h-screen place-items-center bg-[#f5f2ea] p-4">
    <section className="max-w-lg rounded-3xl border border-white bg-white/80 p-8 text-center shadow-soft">
      <p className="text-xs font-black uppercase tracking-[.22em] text-red-600">Account disabled</p>
      <h1 className="mt-3 text-3xl font-black">Your account is not active.</h1>
      <p className="mt-3 text-sm text-slate-600">Please contact your administrator. Current status: <span className="font-black">{auth.profile?.status || "Unavailable"}</span>.</p>
      <Button className="mt-6" onClick={logout}><LogOut size={16}/> Sign out</Button>
    </section>
  </main>;
}
