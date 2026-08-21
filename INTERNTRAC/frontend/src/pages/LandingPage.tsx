import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AtsEvaluationModal from '../components/AtsEvaluationModal'

export default function LandingPage() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)

  const handleApply = (role: any) => {
    setSelectedRole(role)
    setModalOpen(true)
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans antialiased overflow-x-hidden">
      <Navbar activeTab="Home" />

      <main className="flex-1">

        {/* ── 1. Hero Section (Background Image Layout) ── */}
        <section
          className="relative bg-cover bg-right bg-no-repeat min-h-[560px] sm:min-h-[640px] flex items-center overflow-hidden"
          style={{ backgroundImage: "url('/assets/chatgpt-hero.png')" }}
        >
          {/* Subtle white gradient overlay to ensure perfect contrast and blending */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent"></div>

          <div className="relative w-full max-w-7xl mx-auto py-16 sm:py-24 px-4 sm:px-6 lg:px-8 z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

              {/* Left Column (Content over white space) */}
              <div className="lg:col-span-6 lg:-ml-10 flex flex-col gap-7">

                {/* Eyebrow Badge */}
                <div className="animate-fade-up inline-flex items-center gap-2.5 self-start pl-2 pr-4 py-1.5 rounded-full bg-white/85 backdrop-blur border border-purple-100 shadow-card">
                  <span className="flex items-center gap-1.5 bg-gradient-to-r from-[#4B1881] to-[#F26522] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    AI Powered
                  </span>
                  <span className="text-xs font-bold text-slate-600 tracking-wide">Internship platform for modern campuses</span>
                </div>

                <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.12] animate-fade-up" style={{ animationDelay: '120ms' }}>
                  Your Career Starts With the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F26522] to-[#4B1881]">Right Opportunity.</span>
                </h1>

                <p className="text-base text-slate-600 leading-relaxed max-w-xl animate-fade-up" style={{ animationDelay: '240ms' }}>
                  Find internships tailored for your skills, goals, and future. Connect with top companies, and build a resume that stands out.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 mt-1 animate-fade-up" style={{ animationDelay: '360ms' }}>
                  <button
                    onClick={() => navigate('/register')}
                    className="btn-primary py-3.5 px-8 text-sm rounded-xl shadow-orange hover:scale-[1.03] transition-transform"
                  >
                    Get Started Free
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/student')}
                    className="btn-secondary py-3.5 px-8 text-sm rounded-xl hover:border-[#4B1881]/40 hover:text-[#4B1881] transition-colors"
                  >
                    Explore Internships
                  </button>
                </div>

                {/* Trust Stats Strip */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-3 animate-fade-up" style={{ animationDelay: '480ms' }}>
                  {[
                    { icon: 'groups', value: '2,245+', label: 'Active Students' },
                    { icon: 'domain', value: '463', label: 'Companies Hiring' },
                    { icon: 'verified', value: '92%', label: 'Placement Rate' },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-card flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg text-[#4B1881]" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                      </span>
                      <div className="leading-tight">
                        <p className="text-base font-black text-slate-900 font-headline">{stat.value}</p>
                        <p className="text-[11px] font-semibold text-slate-500">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (Floating glass cards over hero art) */}
              <div className="hidden lg:block lg:col-span-6 relative h-[420px]">
                <div className="animate-float absolute top-8 right-4 bg-white/80 backdrop-blur-md border border-white/70 shadow-card-hover rounded-2xl p-4 w-56">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-black text-slate-900">Offer Letter Received</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">TechCorp • Full Stack</p>
                    </div>
                  </div>
                </div>

                <div className="animate-float-slow absolute bottom-10 right-24 bg-white/80 backdrop-blur-md border border-white/70 shadow-card-hover rounded-2xl p-4 w-52">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Match</p>
                    <span className="material-symbols-outlined text-sm text-[#F26522]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <p className="text-2xl font-black font-headline text-transparent bg-clip-text bg-gradient-to-r from-[#F26522] to-[#4B1881]">94%</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#F26522] to-[#4B1881]"></div>
                  </div>
                </div>

                <div className="animate-float absolute bottom-32 right-64 bg-[#4B1881]/90 backdrop-blur-md text-white shadow-purple rounded-2xl px-4 py-3 flex items-center gap-2.5" style={{ animationDelay: '2s' }}>
                  <span className="material-symbols-outlined text-lg text-emerald-300" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  <p className="text-xs font-bold">Interview Shortlisted</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. Our Recruiters Bar ── */}
        <section className="bg-white border-y border-slate-200/80 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
              Our Recruiters • Partner companies trust us for early career hiring
            </h3>
            <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap text-slate-400 text-sm font-semibold opacity-75">
              <span className="flex items-center gap-2 text-slate-700 font-bold hover:text-[#4B1881] transition-colors cursor-pointer">
                <span className="material-symbols-outlined">domain</span> TechCorp Global
              </span>
              <span className="flex items-center gap-2 text-slate-700 font-bold hover:text-[#4B1881] transition-colors cursor-pointer">
                <span className="material-symbols-outlined">language</span> Nexus AI Labs
              </span>
              <span className="flex items-center gap-2 text-slate-700 font-bold hover:text-[#4B1881] transition-colors cursor-pointer">
                <span className="material-symbols-outlined">monitoring</span> FinTech Spark
              </span>
              <span className="flex items-center gap-2 text-slate-700 font-bold hover:text-[#4B1881] transition-colors cursor-pointer">
                <span className="material-symbols-outlined">layers</span> CloudScale Systems
              </span>
              <span className="flex items-center gap-2 text-slate-700 font-bold hover:text-[#4B1881] transition-colors cursor-pointer">
                <span className="material-symbols-outlined">hub</span> Innovate Tech
              </span>
            </div>
          </div>
        </section>

        {/* ── 3. Manage your Entire Internship Process in a single system (3 Bento Cards) ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-headline text-3xl sm:text-4xl font-black text-slate-900 mb-3">
              Manage your Entire Internship Process in a single system
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              All-in-one platform for Students, Faculty Mentors, and Companies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Orange - Discover Opportunities */}
            <div className="bg-[#F26522] text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl text-white">search</span>
                </div>
                <h3 className="text-2xl font-black mb-3">Discover Opportunities</h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  Explore a curated list of internships tailored to your interest. Filter by role, location, and industry with instant AI match scoring.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/student')}
                className="mt-8 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 hover:translate-x-1 transition-transform"
              >
                Browse Internships →
              </button>
            </div>

            {/* Card 2: Purple - Build Your Profile */}
            <div className="bg-[#4B1881] text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl text-white">badge</span>
                </div>
                <h3 className="text-2xl font-black mb-3">Build Your Profile</h3>
                <p className="text-purple-100 text-sm leading-relaxed">
                  Showcase a verified digital resume. Highlight your projects, skills, and academic achievements in a format recruiters and mentors love.
                </p>
              </div>
              <button
                onClick={() => navigate('/student-profile')}
                className="mt-8 text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-2 hover:translate-x-1 transition-transform"
              >
                Build Resume →
              </button>
            </div>

            {/* Card 3: Orange - Track Applications */}
            <div className="bg-[#F26522] text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl text-white">checklist_rtl</span>
                </div>
                <h3 className="text-2xl font-black mb-3">Track Applications</h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  Monitor the status of your applications in real-time. Get notified about interviews, offers, and feedback all in one single dashboard.
                </p>
              </div>
              <button
                onClick={() => navigate('/my-applications')}
                className="mt-8 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 hover:translate-x-1 transition-transform"
              >
                View Status →
              </button>
            </div>

          </div>
        </section>

        {/* ── 4. The unseen effort of building your early career ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Mockup (Tablet / Screen View) */}
            <div className="lg:col-span-6">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xl relative">
                <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F26522] text-white flex items-center justify-center font-bold text-sm">
                        RS
                      </div>
                      <div>
                        <p className="text-sm font-bold">Rahul Sharma</p>
                        <p className="text-xs text-slate-400">B.Tech CS • GHRCE Nagpur</p>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                      94% Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/80 p-3 rounded-xl">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">CGPA</p>
                      <p className="text-base font-bold text-white">8.92 / 10</p>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">NOC Clearance</p>
                      <p className="text-base font-bold text-emerald-400">Approved</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-semibold">Verified Technical Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['React.js', 'Node.js', 'Python', 'FastAPI', 'Groq LLM', 'Tailwind'].map(s => (
                        <span key={s} className="px-2.5 py-1 bg-purple-900/60 border border-purple-700/60 rounded-md text-[11px] font-medium text-purple-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Text Content */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="font-headline text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                The unseen effort of building your early career
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Standing out in today's competitive job market requires more than just good grades. It takes targeted experience and a professional foundation. Our platform simplifies the resume-building and application process so you can focus on building your skills and showcase what makes you unique to top employers.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/student-profile')}
                  className="btn-primary py-3.5 px-8 text-sm rounded-xl shadow-orange"
                >
                  Learn More
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ── 5. Helping local students launch careers (Purple Banner with 4 Stats) ── */}
        <section className="my-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-[#4B1881] text-white rounded-3xl p-8 sm:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Banner Text */}
            <div className="lg:col-span-6 space-y-3">
              <h2 className="font-headline text-3xl sm:text-4xl font-black text-white leading-tight">
                Helping local students launch careers
              </h2>
              <p className="text-purple-200 text-sm sm:text-base max-w-md">
                We partner with top employers and institutions to connect talent with opportunity.
              </p>
            </div>

            {/* Right Stats Grid (2x2) */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-6">
              
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2 mb-1 text-purple-200">
                  <span className="material-symbols-outlined text-lg">groups</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Students</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white">2,245</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2 mb-1 text-purple-200">
                  <span className="material-symbols-outlined text-lg">domain</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Partner Companies</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white">463</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2 mb-1 text-purple-200">
                  <span className="material-symbols-outlined text-lg">work</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Internships Posted</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white">8,288</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2 mb-1 text-purple-200">
                  <span className="material-symbols-outlined text-lg">task_alt</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Placements</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white">1,926</p>
              </div>

            </div>

          </div>
        </section>

        {/* ── 6. Featured Opportunities ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-headline text-3xl sm:text-4xl font-black text-slate-900 mb-3">
              Featured Opportunities
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Explore hand-picked internship programs actively recruiting students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Software Engineering (Tech) */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md flex flex-col justify-between group hover:shadow-xl transition-all">
              <div className="h-48 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80"
                  alt="Software Engineering"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[#4B1881] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Tech
                </span>
              </div>
              <div className="bg-[#4B1881] text-white p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Software Engineering Intern</h3>
                  <p className="text-purple-100 text-xs leading-relaxed mb-4">
                    Join our core engineering team to build scalable full-stack web applications and APIs.
                  </p>
                </div>
                <button
                  onClick={() => handleApply({ title: 'Software Engineering Intern', company: 'TechCorp' })}
                  className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1 hover:text-white transition-colors"
                >
                  Apply Now →
                </button>
              </div>
            </div>

            {/* Card 2: Digital Marketing (Marketing) */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md flex flex-col justify-between group hover:shadow-xl transition-all">
              <div className="h-48 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&q=80"
                  alt="Marketing"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[#F26522] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Marketing
                </span>
              </div>
              <div className="bg-[#F26522] text-white p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Digital Marketing Analyst</h3>
                  <p className="text-white/90 text-xs leading-relaxed mb-4">
                    Help drive data-driven marketing campaigns, analytics, content strategy, and insights.
                  </p>
                </div>
                <button
                  onClick={() => handleApply({ title: 'Digital Marketing Analyst', company: 'GlobalNet' })}
                  className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1 hover:underline"
                >
                  Apply Now →
                </button>
              </div>
            </div>

            {/* Card 3: UI/UX Design (Design) */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md flex flex-col justify-between group hover:shadow-xl transition-all">
              <div className="h-48 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80"
                  alt="Design"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[#4B1881] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Design
                </span>
              </div>
              <div className="bg-[#4B1881] text-white p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">UI/UX Design Intern</h3>
                  <p className="text-purple-100 text-xs leading-relaxed mb-4">
                    Craft intuitive user interfaces, wireframes, and design systems for next-gen products.
                  </p>
                </div>
                <button
                  onClick={() => handleApply({ title: 'UI/UX Design Intern', company: 'DesignCraft' })}
                  className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1 hover:text-white transition-colors"
                >
                  Apply Now →
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ── 7. Ready to kickstart your professional journey? (CTA Section) ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-headline text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Ready to kickstart your professional journey?
            </h2>
            <div>
              <button
                onClick={() => navigate('/register')}
                className="btn-primary py-4 px-10 text-base font-bold rounded-2xl shadow-orange hover:scale-105 transition-transform"
              >
                Create Your Free Profile
              </button>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      {/* AI Resume Evaluation Modal */}
      {modalOpen && (
        <AtsEvaluationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          internship={selectedRole}
        />
      )}
    </div>
  )
}
