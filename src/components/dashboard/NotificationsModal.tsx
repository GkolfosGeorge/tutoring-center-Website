"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Bell } from "lucide-react";

export type Announcement = { id: string; message: string; createdAt: string };

export default function NotificationsModal({
  open,
  onClose,
  announcements,
}: {
  open: boolean;
  onClose: () => void;
  announcements: Announcement[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Ειδοποιήσεις
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {announcements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Δεν υπάρχουν ειδοποιήσεις.</p>
              ) : (
                <div className="space-y-2">
                  {announcements.map((a, i) => (
                    <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">{a.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(a.createdAt).toLocaleDateString("el-GR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
