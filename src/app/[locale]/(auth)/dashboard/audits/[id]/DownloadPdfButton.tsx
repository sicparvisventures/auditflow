'use client';

import { useState } from 'react';

import { buttonVariants } from '@/components/ui/buttonVariants';
import { generateAuditPdf } from '@/utils/pdfGenerator';

type AuditData = {
  id: string;
  location: { name: string; address?: string; city?: string } | null;
  template: { name: string } | null;
  audit_date: string;
  completed_at: string | null;
  status: string;
  passed: boolean;
  pass_percentage: number;
  inspector: { first_name?: string; last_name?: string; email: string } | null;
  results: Array<{
    id: string;
    result: 'pass' | 'fail' | 'na';
    comments: string | null;
    template_item: {
      title: string;
      category: { name: string } | null;
    } | null;
  }>;
  actions?: Array<{
    id: string;
    title: string;
    status: string;
    urgency: string;
  }>;
};

export function DownloadPdfButton({ audit }: { audit: AuditData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      generateAuditPdf(audit);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isGenerating}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
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
          Download PDF
        </>
      )}
    </button>
  );
}
