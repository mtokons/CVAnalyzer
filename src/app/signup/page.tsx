"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      toast.error(data.error || "Failed to create account");
      return;
    }

    // Auto sign-in after successful registration.
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      toast.success("Account created — please sign in");
      router.push("/login");
      return;
    }
    toast.success("Account created!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Start building AI-tailored CVs in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-5 p-8">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-brand-500"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Tip: use the same email you apply to jobs with —{" "}
              <span className="font-medium text-brand-300">Gmail preferred</span> — so we can track
              employer replies for you.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
