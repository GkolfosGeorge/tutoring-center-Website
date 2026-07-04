"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
};

export default function BlogPreview({ posts }: { posts: Post[] }) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="gradient-text">Edu-Shots</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Σύντομα εκπαιδευτικά κείμενα για να μαθαίνεις κάτι νέο κάθε μέρα.
          </p>
        </motion.div>

        {posts.length === 0 ? (
          <p className="text-center text-gray-400">Σύντομα θα βρείτε εδώ νέα κείμενα!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow border border-gray-100 h-full group">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.publishedAt ? formatDate(post.publishedAt) : ""}
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-500 text-sm line-clamp-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-1 text-blue-600 text-sm mt-4 font-medium">
                      Διαβάστε περισσότερα
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/blog">
            <Button variant="outline">
              Όλα τα Edu-Shots
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
