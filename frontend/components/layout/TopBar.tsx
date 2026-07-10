"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Globe, LogOut, User, Search } from "lucide-react";
import { useState } from "react";

export function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="h-12 bg-aws-navy border-b border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
      {/* AWS Logo area */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 bg-aws-orange rounded flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <span className="text-white text-sm font-semibold hidden md:block">AWS</span>
      </div>

      {/* Services label */}
      <div className="text-gray-300 text-sm hidden md:block">Services ▾</div>

      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Route53"
            className="w-full bg-white/10 text-white placeholder-gray-400 text-sm rounded pl-8 pr-3 py-1.5 border border-gray-600 focus:outline-none focus:border-aws-teal focus:bg-white/15"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Region label */}
      <div className="text-gray-300 text-sm hidden md:flex items-center gap-1">
        <Globe className="w-3.5 h-3.5" />
        Global
      </div>

      {/* Bell */}
      <button className="text-gray-300 hover:text-white transition-colors relative">
        <Bell className="w-5 h-5" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
        >
          <div className="w-6 h-6 bg-aws-teal rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="hidden md:block max-w-[120px] truncate">{user?.name || user?.email || "User"}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 bg-white rounded shadow-aws-lg border border-gray-200 w-52 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
