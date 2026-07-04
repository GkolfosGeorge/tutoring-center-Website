import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Calendar, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Edu-Shots</h1>
      <p className="text-gray-500 mb-10">Μικρά εκπαιδευτικά κείμενα — κάτι νέο κάθε φορά.</p>

      {posts.length === 0 ? (
        <p className="text-gray-400 text-center py-20">Σύντομα νέα άρθρα!</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <div className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.publishedAt ? formatDate(post.publishedAt) : ""}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                  {post.title}
                </h2>
                {post.excerpt && <p className="text-gray-500 text-sm line-clamp-2">{post.excerpt}</p>}
                <div className="flex items-center gap-1 text-blue-600 text-sm font-medium mt-4">
                  Διαβάστε
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
