"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Story = {
  id: string;
  firstName: string;
  lastName: string;
  academicYear: number;
  university: string;
  department: string | null;
};

export default function SuccessPreview({ stories }: { stories: Story[] }) {
  if (stories.length === 0) return null;

  return (
    <section className="py-24 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-4">Επιτυχόντες</h2>
          <p className="text-blue-200 max-w-xl mx-auto">
            Περήφανοι για κάθε μαθητή που πέτυχε τους στόχους του.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center"
            >
              <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-lg">{story.firstName} {story.lastName}</h3>
              <p className="text-yellow-300 text-sm font-medium mt-1">{story.university}</p>
              {story.department && <p className="text-blue-200 text-xs mt-1">{story.department}</p>}
              <p className="text-blue-300 text-xs mt-2">{story.academicYear}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/success-stories">
            <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent">
              Δείτε όλους τους επιτυχόντες
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
