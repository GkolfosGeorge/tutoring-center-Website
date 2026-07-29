"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Loader2, BookOpen } from "lucide-react";

export default function FlipbookViewer({
  fileId,
  title,
  open,
  onClose,
}: {
  fileId: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Start each page at the top instead of wherever the previous page was scrolled to.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    if (!open || pages.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIndex(0);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(`/api/dashboard/files/${fileId}/view`);
        if (!res.ok) throw new Error("failed to fetch");
        const data = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;

        // Render well above typical screen resolution so the page stays crisp
        // even scaled up to fill the full viewport on large/retina displays.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = 3 * dpr;

        const rendered: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          rendered.push(canvas.toDataURL("image/jpeg", 0.95));
        }
        if (!cancelled) setPages(rendered);
      } catch {
        if (!cancelled) setError("Δεν ήταν δυνατή η φόρτωση του αρχείου.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, fileId, pages.length]);

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => Math.min(i + 1, pages.length - 1));
  }, [pages.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, onClose]);

  if (!mounted) return null;

  // Portalled to document.body so a parent's CSS transform (e.g. framer-motion's
  // `y` animation on the dashboard layout) can't trap this fixed overlay inside
  // a smaller box than the real viewport.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-[70] select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Page fills the full width (zoomed in) and scrolls vertically so
              nothing is permanently cropped off the top or bottom. */}
          <div className="absolute inset-0" style={{ perspective: 2000 }}>
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm text-white/70">Φόρτωση...</p>
                </div>
              </div>
            ) : error ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : pages.length > 0 ? (
              <div ref={scrollRef} className="w-full h-full overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={index}
                    src={pages[index]}
                    initial={{ opacity: 0, rotateY: direction > 0 ? 35 : -35 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: direction > 0 ? -35 : 35 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    draggable={false}
                    className="w-screen h-auto block pointer-events-none"
                    alt={`Σελίδα ${index + 1}`}
                  />
                </AnimatePresence>
              </div>
            ) : null}
          </div>

          {/* Floating controls — overlaid on top, don't take space away from the page */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 text-white bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <div className="flex items-center gap-2 min-w-0 pointer-events-auto">
              <BookOpen className="w-5 h-5 text-blue-400 shrink-0" />
              <h2 className="font-medium truncate">{title}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white shrink-0 pointer-events-auto">
              <X className="w-6 h-6" />
            </button>
          </div>

          {pages.length > 0 && (
            <>
              <button
                onClick={prev}
                disabled={index === 0}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={next}
                disabled={index === pages.length - 1}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-0 inset-x-0 flex items-center justify-center py-3 text-white bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                <span className="text-sm text-white/80">{index + 1} / {pages.length}</span>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
