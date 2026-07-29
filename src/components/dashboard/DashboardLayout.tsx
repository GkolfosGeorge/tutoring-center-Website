"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays, BookOpen, UserX, FolderOpen,
  Menu, GraduationCap, ChevronRight, Bell
} from "lucide-react";
import { signOut } from "next-auth/react";
import Footer from "@/components/layout/Footer";
import NotificationsModal, { type Announcement } from "./NotificationsModal";

const NOTIFICATIONS_ITEM = { href: null, label: "Ειδοποιήσεις", icon: Bell };

const navItems = [
  NOTIFICATIONS_ITEM,
  { href: "/dashboard", label: "Ημερολόγιο", icon: CalendarDays },
  { href: "/dashboard/grades", label: "Βαθμοί", icon: BookOpen },
  { href: "/dashboard/absences", label: "Απουσίες", icon: UserX },
  { href: "/dashboard/files", label: "Αρχεία", icon: FolderOpen },
];

export default function DashboardLayout({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/dashboard/announcements")
      .then((r) => (r.ok ? r.json() : { announcements: [], unseenCount: 0 }))
      .then((data) => {
        setAnnouncements(data.announcements ?? []);
        setUnseenCount(data.unseenCount ?? 0);
      });
  }, []);

  function toggleNotifications() {
    setNotificationsOpen((wasOpen) => {
      const next = !wasOpen;
      if (next && unseenCount > 0) {
        fetch("/api/dashboard/announcements", { method: "POST" });
        setUnseenCount(0);
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Apex Academy</span>
        </div>

        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Συνδεδεμένος ως</p>
          <p className="font-semibold text-gray-900 truncate">{userName}</p>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            if (!item.href) {
              return (
                <button
                  key={item.label}
                  onClick={() => { toggleNotifications(); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                  {unseenCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unseenCount}
                    </span>
                  )}
                </button>
              );
            }
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              ← Αρχική
            </Link>
            <Link href="/dashboard/payments" className="hover:text-gray-600">
              Πληρωμές
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hover:text-gray-600"
            >
              Έξοδος
            </button>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-4 lg:p-8"
        >
          {children}
        </motion.main>

        <Footer />
      </div>

      <NotificationsModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        announcements={announcements}
      />
    </div>
  );
}
