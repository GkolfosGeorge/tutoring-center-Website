"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const spaces = [
  { title: "Αίθουσες Διδασκαλίας", desc: "Σύγχρονες αίθουσες με προτζέκτορες και ψηφιακούς πίνακες.", color: "from-blue-400 to-blue-600" },
  { title: "Βιβλιοθήκη & Μελέτη", desc: "Ήσυχος χώρος μελέτης με πρόσβαση σε βιβλία και υπολογιστές.", color: "from-purple-400 to-purple-600" },
  { title: "Εργαστήριο", desc: "Εξοπλισμένο εργαστήριο για πρακτικές ασκήσεις.", color: "from-emerald-400 to-emerald-600" },
  { title: "Αίθουσα Συζητήσεων", desc: "Χώρος για ομαδική εργασία και project-based learning.", color: "from-orange-400 to-orange-600" },
];

export default function SpacesSection() {
  return (
    <section id="spaces" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-3">
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Οι χώροι μας</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Περιβάλλον για <span className="gradient-text">μάθηση</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Σύγχρονες εγκαταστάσεις σχεδιασμένες για να εμπνέουν και να διευκολύνουν τη μάθηση.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {spaces.map((space, i) => (
            <motion.div
              key={space.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl h-48 cursor-pointer group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${space.color}`} />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative z-10 p-6 h-full flex flex-col justify-end text-white">
                <h3 className="text-xl font-bold mb-1">{space.title}</h3>
                <p className="text-white/80 text-sm">{space.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
