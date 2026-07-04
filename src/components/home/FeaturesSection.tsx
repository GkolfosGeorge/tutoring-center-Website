"use client";

import { motion } from "framer-motion";
import { BookOpen, BarChart2, FileText, CreditCard, Shield, Clock } from "lucide-react";

const features = [
  { icon: BarChart2, title: "Στατιστικά Βαθμών", desc: "Παρακολούθηση επίδοσης με γραφήματα, μέσους όρους και σύγκριση τάξης." },
  { icon: BookOpen, title: "Βιβλιοθήκη Αρχείων", desc: "Πρόσβαση σε διαγωνίσματα, λύσεις και εκπαιδευτικό υλικό PDF." },
  { icon: FileText, title: "Απουσίες", desc: "Online παρακολούθηση παρουσιολογίου και ενημέρωση γονέων." },
  { icon: CreditCard, title: "Οικονομικά", desc: "Ξεκάθαρη εικόνα υπολοίπου και ιστορικό πληρωμών." },
  { icon: Shield, title: "Ασφαλής Πρόσβαση", desc: "Προσωπικοί κωδικοί για κάθε μαθητή, πλήρης ασφάλεια δεδομένων." },
  { icon: Clock, title: "24/7 Διαθεσιμότητα", desc: "Πρόσβαση ανά πάσα στιγμή από οποιαδήποτε συσκευή." },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Όλα σε <span className="gradient-text">ένα μέρος</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Η πλατφόρμα μας δίνει στους μαθητές πλήρη εικόνα της πορείας τους.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
