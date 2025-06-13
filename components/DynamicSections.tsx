'use client';

import dynamic from 'next/dynamic';

const ServicesSection = dynamic(() => import('@/components/sections/ServicesSection'), {
  loading: () => (
    <div className="container px-4 md:px-6">
      <div className="text-center space-y-4 mb-12">
        <div className="h-8 w-48 bg-muted animate-pulse mx-auto rounded"></div>
        <div className="h-4 w-64 bg-muted animate-pulse mx-auto rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="h-40 bg-muted animate-pulse"></div>
            <div className="p-6 space-y-4">
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  ssr: false
});

const HowItWorksSection = dynamic(() => import('@/components/sections/HowItWorksSection'), {
  loading: () => (
    <div className="container px-4 md:px-6 py-12">
      <div className="text-center space-y-4 mb-12">
        <div className="h-8 w-48 bg-muted animate-pulse mx-auto rounded"></div>
        <div className="h-4 w-64 bg-muted animate-pulse mx-auto rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center space-y-4">
            <div className="h-16 w-16 bg-muted animate-pulse rounded-full mx-auto"></div>
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded mx-auto"></div>
            <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
          </div>
        ))}
      </div>
    </div>
  ),
  ssr: false
});

export { ServicesSection, HowItWorksSection }; 