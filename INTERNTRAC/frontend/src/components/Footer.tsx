import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#220B38] text-white border-t-4 border-[#F26522] mt-20 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Brand Column (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
          >
            <img
              src="/interntrac-logo.png"
              alt="INTERNTRAC Logo"
              className="w-10 h-10 rounded-lg shadow-md object-contain"
            />
            <span className="font-headline text-xl font-bold text-white tracking-tight">
              INTERN<span className="text-[#F26522]">TRAC</span>
            </span>
          </Link>

          <p className="text-xs text-purple-200 leading-relaxed max-w-sm">
            Smart internship management platform connecting students, institutes, and companies. Driving early career success through verified campus placements.
          </p>

          <div className="flex gap-2.5 mt-2">
            <span className="badge-orange text-[10px] px-2.5 py-0.5 font-bold">NAAC A++</span>
            <span className="badge-purple text-[10px] px-2.5 py-0.5 font-bold">Autonomous</span>
            <span className="badge-blue text-[10px] px-2.5 py-0.5 font-bold">NBA Accredited</span>
          </div>
        </div>

        {/* Company Column (2 cols) */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#F26522]">
            Company
          </h4>
          <ul className="space-y-2 text-xs text-purple-200">
            <li><a href="#" className="hover:text-white transition-colors">About us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
          </ul>
        </div>

        {/* Support Column (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#F26522]">
            Support
          </h4>
          <ul className="space-y-2 text-xs text-purple-200">
            <li><Link to="/dashboard/student" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Safety Guidelines</a></li>
          </ul>
        </div>

        {/* Stay up to date Column (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#F26522]">
            Stay up to date
          </h4>
          <p className="text-xs text-purple-200 leading-relaxed">
            Subscribe for internship drives and campus recruiting announcements.
          </p>
          <div className="flex bg-[#321153] rounded-xl overflow-hidden border border-purple-800 p-1">
            <input
              type="email"
              placeholder="Your email address"
              className="w-full bg-transparent border-none focus:ring-0 text-xs text-white px-3 py-2 outline-none placeholder-purple-400"
            />
            <button className="bg-[#F26522] hover:bg-[#D64E07] text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-12 border-t border-purple-900/60 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-purple-300">
        <p>© 2024-25 INTERNTRAC. All rights reserved. G.H. Raisoni College of Engineering (GHRCE).</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">NOC Guidelines</a>
        </div>
      </div>
    </footer>
  )
}
