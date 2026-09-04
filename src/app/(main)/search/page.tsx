'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchService } from '@/lib/services';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/dashboard/Footer';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setIsLoading(false);
      setData(null);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const res = await searchService.search(query);
        if (res?.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const hasResults = data && (
    (data.projects?.length || 0) > 0 ||
    (data.quotes?.length || 0) > 0 ||
    (data.tickets?.length || 0) > 0 ||
    (data.packages?.length || 0) > 0 ||
    (data.faqs?.length || 0) > 0 ||
    (data.blogs?.length || 0) > 0 ||
    (data.other?.length || 0) > 0
  );

  return (
    <div className="bg-[#F3F4F6] min-h-screen font-sans flex flex-col">
      <main className="max-w-[1536px] w-full mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-10 pb-16 flex-grow">
        <h1 className="text-3xl font-bold text-[#363636] mb-8 font-manrope">
          Search Results for <span className="text-[#5356ff]">"{query}"</span>
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff]"></div>
          </div>
        ) : hasResults ? (
          <div className="space-y-12">
            {/* Projects */}
            {(data.projects?.length || 0) > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-[#434343] mb-6 capitalize font-inter border-b border-gray-200 pb-2">
                  My Projects
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-x-[62px] xl:gap-y-[48px]">
                  {data.projects.map((project: any) => (
                    <div key={project._id} className="bg-white rounded-[6px] p-6 lg:p-8 shadow-[0px_5px_25px_#0000000D] w-full min-h-[221px] flex flex-col justify-between hover:shadow-lg transition-shadow">
                      <h3 className="text-[26px] md:text-[22px] lg:text-[20px] xl:text-[22px] font-bold text-[#363636] lg:text-[#1A202C] leading-[32px] md:leading-[30px] lg:leading-[26px] xl:leading-[30px] line-clamp-2 mb-6 lg:mb-4">
                        {project.name || project.title}
                      </h3>
                      <div className="flex flex-col w-full gap-8 lg:gap-4">
                        <div className="flex lg:hidden items-start justify-between w-full border-t border-gray-100 pt-6 md:pt-0 md:border-0">
                          <div className="flex flex-col gap-1 pr-4 border-r border-gray-100 flex-1">
                            <p className="text-[#5356ff] text-[13px] font-bold">Project #</p>
                            <p className="text-[#363636] text-[15px] font-medium leading-[20px]">{project.number}</p>
                          </div>
                          <div className="flex flex-col gap-1 px-4 border-r border-gray-100 flex-1">
                            <p className="text-[#5356ff] text-[13px] font-bold">Started</p>
                            <p className="text-[#363636] text-[15px] font-medium leading-[20px]">{project.started}</p>
                          </div>
                          <div className="flex flex-col gap-1 pl-4 flex-1">
                            <p className="text-[#5356ff] text-[13px] font-bold">Estimated Deadline</p>
                            <p className="text-[#363636] text-[15px] font-medium leading-[20px]">{project.deadline}</p>
                          </div>
                        </div>
                        <div className="hidden lg:grid grid-cols-3 gap-3 xl:gap-4 flex-1">
                          <div className="flex flex-col gap-1">
                            <p className="text-[#5356ff] text-[11px] xl:text-[13px] font-bold">Project #</p>
                            <p className="text-[#363636] text-[13px] xl:text-[15px] font-medium leading-[18px]">{project.number}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-[#5356ff] text-[11px] xl:text-[13px] font-bold">Started</p>
                            <p className="text-[#363636] text-[13px] xl:text-[15px] font-medium leading-[18px]">{project.started}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-[#5356ff] text-[11px] xl:text-[13px] font-bold">Estimated Deadline</p>
                            <p className="text-[#363636] text-[13px] xl:text-[15px] font-medium leading-[18px]">{project.deadline}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 lg:gap-[16px] items-center justify-start lg:justify-end w-full">
                          <button onClick={() => router.push(`${project.infoUrl}/details#messages`)} className="bg-[#E3E6F5] text-[#5356ff] flex-1 lg:flex-none lg:w-[105px] lg:h-[38px] py-3 lg:py-0 rounded-[8px] lg:rounded-[6px] text-[14px] lg:text-[13px] font-bold relative hover:bg-[#d4d8f0] lg:hover:bg-[#cdd1ec] transition-colors">
                            {project.messages > 0 && (
                              <span className="absolute -top-[10px] lg:-top-[9px] -left-[10px] lg:-left-[9px] bg-[#363636] text-white rounded-full w-[26px] lg:w-[24px] h-[26px] lg:h-[24px] flex items-center justify-center text-[12px] font-bold shadow-md">
                                {project.messages}
                              </span>
                            )}
                            Messages
                          </button>
                          <button onClick={() => project.infoUrl && router.push(project.infoUrl)} className="bg-[#E3E6F5] text-[#5356ff] flex-1 lg:flex-none lg:w-[75px] lg:h-[38px] py-3 lg:py-0 rounded-[8px] lg:rounded-[6px] text-[14px] lg:text-[13px] font-bold hover:bg-[#d4d8f0] lg:hover:bg-[#cdd1ec] transition-colors">
                            Info
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quotes */}
            {(data.quotes?.length || 0) > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-[#434343] mb-6 capitalize font-inter border-b border-gray-200 pb-2">
                  My Quotes
                </h2>
                <div className="space-y-4">
                  {data.quotes.map((quote: any) => (
                    <div key={quote._id} className="border border-gray-200 rounded-[8px] p-6 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex flex-col gap-4">
                        <div className="flex-grow">
                          <h3 className="text-lg font-bold text-gray-800 mb-2">{quote.projectTitle}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{quote.projectDescription}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="text-sm text-gray-500 font-medium">
                              Submitted - {new Date(quote.createdAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}
                            </span>
                            <span className={`px-4 py-1 rounded-[4px] text-xs font-bold uppercase border ${getStatusColor(quote.status)}`}>
                              {quote.status}
                            </span>
                          </div>
                          <button onClick={() => router.push(`/dashboard/my-quotes/${quote._id}`)} className="bg-[#5356ff] hover:bg-[#3333D0] text-white text-sm font-bold py-2.5 px-6 rounded-[4px] transition-colors whitespace-nowrap">
                            View details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Packages */}
            {(data.packages?.length || 0) > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-[#434343] mb-6 capitalize font-inter border-b border-gray-200 pb-2">
                  Packages & Services
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200">
                  {data.packages.map((pkg: any) => (
                    <Link key={pkg._id} href={pkg.isCategory ? `/dashboard/new-project/packages?categorycode=${(pkg.categorycode || pkg.slug || '').toUpperCase()}` : `/dashboard/new-project/packages/${pkg._id}`} className="bg-white rounded-[10px] border border-[#d1d1d1] p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center group cursor-pointer h-full">
                      <div className="w-full h-48 bg-[#d9d9d9] rounded-md mb-6 flex items-center justify-center relative overflow-hidden">
                        {(pkg.mediumUrl || pkg.imageUrl || pkg.image) ? (
                          <img src={pkg.mediumUrl || pkg.imageUrl || pkg.image} alt={pkg.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <svg className="w-16 h-16 text-[#646464]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        {pkg.isCategory && (
                          <div className="absolute top-2 right-2 bg-[#5356ff] text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                            Category
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[#808080] bg-[#e0e0e0] px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                        {pkg.isCategory ? "Service Category" : (pkg.type || "Package")}
                      </span>
                      <h3 className="text-xl font-bold text-[#646464] mb-3 leading-tight group-hover:text-[#5356ff] transition-colors">
                        {pkg.name || pkg.title}
                      </h3>
                      <p className="text-[13px] text-[#808080] mb-6 leading-relaxed px-2 line-clamp-3">
                        {pkg.description || "Explore our comprehensive range of services and solutions tailored for your business needs."}
                      </p>
                      <div className="mt-auto text-[22px] font-bold text-[#808080] border-t border-gray-100 w-full pt-4">
                        {pkg.amount}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Blogs */}
            {(data.blogs?.length || 0) > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-[#434343] mb-6 capitalize font-inter border-b border-gray-200 pb-2">
                  Blog Posts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.blogs.map((blog: any, idx: number) => (
                    <Link key={idx} href={`/blog/${blog.slug}`} className="bg-white rounded-[12px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      {(blog.coverImage || blog.image) && (
                        <div className="h-48 overflow-hidden relative">
                          <img src={blog.coverImage || blog.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={blog.title} />
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[11px] font-bold text-[#808080] bg-[#e0e0e0] px-3 py-1 rounded-full uppercase tracking-wide">
                            Blog
                          </span>
                          {blog.publishedAt && (
                            <span className="text-[12px] text-gray-400 font-medium">
                              {new Date(blog.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-[20px] mb-3 text-[#363636] line-clamp-2 leading-tight group-hover:text-[#5356ff] transition-colors">
                          {blog.title}
                        </h3>
                        <p className="text-[#808080] text-sm line-clamp-3 leading-relaxed">
                          {blog.summary || blog.excerpt || ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {(data.faqs?.length || 0) > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-[#434343] mb-6 capitalize font-inter border-b border-gray-200 pb-2">
                  FAQ Matches
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <ul className="divide-y divide-gray-200">
                    {data.faqs.map((faq: any, idx: number) => (
                      <li key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                        <h4 className="font-bold text-gray-800 mb-2">{faq.question}</h4>
                        <p className="text-gray-600 text-sm">{faq.answer}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Other Pages */}
            {(data.other?.length || 0) > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-[#434343] mb-6 capitalize font-inter border-b border-gray-200 pb-2">
                  Other Pages
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <ul className="divide-y divide-gray-200">
                    {data.other.map((page: any, idx: number) => (
                      <li key={idx} className="hover:bg-[#F2F4FF] transition-colors group">
                        <Link href={`/${page.slug}`} className="block p-6">
                          <h4 className="font-bold text-[#5356ff] mb-2 group-hover:text-[#3232b7] transition-colors flex items-center gap-2">
                            {page.title}
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </h4>
                          <p className="text-gray-600 text-sm line-clamp-2">{page.description}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-16 text-center border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No results found</h2>
            <p className="text-gray-500">
              We couldn't find anything matching "{query}". Try adjusting your search.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff]"></div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
