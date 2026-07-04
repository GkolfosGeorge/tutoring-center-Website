"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Grade = {
  id: string;
  subject: string;
  examType: string;
  score: number;
  maxScore: number;
  date: Date;
  notes: string | null;
};

function calcStats(grades: Grade[]) {
  if (grades.length === 0) return { avg: 0, min: 0, max: 0 };
  const scores = grades.map((g) => (g.score / g.maxScore) * 20);
  return {
    avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    min: Math.round(Math.min(...scores) * 10) / 10,
    max: Math.round(Math.max(...scores) * 10) / 10,
  };
}

export default function GradesClient({
  grades,
  classGrades,
}: {
  grades: Grade[];
  classGrades: any[];
}) {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const subjects = ["all", ...Array.from(new Set(grades.map((g) => g.subject)))];

  const filtered = selectedSubject === "all" ? grades : grades.filter((g) => g.subject === selectedSubject);
  const myStats = calcStats(filtered);

  const classFiltered = selectedSubject === "all" ? classGrades : classGrades.filter((g) => g.subject === selectedSubject);
  const classStats = calcStats(classFiltered);

  const chartData = filtered.slice().reverse().map((g) => ({
    name: formatDate(g.date),
    βαθμός: Math.round((g.score / g.maxScore) * 200) / 10,
    μάθημα: g.subject,
    εξέταση: g.examType,
  }));

  function getScoreColor(score: number, max: number) {
    const pct = score / max;
    if (pct >= 0.8) return "text-green-600";
    if (pct >= 0.6) return "text-yellow-600";
    return "text-red-600";
  }

  function getScoreBadge(score: number, max: number) {
    const pct = score / max;
    if (pct >= 0.8) return "success";
    if (pct >= 0.6) return "warning";
    return "destructive";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Βαθμολογίες</h1>
        <p className="text-gray-500 mt-1">Παρακολούθηση επίδοσης ανά μάθημα</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSubject === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {s === "all" ? "Όλα" : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Μέσος Όρος Μου", value: myStats.avg, sub: "βάση 20" },
          { label: "Μέσος Τάξης", value: classStats.avg, sub: "βάση 20" },
          { label: "Ελάχιστος", value: myStats.min, sub: "βαθμός μου" },
          { label: "Μέγιστος", value: myStats.max, sub: "βαθμός μου" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value || "—"}</p>
                <p className="text-xs text-gray-400">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {chartData.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Πορεία Βαθμολογίας</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-medium">{d.μάθημα}</p>
                          <p className="text-gray-500">{d.εξέταση}</p>
                          <p className="text-blue-600 font-bold">{d.βαθμός}/20</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={myStats.avg} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "ΜΟ", fontSize: 11 }} />
                <Bar dataKey="βαθμός" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Αναλυτική Βαθμολογία ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Δεν υπάρχουν βαθμολογίες.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{grade.subject}</p>
                    <p className="text-sm text-gray-400">
                      {grade.examType} · {formatDate(grade.date)}
                    </p>
                    {grade.notes && <p className="text-xs text-gray-400 mt-0.5">{grade.notes}</p>}
                  </div>
                  <div className="text-right ml-4">
                    <span className={`text-xl font-bold ${getScoreColor(grade.score, grade.maxScore)}`}>
                      {grade.score}
                    </span>
                    <span className="text-gray-400">/{grade.maxScore}</span>
                    <div className="mt-1">
                      <Badge variant={getScoreBadge(grade.score, grade.maxScore) as any}>
                        {Math.round((grade.score / grade.maxScore) * 200) / 10}/20
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
