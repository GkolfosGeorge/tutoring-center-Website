import Link from "next/link";
import { GraduationCap, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Apex Academy</span>
          </div>
          <p className="text-sm text-gray-400">
            Επένδυση στη γνώση, επιτυχία στο μέλλον.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4">Σύνδεσμοι</h3>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/", label: "Αρχική" },
              { href: "/teachers", label: "Καθηγητές" },
              { href: "/success-stories", label: "Επιτυχόντες" },
              { href: "/blog", label: "Edu-Shots" },
              { href: "/login", label: "Σύνδεση Μαθητή" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4">Επικοινωνία</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Διεύθυνση Φροντιστηρίου, Πόλη</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400 shrink-0" />
              <span>210 000 0000</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <span>info@apexacademy.gr</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Apex Academy. Όλα τα δικαιώματα διατηρούνται.
      </div>
    </footer>
  );
}
