import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation, Navigate } from "react-router";
import { Send, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, LoginFields } from "@/features/auth/schemas/login.schema";
import { FormField, Input } from "@/components/ui/form-controls";
import { toast } from "sonner";

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@bulksms.com",
      password: "",
      remember: false,
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
        <div className="w-10 h-10 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!", {
        description: "Successfully signed in to BulkSMS Pro.",
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error("Authentication failed", {
        description: err.message || "Invalid credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#F8FAF8]">
      {/* Left pane - Sage Green Glassmorphism Branding */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden text-white"
        style={{ background: "#16211D" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(142,165,140,0.18), transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 -right-20 w-96 h-96 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(114,138,114,0.14), transparent 70%)",
            }}
          />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} viewBox="0 0 500 600" fill="none">
            <path d="M0 300 Q125 200 250 300 T500 300" stroke="#8EA58C" strokeWidth="1.5" fill="none" />
            <path d="M0 350 Q125 250 250 350 T500 350" stroke="#8EA58C" strokeWidth="1" fill="none" />
            <circle cx="80" cy="120" r="40" stroke="#8EA58C" strokeWidth="0.5" fill="none" />
            <circle cx="420" cy="480" r="60" stroke="#8EA58C" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8EA58C] flex items-center justify-center">
            <Send size={17} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">BulkSMS Pro</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-[2rem] font-bold text-white leading-snug">
              Enterprise SMS<br />Campaign Management
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Reach millions of customers with precision. Track delivery, analyze performance, and scale your campaigns without limits.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Messages/Day", value: "10M+" },
              { label: "Delivery Rate", value: "98.7%" },
              { label: "Active Gateways", value: "5" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-4 border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="text-[#8EA58C] font-bold text-xl">{s.value}</div>
                <div className="text-xs mt-1 text-white/35">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/20">
          © 2025 BulkSMS Pro · Enterprise Edition
        </div>
      </div>

      {/* Right pane - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#8EA58C] flex items-center justify-center">
              <Send size={14} className="text-white" />
            </div>
            <span className="text-[#1F2937] font-bold">BulkSMS Pro</span>
          </div>

          <h1 className="text-2xl font-bold text-[#1F2937]">Welcome back</h1>
          <p className="text-sm text-[#64748B] mt-1 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email address" error={errors.email?.message}>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10"
                  error={!!errors.email}
                  {...register("email")}
                />
              </div>
            </FormField>

            <FormField label="Password" error={errors.password?.message}>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  error={!!errors.password}
                  {...register("password")}
                />
              </div>
            </FormField>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#E4EAE2] accent-[#8EA58C] cursor-pointer"
                  {...register("remember")}
                />
                <span className="text-xs text-[#64748B] font-semibold">Remember me</span>
              </label>
              <button
                type="button"
                className="text-xs text-[#8EA58C] font-semibold hover:underline cursor-pointer bg-transparent border-0"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#8EA58C] text-white font-semibold rounded-xl hover:bg-[#7a9278] transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer border-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Send size={15} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#94A3B8] mt-8">
            Protected by enterprise-grade encryption · SOC 2 Compliant
          </p>
        </div>
      </div>
    </div>
  );
}

#