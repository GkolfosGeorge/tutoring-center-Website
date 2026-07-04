import { prisma } from "@/lib/prisma";
import { User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const teachers = await prisma.teacher.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="pt-24 pb-20 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Καθηγητές</h1>
        <p className="text-gray-500">Γνωρίστε την ομάδα μας</p>
      </div>

      {teachers.length === 0 ? (
        <p className="text-center text-gray-400">Σύντομα προφίλ καθηγητών!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {t.photoUrl ? (
                  <img src={t.photoUrl} alt={t.name} className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-blue-400" />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{t.name}</h2>
              <p className="text-blue-600 font-medium mt-1">{t.subject}</p>
              {t.bio && <p className="text-gray-500 text-sm mt-3">{t.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
