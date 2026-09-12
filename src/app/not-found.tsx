import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden">
      <img alt="404 Error" className="absolute inset-0 w-full h-full object-cover" src="/assets/404_v2.png" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0, 46, 138, 0.72) 0%, rgba(13, 25, 57, 0.8) 100%)' }}></div>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-lg">Lost in the digital void?</h1>
        <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow">The page you're searching for seems to have drifted off course. No worries—our engineering team is already on it. Let's get you back to familiar territory.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link className="px-8 py-3 bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all uppercase tracking-wider text-sm w-full sm:w-auto text-center" href="/">Back to Homepage</Link>
          <Link className="px-8 py-3 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white font-bold rounded-lg transition-all uppercase tracking-wider text-sm w-full sm:w-auto text-center" href="/help-support">Contact Support</Link>
        </div>
        <div className="mt-12 text-xs text-gray-300 font-medium uppercase tracking-[0.2em]">Error Code: 404 | File Not Found</div>
      </div>
    </div>
  );
}
