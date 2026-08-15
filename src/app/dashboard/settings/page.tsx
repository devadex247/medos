"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { getRoleLabel } from "@/lib/rbac";
import { Settings, User, Lock, LogOut, Loader2, CheckCircle2, Key, Copy, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type InviteTokenInfo = {
  token: string;
  createdAt: string;
  hospitalName: string;
  signupUrl: string;
};

type InviteTokenResponse = Partial<InviteTokenInfo> & {
  error?: string;
};

type HospitalRelation = {
  name?: string;
} | {
  name?: string;
}[] | null;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.name === "AbortError"
      ? "Invite token request timed out. Try again or refresh the page."
      : error.message;
  }

  return "Invite token could not be loaded.";
}

function getReadableHttpError(status: number, body: string) {
  if (status === 404 || body.trim().startsWith("<!DOCTYPE html")) {
    return "Invite token endpoint was not found in the running app. The deployed build may still be updating.";
  }

  return "Invite token endpoint did not return a readable JSON response.";
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [profile, setProfile] = useState<{ username: string; full_name: string; email: string; phone_number: string; role: string } | null>(null);
  const [form, setForm] = useState({ full_name: "", phone_number: "" });
  const [inviteToken, setInviteToken] = useState<InviteTokenInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [appOrigin, setAppOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [error, setError] = useState("");

  const loadInviteTokenFromSupabase = useCallback(async (): Promise<InviteTokenInfo> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Please sign in again to load the invite token.");
    }

    const { data: membership, error: membershipError } = await supabase
      .from("hospital_memberships")
      .select("hospital_id, hospitals(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      throw new Error("No active hospital workspace membership was found.");
    }

    const { data: token, error: tokenError } = await supabase
      .from("hospital_access_tokens")
      .select("access_token, created_at")
      .eq("hospital_id", membership.hospital_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError || !token) {
      throw new Error("No active invite token was found for this hospital.");
    }

    const hospitalRelation = membership.hospitals as HospitalRelation;
    const hospital = Array.isArray(hospitalRelation)
      ? hospitalRelation[0]
      : hospitalRelation;

    return {
      token: token.access_token,
      createdAt: token.created_at,
      hospitalName: hospital?.name ?? "Hospital Workspace",
      signupUrl: "/signup/join",
    };
  }, [supabase]);

  const loadInviteTokenInfo = useCallback(async () => {
    setInviteLoading(true);
    setInviteError("");
    setInviteToken(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch("/api/hospital/invite-token", { signal: controller.signal });
      const contentType = response.headers.get("content-type") ?? "";
      const result: InviteTokenResponse = contentType.includes("application/json")
        ? await response.json()
        : { error: getReadableHttpError(response.status, await response.text()) };

      if (!response.ok) {
        throw new Error(result.error || "Invite token could not be loaded.");
      }

      if (!result.token || !result.createdAt || !result.hospitalName || !result.signupUrl) {
        throw new Error("Invite token response was incomplete.");
      }

      setInviteToken({
        token: result.token,
        createdAt: result.createdAt,
        hospitalName: result.hospitalName,
        signupUrl: result.signupUrl,
      });
    } catch (err) {
      const primaryError = getErrorMessage(err);

      try {
        const fallbackToken = await loadInviteTokenFromSupabase();
        setInviteToken(fallbackToken);
        return;
      } catch (fallbackErr) {
        setInviteError(`${primaryError} ${getErrorMessage(fallbackErr)}`);
      }
    } finally {
      window.clearTimeout(timeout);
      setInviteLoading(false);
    }
  }, [loadInviteTokenFromSupabase]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("username, full_name, email, phone_number, role").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name ?? "", phone_number: data.phone_number ?? "" });

        if (data.role === "owner_admin" || data.role === "hospital_admin") {
          await loadInviteTokenInfo();
        }
      }
    };
    load();
    setAppOrigin(window.location.origin);
  }, [loadInviteTokenInfo, supabase]);

  const inviteUrl = inviteToken
    ? `${appOrigin}${inviteToken.signupUrl}?token=${encodeURIComponent(inviteToken.token)}`
    : "";
  const inviteMessage = inviteToken
    ? `Join ${inviteToken.hospitalName} on MedOS AI. Use hospital access token ${inviteToken.token} at ${inviteUrl}`
    : "";
  const whatsappHref = inviteMessage
    ? `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`
    : "#";

  const handleCopyToken = async () => {
    if (!inviteToken) return;
    await navigator.clipboard.writeText(inviteToken.token);
    setCopiedToken(true);
    window.setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleSaveProfile = async () => {
    setSaving(true); setSaved(false); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from("users").update({ full_name: form.full_name, phone_number: form.phone_number, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (err) setError(err.message);
    else {
      await recordActivity({
        action: "Updated profile information.",
        actionType: "update",
        tableName: "users",
        details: "Full name or phone number changed.",
      });
      setSaved(true);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setChangingPw(true); setPwSaved(false); setError("");
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setError(err.message);
    else { setPwSaved(true); setNewPassword(""); }
    setChangingPw(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings size={20} className="text-slate-400" /> Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your profile and security preferences</p>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

      {/* Profile */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <User size={18} className="text-med-teal" />
          <h2 className="text-sm font-semibold text-slate-200">Profile Information</h2>
        </div>

        {profile && (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-med-teal/30 to-med-accent/30 flex items-center justify-center text-xl font-bold text-white">
              {profile.full_name?.[0]?.toUpperCase() ?? profile.username[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{profile.full_name || profile.username}</p>
              <p className="text-xs text-slate-400">@{profile.username} · {getRoleLabel(profile.role)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{profile.email}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Phone Number</label>
            <input type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {saved && <div className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 size={14} /> Profile updated</div>}
          <button onClick={handleSaveProfile} disabled={saving}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-teal hover:bg-sky-400 text-white transition-all disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {profile && (profile.role === "owner_admin" || profile.role === "hospital_admin") && (
          <div className="border-t border-white/5 pt-5">
            <div className="rounded-xl border border-med-teal/20 bg-med-teal/5 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-med-teal/10 text-med-teal flex items-center justify-center flex-shrink-0">
                  <Key size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Hospital Invite Token</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Share this token with doctors, patients, or staff so they can join your hospital workspace.
                  </p>
                </div>
              </div>

              {inviteLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={16} className="animate-spin" /> Loading invite token...
                </div>
              ) : inviteError ? (
                <div className="space-y-3">
                  <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    {inviteError}
                  </p>
                  <button
                    type="button"
                    onClick={loadInviteTokenInfo}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 transition-all"
                  >
                    <Loader2 size={16} className={inviteLoading ? "animate-spin" : ""} />
                    Retry Token Load
                  </button>
                </div>
              ) : inviteToken ? (
                <>
                  <div className="rounded-lg bg-slate-950/60 border border-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Active token for {inviteToken.hospitalName}</p>
                    <p className="mt-2 text-2xl font-black font-mono tracking-widest text-med-teal break-all">
                      {inviteToken.token}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Created {new Date(inviteToken.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-teal hover:bg-sky-400 text-white transition-all"
                    >
                      {copiedToken ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      {copiedToken ? "Copied" : "Copy Token"}
                    </button>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-all"
                    >
                      <MessageCircle size={16} /> Share on WhatsApp
                    </a>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <Lock size={18} className="text-med-accent" />
          <h2 className="text-sm font-semibold text-slate-200">Security</h2>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters"
            className="w-full max-w-sm px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 outline-none focus:border-med-teal transition-colors" />
        </div>

        <div className="flex items-center gap-4">
          {pwSaved && <div className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 size={14} /> Password changed</div>}
          <button onClick={handleChangePassword} disabled={changingPw || !newPassword}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-accent hover:opacity-90 text-white transition-all disabled:opacity-40">
            {changingPw && <Loader2 size={14} className="animate-spin" />}
            {changingPw ? "Updating…" : "Change Password"}
          </button>
        </div>

        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Auto-logout</p>
            <p className="text-xs text-slate-500 mt-0.5">Session expires after 15 minutes of inactivity</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">Active</span>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
