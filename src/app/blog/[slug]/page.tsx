import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Calendar, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug, published: true } });
  if (!post) notFound();

  return (
    <div className="pt-24 pb-20 px-4 max-w-2xl mx-auto">
      <Link href="/blog" className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 text-sm mb-8">
        <ArrowLeft className="w-4 h-4" />
        Πίσω στα Edu-Shots
      </Link>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <Calendar className="w-3.5 h-3.5" />
        {post.publishedAt ? formatDate(post.publishedAt) : ""}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">{post.title}</h1>

      <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>
    </div>
  );
}
