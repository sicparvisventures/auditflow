'use client';

import { useState } from 'react';

import { buttonVariants } from '@/components/ui/buttonVariants';
import { generateReportsPdf } from '@/utils/pdfGenerator';

type ReportData = {
  totalAudits: number;
  passRate: number;
  openActions: number;
  locationsCount: number;
  monthlyStats: Array<{ month: string; passed: number; failed: number; total: number }>;
  locationPerformance: Array<{
    name: string;
    totalAudits: number;
    passRate: number;
    openActions: number;
    lastAudit: string | null;
  }>;
};

export function ExportReportButton({ data }: { data: ReportData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      generateReportsPdf({
        ...data,
        generatedAt: new Date().toLocaleDateString('nl-NL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (error) {
      console.error('Failed to generate report PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isGenerating}
      className={buttonVariants({ size: 'sm' })}
    >
      {isGenerating ? (
        <>
          <svg
            className="mr-2 size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Generating...
        </>
      ) : (
        <>
          <svg
            className="mr-2 size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
}


