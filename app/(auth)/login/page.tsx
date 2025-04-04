"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiGoogle } from "react-icons/si";
import Image from "next/image";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Logo and Brand */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center mb-6 ml-[150px]">
            <Image height={300} width={300} src="/logo.png" alt="Logo" />
          </div>
          <h1 className="overflow-hidden text-[#565C68] text-ellipsis font-['Manrope'] text-[35.044px] font-[400] leading-[66.932px] whitespace-nowrap ml-[80px]">
            MailToSocial
          </h1>
        </div>
      </div>
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[438px] p-[32px] bg-[rgba(255,255,255,0.02)] rounded-[16px] border border-gray-800">
          <div className="flex flex-col w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-white mb-2">
                Log in to your account
              </h2>
              <p className="text-gray-400 text-sm">
                Welcome back! Please enter your details
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 bg-[rgba(255,255,255,0.04)] rounded-lg border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-3 bg-[rgba(255,255,255,0.04)] rounded-lg border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="cursor-pointer w-full py-3 border border-gray-700 text-white rounded-lg font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <SiGoogle className="h-5 w-5" />
                Sign In with Google
              </button>

              <div className="mt-8 text-center">
                <span className="text-gray-400">Don&apos;t have an account? </span>
                <Link href="/signup" className="text-white hover:underline">
                  Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}