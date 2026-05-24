import { Clock } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { Card } from "../../components/ui/card";

export function PendingVerificationPage() {
  const { profile, role } = useAuth();
  return <main className="grid min-h-screen place-items-center bg-[#f5f2ea] p-4">
    <Card className="max-w-xl text-center">
      <Clock className="mx-auto text-amber-600" size={32}/>
      <p className="mt-4 text-xs font-black uppercase tracking-[.22em] text-purple-600">Verification Pending</p>
      <h1 className="mt-3 text-3xl font-black">Your profile is submitted.</h1>
      <p className="mt-3 text-sm text-slate-600">{role === "Corporate Partner" ? "Partner access is awaiting admin approval." : "Student access is awaiting mentor or admin verification."}</p>
      <p className="mt-3 text-sm font-bold text-slate-700">{profile?.fullName} · {profile?.email}</p>
    </Card>
  </main>;
}
