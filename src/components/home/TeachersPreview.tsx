"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Teacher = {
  id: string;
  name: string;
  subject: string;
  bio: string | null;
  photoUrl: string | null;
};

export default function TeachersPreview({ teachers }: { teachers: Teacher[] }) {
  if (teachers.length === 0) return null;

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Οι <span className="gradient-text">Καθηγητές</span> μας
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Έμπειροι εκπαιδευτικοί με πάθος για τη διδασκαλία.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {teachers.map((teacher, i) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {teacher.photoUrl ? (
                  <img src={teacher.photoUrl} alt={teacher.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-blue-400" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
              <p className="text-blue-600 text-sm mt-1">{teacher.subject}</p>
              {teacher.bio && <p className="text-gray-400 text-xs mt-2 line-clamp-2">{teacher.bio}</p>}
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/teachers">
            <Button variant="outline">
              Δείτε όλους τους καθηγητές
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
