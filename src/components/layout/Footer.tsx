import { GraduationCap, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block leading-tight">Apex Academy</span>
            <span className="text-xs text-gray-500">Επένδυση στη γνώση, επιτυχία στο μέλλον.</span>
          </div>
        </div>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-400">
          <li className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Διεύθυνση Φροντιστηρίου, Πόλη</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>210 000 0000</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>info@apexacademy.gr</span>
          </li>
        </ul>
      </div>
      <div className="border-t border-gray-800 py-2 text-center text-[11px] text-gray-500">
        © {new Date().getFullYear()} Apex Academy. Όλα τα δικαιώματα διατηρούνται.
      </div>
    </footer>
  );
}
