import React from "react";
import { Link } from "react-router";
import { Send, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAF8] text-center p-6 font-sans">
      <div className="w-16 h-16 rounded-3xl bg-[#EEF4EC] flex items-center justify-center text-[#8EA58C] mb-6">
        <AlertTriangle size={32} />
      </div>
      <h1 className="text-4xl font-extrabold text-[#1F2937] tracking-tight">404</h1>
      <h2 className="text-xl font-bold text-[#1F2937] mt-3">Page Not Found</h2>
      <p className="text-sm text-[#64748B] mt-2 max-w-sm">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link
        to="/"
        className="mt-8 px-5 py-2.5 bg-[#8EA58C] text-white font-semibold rounded-xl hover:bg-[#7a9278] transition shadow-sm inline-flex items-center gap-2 cursor-pointer no-underline text-sm"
      >
        <Send size={14} />
        <span>Return Dashboard</span>
      </Link>
    </div>
  );
}
