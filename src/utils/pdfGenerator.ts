import { jsPDF } from 'jspdf';

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
  generatedAt: string;
  organizationName?: string;
};

// Colors
const PRIMARY_COLOR: [number, number, number] = [45, 134, 107]; // Primary green
const SUCCESS_COLOR: [number, number, number] = [34, 197, 94];
const DANGER_COLOR: [number, number, number] = [239, 68, 68];
const MUTED_COLOR: [number, number, number] = [107, 114, 128];
const DARK_COLOR: [number, number, number] = [17, 24, 39];

export function generateAuditPdf(audit: AuditData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Helper function to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > 280) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Report', 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    20,
    35,
  );

  y = 55;

  // Location & Score Section
  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(audit.location?.name || 'Unknown Location', 20, y);

  // Score badge
  if (audit.status === 'completed') {
    const scoreText = `${Math.round(audit.pass_percentage)}%`;
    const badgeColor = audit.passed ? SUCCESS_COLOR : DANGER_COLOR;
    
    doc.setFillColor(...badgeColor);
    doc.roundedRect(pageWidth - 50, y - 12, 35, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(scoreText, pageWidth - 32.5, y, { align: 'center' });
  }

  y += 8;

  // Audit date
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date(audit.audit_date).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    20,
    y,
  );

  y += 20;

  // Info Grid
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);

  y += 15;

  const infoItems = [
    { label: 'Template', value: audit.template?.name || '-' },
    { label: 'Inspector', value: getInspectorName(audit.inspector) },
    { label: 'Status', value: capitalizeFirst(audit.status) },
    { label: 'Completed', value: audit.completed_at 
      ? new Date(audit.completed_at).toLocaleString('nl-NL') 
      : 'In Progress' },
  ];

  doc.setFontSize(9);
  const colWidth = (pageWidth - 40) / 2;
  
  infoItems.forEach((item, index) => {
    const col = index % 2;
    const x = 20 + col * colWidth;
    
    if (index > 0 && index % 2 === 0) {
      y += 18;
    }
    
    doc.setTextColor(...MUTED_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x, y);
    
    doc.setTextColor(...DARK_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x, y + 6);
  });

  y += 25;

  // Results Summary
  const passedCount = audit.results?.filter(r => r.result === 'pass').length || 0;
  const failedCount = audit.results?.filter(r => r.result === 'fail').length || 0;
  const naCount = audit.results?.filter(r => r.result === 'na').length || 0;

  doc.setDrawColor(229, 231, 235);
  doc.line(20, y, pageWidth - 20, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_COLOR);
  doc.text('Results Summary', 20, y);
  y += 15;

  // Summary boxes
  const boxWidth = (pageWidth - 60) / 3;
  
  // Passed box
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, y, boxWidth, 30, 3, 3, 'F');
  doc.setTextColor(...SUCCESS_COLOR);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(passedCount.toString(), 20 + boxWidth / 2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PASSED', 20 + boxWidth / 2, y + 24, { align: 'center' });

  // Failed box
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(30 + boxWidth, y, boxWidth, 30, 3, 3, 'F');
  doc.setTextColor(...DANGER_COLOR);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(failedCount.toString(), 30 + boxWidth + boxWidth / 2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('FAILED', 30 + boxWidth + boxWidth / 2, y + 24, { align: 'center' });

  // N/A box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(40 + boxWidth * 2, y, boxWidth, 30, 3, 3, 'F');
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(naCount.toString(), 40 + boxWidth * 2 + boxWidth / 2, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('N/A', 40 + boxWidth * 2 + boxWidth / 2, y + 24, { align: 'center' });

  y += 45;

  // Results by Category
  const resultsByCategory: Record<string, typeof audit.results> = {};
  audit.results?.forEach((result) => {
    const categoryName = result.template_item?.category?.name || 'Uncategorized';
    if (!resultsByCategory[categoryName]) {
      resultsByCategory[categoryName] = [];
    }
    resultsByCategory[categoryName].push(result);
  });

  Object.entries(resultsByCategory).forEach(([categoryName, items]) => {
    checkPageBreak(40 + items.length * 12);

    // Category header
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(20, y, pageWidth - 40, 12, 2, 2, 'F');
    
    doc.setTextColor(...DARK_COLOR);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(categoryName, 25, y + 8);

    const categoryPassed = items.filter(i => i.result === 'pass').length;
    const categoryTotal = items.filter(i => i.result !== 'na').length;
    
    doc.setTextColor(...MUTED_COLOR);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${categoryPassed}/${categoryTotal} passed`, pageWidth - 25, y + 8, { align: 'right' });

    y += 18;

    // Category items
    items.forEach((item) => {
      checkPageBreak(15);

      // Result indicator
      if (item.result === 'pass') {
        doc.setTextColor(...SUCCESS_COLOR);
        doc.text('✓', 25, y);
      } else if (item.result === 'fail') {
        doc.setTextColor(...DANGER_COLOR);
        doc.text('✗', 25, y);
      } else {
        doc.setTextColor(...MUTED_COLOR);
        doc.text('—', 25, y);
      }

      // Item title
      doc.setTextColor(...DARK_COLOR);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const title = item.template_item?.title || 'Unknown Item';
      doc.text(title.substring(0, 70), 35, y);

      // Comments
      if (item.comments) {
        y += 5;
        doc.setTextColor(...MUTED_COLOR);
        doc.setFontSize(8);
        doc.text(`Note: ${item.comments.substring(0, 80)}`, 35, y);
      }

      y += 10;
    });

    y += 5;
  });

  // Actions Section
  if (audit.actions && audit.actions.length > 0) {
    checkPageBreak(30 + audit.actions.length * 10);

    doc.setDrawColor(229, 231, 235);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_COLOR);
    doc.text(`Actions Created (${audit.actions.length})`, 20, y);
    y += 12;

    audit.actions.forEach((action) => {
      checkPageBreak(12);

      // Urgency indicator
      const urgencyColors: Record<string, [number, number, number]> = {
        critical: [239, 68, 68],
        high: [249, 115, 22],
        medium: [234, 179, 8],
        low: [156, 163, 175],
      };
      
      doc.setFillColor(...(urgencyColors[action.urgency] || urgencyColors.low));
      doc.circle(25, y - 2, 2, 'F');

      doc.setTextColor(...DARK_COLOR);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(action.title.substring(0, 60), 32, y);

      doc.setTextColor(...MUTED_COLOR);
      doc.text(capitalizeFirst(action.status), pageWidth - 25, y, { align: 'right' });

      y += 10;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
    doc.text(
      'Generated by AuditFlow',
      pageWidth - 20,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' },
    );
  }

  // Download
  const fileName = `audit-${audit.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'report'}-${
    new Date(audit.audit_date).toISOString().split('T')[0]
  }.pdf`;
  
  doc.save(fileName);
}

export function generateReportsPdf(data: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Report', 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.organizationName) {
    doc.text(data.organizationName, 20, 35);
  }
  doc.text(data.generatedAt, pageWidth - 20, 35, { align: 'right' });

  y = 55;

  // Summary Statistics
  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 20, y);
  y += 15;

  const stats = [
    { label: 'Total Audits', value: data.totalAudits.toString(), color: PRIMARY_COLOR },
    { label: 'Pass Rate', value: `${data.passRate}%`, color: data.passRate >= 70 ? SUCCESS_COLOR : DANGER_COLOR },
    { label: 'Open Actions', value: data.openActions.toString(), color: data.openActions > 10 ? DANGER_COLOR : PRIMARY_COLOR },
    { label: 'Locations', value: data.locationsCount.toString(), color: PRIMARY_COLOR },
  ];

  const statWidth = (pageWidth - 60) / 4;
  stats.forEach((stat, index) => {
    const x = 20 + index * (statWidth + 10);
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, y, statWidth, 35, 3, 3, 'F');
    
    doc.setTextColor(...stat.color);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, x + statWidth / 2, y + 18, { align: 'center' });
    
    doc.setTextColor(...MUTED_COLOR);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, x + statWidth / 2, y + 28, { align: 'center' });
  });

  y += 50;

  // Monthly Trends
  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Audits Over Time (Last 6 Months)', 20, y);
  y += 15;

  if (data.monthlyStats.length > 0) {
    const barMaxWidth = pageWidth - 80;
    const maxTotal = Math.max(...data.monthlyStats.map(m => m.total), 1);

    data.monthlyStats.forEach((month) => {
      doc.setTextColor(...MUTED_COLOR);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(month.month, 25, y + 4);

      const passedWidth = (month.passed / maxTotal) * barMaxWidth;
      const failedWidth = (month.failed / maxTotal) * barMaxWidth;

      doc.setFillColor(229, 231, 235);
      doc.roundedRect(50, y - 3, barMaxWidth, 10, 2, 2, 'F');

      if (passedWidth > 0) {
        doc.setFillColor(...SUCCESS_COLOR);
        doc.roundedRect(50, y - 3, passedWidth, 10, 2, 2, 'F');
      }
      if (failedWidth > 0) {
        doc.setFillColor(...DANGER_COLOR);
        doc.roundedRect(50 + passedWidth, y - 3, failedWidth, 10, 0, 0, 'F');
      }

      doc.setTextColor(...DARK_COLOR);
      doc.text(`${month.total}`, pageWidth - 20, y + 4, { align: 'right' });

      y += 15;
    });

    // Legend
    y += 5;
    doc.setFillColor(...SUCCESS_COLOR);
    doc.rect(50, y, 10, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text('Passed', 65, y + 5);

    doc.setFillColor(...DANGER_COLOR);
    doc.rect(100, y, 10, 6, 'F');
    doc.text('Failed', 115, y + 5);
  } else {
    doc.setTextColor(...MUTED_COLOR);
    doc.setFontSize(10);
    doc.text('No audit data available', 20, y);
  }

  y += 25;

  // Location Performance Table
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Location Performance', 20, y);
  y += 15;

  if (data.locationPerformance.length > 0) {
    // Table header
    doc.setFillColor(249, 250, 251);
    doc.rect(20, y - 5, pageWidth - 40, 12, 'F');
    
    doc.setTextColor(...MUTED_COLOR);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Location', 25, y + 3);
    doc.text('Audits', 100, y + 3, { align: 'center' });
    doc.text('Pass Rate', 130, y + 3, { align: 'center' });
    doc.text('Open Actions', 165, y + 3, { align: 'center' });

    y += 15;

    // Table rows
    doc.setFont('helvetica', 'normal');
    data.locationPerformance.slice(0, 15).forEach((loc) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...DARK_COLOR);
      doc.setFontSize(9);
      doc.text(loc.name.substring(0, 25), 25, y);
      doc.text(loc.totalAudits.toString(), 100, y, { align: 'center' });
      
      // Pass rate with color
      doc.setTextColor(loc.passRate >= 70 ? SUCCESS_COLOR[0] : DANGER_COLOR[0], 
                       loc.passRate >= 70 ? SUCCESS_COLOR[1] : DANGER_COLOR[1],
                       loc.passRate >= 70 ? SUCCESS_COLOR[2] : DANGER_COLOR[2]);
      doc.text(loc.passRate > 0 ? `${loc.passRate}%` : 'N/A', 130, y, { align: 'center' });
      
      doc.setTextColor(...DARK_COLOR);
      doc.text(loc.openActions.toString(), 165, y, { align: 'center' });

      y += 10;
    });
  } else {
    doc.setTextColor(...MUTED_COLOR);
    doc.setFontSize(10);
    doc.text('No location data available', 20, y);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
    doc.text(
      'Generated by AuditFlow',
      pageWidth - 20,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' },
    );
  }

  // Download
  const fileName = `performance-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Utility functions
function getInspectorName(inspector: AuditData['inspector']): string {
  if (!inspector) return 'Unknown';
  const name = `${inspector.first_name || ''} ${inspector.last_name || ''}`.trim();
  return name || inspector.email;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
