"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Megaphone, Trash2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type GroupSummary = { id: string; name: string };
type Announcement = {
  id: string;
  message: string;
  createdAt: string;
  groups: { group: GroupSummary }[];
};

export default function AnnouncementsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [gRes, aRes] = await Promise.all([
      fetch("/api/groups"),
      fetch("/api/announcements"),
    ]);
    if (gRes.ok) {
      const gs = await gRes.json();
      setGroups(Array.isArray(gs) ? gs.map((g: any) => ({ id: g.id, name: g.name })) : []);
    }
    if (aRes.ok) setAnnouncements(await aRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function submit() {
    if (!message.trim() || groupIds.length === 0) return;
    setSubmitting(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), groupIds }),
    });
    if (res.ok) {
      setMessage("");
      setGroupIds([]);
      await load();
    } else {
      alert("Σφάλμα κατά την αποστολή");
    }
    setSubmitting(false);
  }

  async function remove(id: string) {
    if (!confirm("Διαγραφή ανακοίνωσης;")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                Ανακοινώσεις
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Νέο μήνυμα
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="π.χ. Ανέβηκαν οι λύσεις του πρώτου διαγωνίσματος στον φάκελο Διαγωνίσματα."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Τμήματα *
                </label>
                {groups.length === 0 ? (
                  <p className="text-sm text-gray-400">Δεν υπάρχουν τμήματα</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <label
                        key={g.id}
                        className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                          groupIds.includes(g.id) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded text-blue-600"
                          checked={groupIds.includes(g.id)}
                          onChange={() =>
                            setGroupIds((prev) => (prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]))
                          }
                        />
                        {g.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={submit} disabled={submitting || !message.trim() || groupIds.length === 0} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Αποστολή
              </Button>

              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ιστορικό</h3>
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  </div>
                ) : announcements.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Δεν έχουν σταλεί ανακοινώσεις ακόμα.</p>
                ) : (
                  <div className="space-y-2">
                    {announcements.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 line-clamp-2">{a.message}</p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {a.groups.map((ag) => ag.group.name).join(", ")}
                            {" · "}
                            {new Date(a.createdAt).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <button
                          onClick={() => remove(a.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
