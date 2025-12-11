'use client';

import { useState } from 'react';

import { buttonVariants } from '@/components/ui/buttonVariants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateReportsPdf } from '@/utils/pdfGenerator';

type ReportData = {
  totalAudits: number;
  passRate: number;
  openActions: number;
  locationsCount: number;
  monthlyStats: Array<{ month: string; passed: number; failed: number; total: number }>;
  locationPerformance: Array<{
    id: string;
    name: string;
    totalAudits: number;
    passRate: number;
    openActions: number;
    lastAudit: string | null;
  }>;
};

export function ExportReportButton({ data }: { data: ReportData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPdf = async () => {
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

  const handleExportCsv = () => {
    setIsGenerating(true);
    try {
      // Create CSV content for location performance
      const headers = ['Location', 'Total Audits', 'Pass Rate (%)', 'Open Actions', 'Last Audit'];
      const rows = data.locationPerformance.map(loc => [
        loc.name,
        loc.totalAudits.toString(),
        loc.passRate.toString(),
        loc.openActions.toString(),
        loc.lastAudit || 'Never',
      ]);
      
      const csvContent = [
        // Summary section
        `AuditFlow Report - ${new Date().toLocaleDateString('nl-NL')}`,
        '',
        'Summary',
        `Total Audits,${data.totalAudits}`,
        `Pass Rate,${data.passRate}%`,
        `Open Actions,${data.openActions}`,
        `Locations,${data.locationsCount}`,
        '',
        'Monthly Statistics',
        'Month,Passed,Failed,Total',
        ...data.monthlyStats.map(m => `${m.month},${m.passed},${m.failed},${m.total}`),
        '',
        'Location Performance',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `auditflow-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to generate CSV:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    // For true Excel export, we'd need a library like xlsx
    // For now, use CSV which Excel can open
    handleExportCsv();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
    <button
      type="button"
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
              Exporting...
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
              Export
              <svg className="ml-1 size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
        </>
      )}
    </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPdf}>
          <svg className="mr-2 size-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCsv}>
          <svg className="mr-2 size-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <svg className="mr-2 size-4 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


