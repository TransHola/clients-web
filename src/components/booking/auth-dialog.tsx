import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"

export function AuthDialog({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [authMode, setAuthMode] = React.useState<"login" | "signup" | "guest">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setAuthMode("login");
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    const supabase = createClient();

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
        onClose();
      } else if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName, is_company: false }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            full_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName || null,
            last_name: lastName || null,
            role: 'client',
            status: 'Active',
            preferences: { clientType: 'Individual' }
          });
        }
        onSuccess();
        onClose();
      } else if (authMode === "guest") {
        // Create an account with a secure random password so they get a session instantly
        const randomPassword = Math.random().toString(36).slice(-10) + "A1!a";
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: randomPassword,
          options: {
            data: { is_company: false }
          }
        });

        if (signUpError) {
          // If the user already exists, Supabase might return an error or fake success.
          // If they already exist, we should probably just send a magic link and tell them to check email?
          // Let's try sending a magic link
          if (signUpError.message.toLowerCase().includes("already registered")) {
            const { error: otpError } = await supabase.auth.signInWithOtp({ email });
            if (otpError) throw otpError;
            setSuccessMsg("Account exists. We've sent a magic link to your email to log in.");
            setLoading(false);
            return;
          } else {
            throw signUpError;
          }
        }

        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            role: 'client',
            status: 'Active',
            preferences: { clientType: 'Individual' }
          });
          
          // Send a reset password link (acts as a magic link for them to set a password later)
          await supabase.auth.resetPasswordForEmail(email);
        }

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl z-[9999]">
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-bold">
              {authMode === "login" ? "Welcome back" : authMode === "signup" ? "Create an account" : "Continue as Guest"}
            </DialogTitle>
            <DialogDescription>
              {authMode === "login" ? "Sign in to complete your booking." : authMode === "signup" ? "Sign up to save quotes and book rides." : "We'll securely save your booking to this email."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 pt-2">
            {/* Custom Tab Bar */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
              <button 
                type="button"
                onClick={() => { setAuthMode("login"); setError(""); setSuccessMsg(""); }}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${authMode === "login" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Log In
              </button>
              <button 
                type="button"
                onClick={() => { setAuthMode("signup"); setError(""); setSuccessMsg(""); }}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${authMode === "signup" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Sign Up
              </button>
              <button 
                type="button"
                onClick={() => { setAuthMode("guest"); setError(""); setSuccessMsg(""); }}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${authMode === "guest" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Guest
              </button>
            </div>
            
            {successMsg ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{successMsg}</p>
                <Button onClick={() => setSuccessMsg("")} variant="outline" className="mt-6 w-full">Back</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {authMode === "signup" && (
                  <div className="flex gap-4">
                    <Field className="flex-1">
                      <FieldLabel>First Name</FieldLabel>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </Field>
                    <Field className="flex-1">
                      <FieldLabel>Last Name</FieldLabel>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </Field>
                  </div>
                )}
                
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
                </Field>

                {authMode !== "guest" && (
                  <Field>
                    <FieldLabel>Password</FieldLabel>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </Field>
                )}
                
                {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                
                <Button type="submit" className="w-full mt-2 h-11 text-base font-bold bg-slate-900 hover:bg-slate-800 text-white" disabled={loading}>
                  {loading ? "Please wait..." : (authMode === "login" ? "Sign In" : authMode === "signup" ? "Create Account" : "Continue")}
                </Button>

                {authMode === "guest" && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    We will send a magic link to this email to help you access your bookings later.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
