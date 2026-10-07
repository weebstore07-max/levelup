import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Home: React.FC = () => {
  const { currentUser } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111111] font-sans selection:bg-[#E5C158]/30 flex flex-col">
      {/* HEADER / NAVIGATION */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="material-symbols-outlined text-3xl text-[#111111] transition-transform group-hover:scale-105">
            menu_book
          </span>
          <span className="font-serif text-2xl font-bold tracking-tight text-[#111111]">
            Level Up
          </span>
        </Link>

        {/* Center Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F2EBDC]/80 border border-[#E5DAC8] rounded-full p-1.5 shadow-2xs backdrop-blur-xs">
          <a
            href="#home"
            className="bg-[#FAF6F0] text-[#111111] font-medium px-4 py-1.5 rounded-full text-sm shadow-2xs border border-[#E2D6C3]"
          >
            Home
          </a>
          <a
            href="#features"
            className="text-[#666666] hover:text-[#111111] font-medium px-4 py-1.5 text-sm transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-[#666666] hover:text-[#111111] font-medium px-4 py-1.5 text-sm transition-colors"
          >
            How It Works
          </a>
          <a
            href="#faq"
            className="text-[#666666] hover:text-[#111111] font-medium px-4 py-1.5 text-sm transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Right Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <Link
              to="/dashboard"
              className="bg-[#111111] hover:bg-[#222222] text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors shadow-2xs flex items-center gap-2"
            >
              <span>Dashboard</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="border border-[#E0D5C1] hover:bg-[#F2ECE1] text-[#111111] font-medium text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Log in
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[#111111] hover:bg-[#F2ECE1] transition-colors"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-6 right-6 mt-2 bg-[#FAF6F0] border border-[#E5DAC8] rounded-2xl p-6 shadow-xl flex flex-col gap-4 z-30">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#111111] py-1"
            >
              Home
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#666666] hover:text-[#111111] py-1"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#666666] hover:text-[#111111] py-1"
            >
              How It Works
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#666666] hover:text-[#111111] py-1"
            >
              FAQ
            </a>
            <hr className="border-[#E5DAC8] my-1" />
            {currentUser ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-[#111111] text-white font-medium py-3 rounded-xl"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center border border-[#E0D5C1] text-[#111111] font-medium py-3 rounded-xl"
              >
                Log in
              </Link>
            )}
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section id="home" className="w-full max-w-7xl mx-auto px-6 pt-8 pb-16 lg:py-16 flex-1 flex flex-col justify-center relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Content Column */}
          <div className="lg:col-span-6 flex flex-col items-start z-10">
            {/* Eyebrow */}
            <div className="text-xs font-bold tracking-[0.25em] text-[#8C8275] uppercase flex items-center gap-2 mb-6">
              <span>LEARN</span>
              <span className="text-[#C9A843] text-[10px]">✦</span>
              <span>TRACK</span>
              <span className="text-[#C9A843] text-[10px]">✦</span>
              <span>GROW</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-[#111111] leading-[1.08] tracking-tight mb-6">
              Turn your learning<br className="hidden sm:inline" /> journey into a game.
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-lg mb-8 font-normal">
              Track progress, set targets, and achieve mastery with a system designed for deep work.
            </p>

            {/* Primary CTA Button */}
            <div>
              <Link
                to={currentUser ? "/dashboard" : "/login?mode=signup"}
                className="inline-flex items-center gap-3 bg-[#111111] hover:bg-[#222222] text-white font-medium text-base px-7 py-4 rounded-2xl shadow-sm transition-all hover:gap-4 group cursor-pointer"
              >
                <span>{currentUser ? "Go to Dashboard" : "Get Started Free"}</span>
                <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Right Illustration Column */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Mountain & Path Vector Artwork */}
            <div className="w-full max-w-xl aspect-[4/3] relative flex items-center justify-center overflow-visible">
              <svg
                viewBox="0 0 600 450"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-sm select-none"
              >
                <defs>
                  {/* Sun Radial Glow */}
                  <radialGradient id="sunGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(450 160) rotate(90) scale(180)">
                    <stop stopColor="#FCEFDD" stopOpacity="0.9" />
                    <stop offset="0.6" stopColor="#F5DFC4" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#FAF7F2" stopOpacity="0" />
                  </radialGradient>
                  {/* Path Gradient */}
                  <linearGradient id="pathGradient" x1="120" y1="420" x2="450" y2="120" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#E5C158" />
                    <stop offset="0.5" stopColor="#D4AF37" />
                    <stop offset="1" stopColor="#C9A843" />
                  </linearGradient>
                  {/* Soft Mountain Gradients */}
                  <linearGradient id="mountBack" x1="0" y1="100" x2="0" y2="400" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#EDE3D5" />
                    <stop offset="1" stopColor="#FAF7F2" />
                  </linearGradient>
                  <linearGradient id="mountMid" x1="0" y1="150" x2="0" y2="450" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#E0D3C1" />
                    <stop offset="1" stopColor="#FAF7F2" />
                  </linearGradient>
                  <linearGradient id="mountFront" x1="0" y1="200" x2="0" y2="450" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#D2C4B0" />
                    <stop offset="1" stopColor="#F0E5D4" />
                  </linearGradient>
                </defs>

                {/* Sun Circle & Outer Glow */}
                <circle cx="450" cy="160" r="180" fill="url(#sunGlow)" />
                <circle cx="450" cy="160" r="90" fill="#FCEFDD" opacity="0.6" />

                {/* Sparkling Stars */}
                <path d="M 380 90 Q 380 100 390 100 Q 380 100 380 110 Q 380 100 370 100 Q 380 100 380 90 Z" fill="#E5C158" opacity="0.8" />
                <path d="M 530 140 Q 530 146 535 146 Q 530 146 530 152 Q 530 146 525 146 Q 530 146 530 140 Z" fill="#E5C158" opacity="0.7" />
                <path d="M 310 240 Q 310 245 314 245 Q 310 245 310 250 Q 310 245 306 245 Q 310 245 310 240 Z" fill="#E5C158" opacity="0.6" />

                {/* Background Mountain Peaks */}
                <path d="M 180 450 L 320 220 L 410 320 L 520 200 L 600 450 Z" fill="url(#mountBack)" />
                <path d="M 280 450 L 450 120 L 600 450 Z" fill="url(#mountMid)" opacity="0.85" />

                {/* Midground Mountain Layers */}
                <path d="M 0 450 L 150 280 L 330 450 Z" fill="url(#mountMid)" opacity="0.7" />
                <path d="M 120 450 L 260 260 L 420 450 Z" fill="url(#mountFront)" />
                <path d="M 340 450 L 450 120 L 600 450 Z" fill="url(#mountFront)" />

                {/* Evergreens / Trees on Hills */}
                <path d="M 320 310 L 325 300 L 330 310 Z M 322 305 L 325 296 L 328 305 Z" fill="#7C7264" opacity="0.6" />
                <path d="M 290 340 L 295 328 L 300 340 Z M 292 334 L 295 324 L 298 334 Z" fill="#7C7264" opacity="0.6" />
                <path d="M 500 280 L 505 268 L 510 280 Z" fill="#7C7264" opacity="0.5" />
                <path d="M 520 295 L 524 285 L 528 295 Z" fill="#7C7264" opacity="0.5" />

                {/* Soft Base Clouds */}
                <path d="M -20 450 C 30 410 90 410 140 430 C 190 390 260 400 300 440 C 360 400 430 410 480 440 C 530 400 590 420 620 450 Z" fill="#FAF7F2" opacity="0.9" />

                {/* Winding Golden Path */}
                <path
                  d="M 50 450 C 180 400 240 370 190 340 C 140 310 260 280 320 260 C 380 240 370 200 410 170 C 430 150 445 132 450 125"
                  stroke="url(#pathGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 50 450 C 180 400 240 370 190 340 C 140 310 260 280 320 260 C 380 240 370 200 410 170 C 430 150 445 132 450 125"
                  stroke="#FFF3C4"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.8"
                />

                {/* Peak Flag Pole & UP Flag */}
                <line x1="450" y1="125" x2="450" y2="70" stroke="#7C6734" strokeWidth="3" strokeLinecap="round" />
                <path d="M 450 70 L 510 85 L 450 100 Z" fill="#E5B842" />
                <text x="462" y="89" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">
                  UP
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* FEATURE STRIP (4 Columns) */}
        <div id="features" className="border-t border-[#E5DAC8] pt-12 mt-12 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 lg:divide-x divide-[#E5DAC8]">
            {/* Feature 1 */}
            <div className="flex flex-col items-start pt-6 sm:pt-0 lg:px-6 first:pl-0">
              <div className="w-12 h-12 rounded-2xl bg-[#F2ECE1] border border-[#E2D6C3] flex items-center justify-center mb-5 text-[#111111]">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">
                Learn Your Way
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Follow YouTube playlists and turn them into structured learning tracks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-start pt-6 sm:pt-0 lg:px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F2ECE1] border border-[#E2D6C3] flex items-center justify-center mb-5 text-[#111111]">
                <span className="material-symbols-outlined text-2xl">track_changes</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">
                Stay on Track
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Set daily targets for lessons, study time, XP and sessions to build strong habits.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-start pt-6 sm:pt-0 lg:px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F2ECE1] border border-[#E2D6C3] flex items-center justify-center mb-5 text-[#111111]">
                <span className="material-symbols-outlined text-2xl">bar_chart</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">
                See Real Progress
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Track your study time, lessons, XP, streaks and learning patterns with analytics.
              </p>
            </div>

            {/* Feature 4: Trophy Icon */}
            <div className="flex flex-col items-start pt-6 sm:pt-0 lg:px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F2ECE1] border border-[#E2D6C3] flex items-center justify-center mb-5 text-[#111111]">
                <span className="material-symbols-outlined text-2xl">emoji_events</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] mb-2">
                Get Rewarded
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Earn XP, unlock achievements and level up your learning journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="w-full bg-[#F5EFE6] border-t border-b border-[#E5DAC8] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#111111] mb-4">
              Designed for Deep Work
            </h2>
            <p className="text-base text-[#666666]">
              A three-step system engineered to transform raw educational content into structured mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FAF6F0] border border-[#E5DAC8] rounded-3xl p-8 flex flex-col">
              <span className="text-xs font-bold tracking-widest text-[#C9A843] uppercase mb-4">STEP 01</span>
              <h3 className="font-serif text-2xl font-bold text-[#111111] mb-3">Import & Organize</h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Paste any YouTube video or playlist link. LevelUp automatically extracts lessons, duration, and metadata into a clean learning track.
              </p>
            </div>

            <div className="bg-[#FAF6F0] border border-[#E5DAC8] rounded-3xl p-8 flex flex-col">
              <span className="text-xs font-bold tracking-widest text-[#C9A843] uppercase mb-4">STEP 02</span>
              <h3 className="font-serif text-2xl font-bold text-[#111111] mb-3">Execute Daily Targets</h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Set personalized daily goals for study time and lesson completion. Maintain daily streaks and utilize Freeze Passes to protect your momentum.
              </p>
            </div>

            <div className="bg-[#FAF6F0] border border-[#E5DAC8] rounded-3xl p-8 flex flex-col">
              <span className="text-xs font-bold tracking-widest text-[#C9A843] uppercase mb-4">STEP 03</span>
              <h3 className="font-serif text-2xl font-bold text-[#111111] mb-3">Level Up & Analyze</h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                Earn XP for completed modules, unlock rarity-tiered achievements, and inspect week-by-week analytics to uncover your most productive hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="w-full bg-[#F5EFE6] border-t border-[#E5DAC8] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#111111] mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-[#666666]">
              Everything you need to know about starting your LevelUp journey.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                q: "Is LevelUp free to use?",
                a: "Yes! LevelUp is free for self-learners. You can import YouTube courses, track study sessions, earn XP, and view analytics at no cost."
              },
              {
                q: "How does YouTube playlist import work?",
                a: "Simply paste any public YouTube video or playlist URL into your Tracks page. LevelUp automatically fetches the playlist metadata, lesson titles, and durations to generate a structured course track."
              },
              {
                q: "What is a Freeze Pass and how do I earn one?",
                a: "A Freeze Pass protects your daily study streak if you miss a day. You can earn a Freeze Pass by completing the Hard Freeze Challenge (10 completed lessons, 120 study minutes, 150 XP, and 3 study sessions)."
              },
              {
                q: "How is XP calculated?",
                a: "You earn 10 XP for every completed lesson, 10–30 XP for completed TODO tasks based on priority, and bonus XP rewards for unlocking rarity-based achievements."
              }
            ].map((faq, index) => (
              <div
                key={faq.q}
                className="bg-[#FAF6F0] border border-[#E5DAC8] rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-serif text-lg font-bold text-[#111111] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined text-xl text-[#8C8275]">
                    {openFaq === index ? 'remove' : 'add'}
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-sm text-[#666666] leading-relaxed border-t border-[#E5DAC8]/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full bg-[#FAF7F2] border-t border-[#E5DAC8] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-[#8C8275]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[#111111]">
              menu_book
            </span>
            <span className="font-serif text-lg font-bold text-[#111111]">
              Level Up
            </span>
            <span className="text-xs">© {new Date().getFullYear()} LevelUp Portal. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a href="#home" className="hover:text-[#111111] transition-colors">Home</a>
            <a href="#features" className="hover:text-[#111111] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#111111] transition-colors">How It Works</a>
            <Link to="/login" className="hover:text-[#111111] transition-colors">Log In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
