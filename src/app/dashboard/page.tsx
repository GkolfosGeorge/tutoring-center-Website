import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import WeeklyCalendarClient from "./WeeklyCalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ημερολόγιο</h1>
        <p className="text-gray-500 mt-1">Το εβδομαδιαίο πρόγραμμα του τμήματός σου</p>
      </div>
      <WeeklyCalendarClient />
    </div>
  );
}
