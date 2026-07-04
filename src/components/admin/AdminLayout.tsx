"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, FolderOpen,
  FileText, Trophy, LogOut, Menu, GraduationCap, ChevronRight, CalendarDays, Layers, ClipboardList
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin/calendar", label: "Ημερολόγιο", icon: CalendarDays },
  { href: "/admin/groups", label: "Τμήματα", icon: Layers },
  { href: "/admin/students", label: "Μαθητές", icon: Users },
  { href: "/admin/files", label: "Αρχεία", icon: FolderOpen },
  { href: "/admin/exams", label: "Τέστ/Διαγωνίσματα", icon: ClipboardList },
  { href: "/admin/blog", label: "Edu-Shots Blog", icon: FileText },
  { href: "/admin/success-stories", label: "Επιτυχόντες", icon: Trophy },
];

const secretaryItems = [
  { href: "/admin/calendar", label: "Ημερολόγιο", icon: CalendarDays },
  { href: "/admin/groups", label: "Τμήματα", icon: Layers },
  { href: "/admin/students", label: "Μαθητές", icon: Users },
];

export default function AdminLayout({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName: string;
  role: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const visibleItems = role === "SECRETARY" ? secretaryItems : navItems;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block">Apex Academy</span>
            <span className="text-gray-400 text-xs">Admin Panel</span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Σύνδεση</p>
          <p className="font-medium text-white text-sm truncate">{userName}</p>
          <span className="text-xs text-blue-400">{role}</span>
        </div>

        <nav className="px-3 py-4 space-y-0.5">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3 space-y-1">
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Portal Μαθητή
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Αποσύνδεση
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500">
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-gray-900">Panel Διαχείρισης</h2>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-4 lg:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
