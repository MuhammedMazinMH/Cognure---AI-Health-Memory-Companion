"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, LogOut } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setFullName((data.user?.user_metadata?.full_name as string) ?? "");
    });
  }, [supabase]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Settings</h1>
        <p className="mt-0.5 text-sm text-charcoal/50">
          Manage your account preferences.
        </p>
      </div>

      {/* Settings body */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Profile card */}
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-lg font-semibold text-charcoal">
                Profile
              </CardTitle>
              <CardDescription className="text-sm text-charcoal/45">
                Update how your name appears in Cognure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-charcoal">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="h-10 rounded-xl border-border bg-muted text-charcoal/50"
                  />
                  <p className="text-xs text-charcoal/35">
                    Email cannot be changed here.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-charcoal">
                    Full name
                  </Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 rounded-xl border-border"
                  />
                </div>

                {saveError && (
                  <p className="rounded-xl bg-coral/8 px-4 py-2.5 text-sm text-coral">
                    {saveError}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-xl bg-sage px-5 text-sm font-semibold text-white shadow-sm hover:bg-sage/90"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-sage">
                      <Check className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account card */}
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-lg font-semibold text-charcoal">
                Account
              </CardTitle>
              <CardDescription className="text-sm text-charcoal/45">
                Sign out of Cognure on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex h-10 items-center gap-2 rounded-xl border-coral/40 text-sm text-coral hover:bg-coral/8 hover:text-coral"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
