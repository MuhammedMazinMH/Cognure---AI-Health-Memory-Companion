// The Settings page lets the user view their account, update their display
// name, and sign out. CLIENT component because it edits the Supabase session.
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

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load the current account details to pre-fill the form.
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setFullName((data.user?.user_metadata?.full_name as string) ?? "");
    });
  }, [supabase]);

  // Save the new display name to the user's metadata.
  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSavedMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    setSaving(false);
    setSavedMessage(error ? `Error: ${error.message}` : "Saved!");
  }

  // Sign out and return to the login screen.
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 font-heading text-3xl font-bold text-charcoal">
        Settings
      </h1>

      <div className="grid max-w-2xl gap-6">
        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update how your name appears in Cognure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {/* Email is read-only here; changing it needs verification. */}
                <Input id="email" value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {savedMessage && (
                <p className="text-sm text-sage">{savedMessage}</p>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="bg-sage text-white hover:bg-sage/90"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account / sign out card */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Sign out of Cognure on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-coral text-coral hover:bg-coral/10"
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
