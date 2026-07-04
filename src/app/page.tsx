import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import SpacesSection from "@/components/home/SpacesSection";
import TeachersPreview from "@/components/home/TeachersPreview";
import SuccessPreview from "@/components/home/SuccessPreview";
import BlogPreview from "@/components/home/BlogPreview";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [teachers, successes, posts] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { order: "asc" }, take: 4 }),
    prisma.successStory.findMany({ orderBy: { order: "asc" }, take: 4 }),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <SpacesSection />
      <TeachersPreview teachers={teachers} />
      <SuccessPreview stories={successes} />
      <BlogPreview posts={posts} />
    </>
  );
}
