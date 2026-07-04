import { prisma } from "@/lib/prisma";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuccessStoriesPage() {
  const stories = await prisma.successStory.findMany({ orderBy: [{ year: "desc" }, { order: "asc" }] });

  const byYear = stories.reduce((acc, s) => {
    if (!acc[s.year]) acc[s.year] = [];
    acc[s.year].push(s);
    return acc;
  }, {} as Record<number, typeof stories>);

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="pt-24 pb-20 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Επιτυχόντες</h1>
        <p className="text-gray-500">Περήφανοι για κάθε μαθητή που πέτυχε τους στόχους του</p>
      </div>

      {years.length === 0 ? (
        <p className="text-center text-gray-400">Σύντομα θα προστεθούν επιτυχόντες!</p>
      ) : (
        <div className="space-y-10">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2">{year}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {byYear[year].map((s) => (
                  <div key={s.id} className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4 text-center">
                    <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                    <p className="font-bold text-gray-900">{s.name}</p>
                    <p className="text-blue-700 font-medium text-sm mt-1">{s.university}</p>
                    {s.department && <p className="text-gray-500 text-xs mt-0.5">{s.department}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
