import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center mt-12 mb-8 font-sans">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-5 py-2.5 rounded-[4px] text-sm font-bold transition-all ${
          currentPage === 1
            ? "bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
        }`}
      >
        Previous
      </button>

      <div className="flex items-center gap-1 mx-4">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 flex items-center justify-center rounded-[4px] text-sm font-bold transition-all ${
              currentPage === page
                ? "bg-primary-300 text-white shadow-lg shadow-blue-500/20"
                : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-5 py-2.5 rounded-[4px] text-sm font-bold transition-all ${
          currentPage === totalPages
            ? "bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
        }`}
      >
        Next
      </button>
    </div>
  );
}
