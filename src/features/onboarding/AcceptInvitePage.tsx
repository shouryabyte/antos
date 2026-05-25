import { zodResolver } from "@hookform/resolvers/zod";
import { format, isBefore, parseISO } from "date-fns";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { acceptInvitationForSignedInUser } from "../../lib/onboardingAutomation";
import { useAuth } from "../../auth/useAuth";

type PublicInvitation = {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  department_id: string | null;
  employee_id: string | null;
  student_id: string | null;
  corporate_partner_id: string | null;
  expires_at: string;
  status: string;
};

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Confirm password is required.")
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match."
});

type InviteForm = z.infer<typeof schema>;

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = params.get("token") || "";
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const form = useForm<InviteForm>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } });

  const invalidReason = useMemo(() => {
    if (!token) return "This invitation link is missing a token.";
    if (!invitation) return "";
    if (invitation.status === "Revoked") return "This invitation was revoked by an administrator.";
    if (invitation.status !== "Pending") return `This invitation is already ${invitation.status.toLowerCase()}.`;
    if (isBefore(parseISO(invitation.expires_at), new Date())) return "This invitation has expired.";
    return "";
  }, [invitation, token]);

  useEffect(() => {
    async function loadInvitation() {
      setLoading(true);
      setError("");
      if (!token) {
        setLoading(false);
        return;
      }
      if (!supabase) {
        setError("Supabase is not configured. Invitation acceptance requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setLoading(false);
        return;
      }
      const { data, error: rpcError } = await supabase
        .rpc("get_public_invitation_by_token", { p_invite_token: token })
        .maybeSingle();
      if (rpcError) {
        setError(rpcError.message);
      } else if (data) {
        setInvitation(data as PublicInvitation);
      }
      setLoading(false);
    }
    loadInvitation();
  }, [token]);

  const acceptInvite = form.handleSubmit(async (values) => {
    if (!supabase || !invitation || invalidReason) return;
    setError("");
    setMessage("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: values.password,
        options: {
          data: {
            full_name: invitation.full_name,
            invite_token: token,
            role: invitation.role_name
          }
        }
      });
      if (signUpError) throw signUpError;

      let user = data.user;
      if (!data.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: invitation.email, password: values.password });
        if (signInError || !signInData.user) {
          setMessage("Account created. Confirm your email if Supabase email confirmation is enabled, then sign in to complete your profile.");
          return;
        }
        user = signInData.user;
      }

      if (!user) throw new Error("Supabase did not return an authenticated user.");
      const accepted = await acceptInvitationForSignedInUser(user.id, invitation.email, token);
      if (!accepted) throw new Error("The invitation could not be accepted. It may have expired or already been used.");

      await auth.refreshAuth();
      navigate("/complete-profile", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invitation.");
    }
  });

  return <main className="min-h-screen bg-[#f5f2ea] p-4">
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white bg-white/75 shadow-soft lg:grid-cols-[.9fr_1.1fr]">
        <section className="bg-[#050505] p-8 text-white lg:p-12">
          <Link to="/login" className="flex items-center gap-3"><img src="/logo.svg" alt="AntBox" className="h-12 w-12 rounded-2xl object-contain" /><div><p className="text-xl font-black">AntOS</p><p className="text-xs text-white/50">Invitation Acceptance</p></div></Link>
          <p className="mt-16 text-xs font-black uppercase tracking-[.25em] text-emerald-300">Secure onboarding</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">Create your AntOS account.</h1>
          <p className="mt-5 max-w-xl text-white/65">Accept your invitation, set a password, and complete your profile before accessing role-based ERP modules.</p>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
            <ShieldCheck className="mb-3 text-emerald-400" size={22}/>
            <p className="font-bold">Service role keys are never used in the browser.</p>
          </div>
        </section>
        <section className="p-6 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Accept invite</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Set your password</h2>

          {loading && <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600"><Loader2 className="mr-2 inline animate-spin" size={18}/> Validating invitation...</div>}

          {!loading && (error || invalidReason || !invitation) && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            <p className="font-black">Invalid or expired invitation</p>
            <p className="mt-2">{error || invalidReason || "No invitation was found for this token."}</p>
            <Link to="/login" className="mt-4 inline-block font-black text-red-800 underline">Return to login</Link>
          </div>}

          {!loading && invitation && !invalidReason && <form onSubmit={acceptInvite} className="mt-8 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs font-black uppercase text-slate-400">Email</p><p className="mt-1 font-bold">{invitation.email}</p></div>
                <div><p className="text-xs font-black uppercase text-slate-400">Full name</p><p className="mt-1 font-bold">{invitation.full_name}</p></div>
                <div><p className="text-xs font-black uppercase text-slate-400">Assigned role</p><p className="mt-1 font-bold">{invitation.role_name}</p></div>
                <div><p className="text-xs font-black uppercase text-slate-400">Expires</p><p className="mt-1 font-bold">{format(parseISO(invitation.expires_at), "PPP")}</p></div>
              </div>
            </div>
            <label className="block text-sm font-bold text-slate-700">Password
              <input type="password" className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-emerald-400" {...form.register("password")} />
              {form.formState.errors.password && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.password.message}</span>}
            </label>
            <label className="block text-sm font-bold text-slate-700">Confirm password
              <input type="password" className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-emerald-400" {...form.register("confirmPassword")} />
              {form.formState.errors.confirmPassword && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.confirmPassword.message}</span>}
            </label>
            {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{message}</div>}
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            <Button className="h-12 w-full rounded-2xl" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" size={18}/> : null} Accept Invite <ArrowRight size={18}/>
            </Button>
          </form>}
        </section>
      </div>
    </div>
  </main>;
}
