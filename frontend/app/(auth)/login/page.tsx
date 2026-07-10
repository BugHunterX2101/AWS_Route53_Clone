"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Globe, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage("Connecting to server...");

    // Warm-up timeout: after 5 sec show a cold-start hint
    const warmupTimer = setTimeout(() => {
      setStatusMessage("Server is waking up from sleep (free tier). Please wait ~30 seconds...");
    }, 5000);

    try {
      await login(email, password);
      clearTimeout(warmupTimer);
      setStatusMessage("Success! Redirecting...");
      router.push("/hosted-zones");
    } catch (err: unknown) {
      clearTimeout(warmupTimer);
      setStatusMessage(null);
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
        toastError(
          "Connection failed",
          "The backend server is unreachable. It may be waking up — wait 30 seconds and try again."
        );
      } else {
        toastError("Login failed", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-aws-blue flex flex-col">
      {/* AWS-style top bar */}
      <header className="bg-aws-navy border-b border-gray-700 px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-aws-orange rounded flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">AWS Management Console</span>
        </div>
      </header>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg shadow-aws-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-aws-blue px-8 py-6 text-center">
              <div className="w-16 h-16 bg-aws-orange/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Globe className="w-9 h-9 text-aws-orange" />
              </div>
              <h1 className="text-white text-xl font-semibold">Sign in</h1>
              <p className="text-gray-400 text-sm mt-1">Route53 Management Console</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="email@example.com"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-9 pr-9"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status / cold-start message */}
              {statusMessage && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                  <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full justify-center py-2.5 text-base"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                <strong>Demo credentials:</strong><br />
                Email: admin@example.com<br />
                Password: password123<br />
                <span className="text-blue-500 mt-1 block">
                  First login may take up to 30 seconds (free server wake-up)
                </span>
              </div>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-4">
            &copy; 2026 AWS Route53 Clone. For evaluation purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
