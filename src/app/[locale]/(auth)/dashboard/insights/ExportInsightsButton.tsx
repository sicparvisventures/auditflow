'use client';

import { useState } from 'react';

import { getInsightsForExport, type InsightsFilters } from '@/actions/insights';
import { buttonVariants } from '@/components/ui/buttonVariants';

type Props = {
  filters?: InsightsFilters;
};

export function ExportInsightsButton({ filters }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setShowMenu(false);
    
    try {
      const data = await getInsightsForExport(filters);
      if (!data) {
        alert('Failed to generate insights for export');
        return;
      }

      // Generate PDF content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const html = generatePDFHtml(data, filters);
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export insights');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setShowMenu(false);
    
    try {
      const data = await getInsightsForExport(filters);
      if (!data) {
        alert('Failed to generate insights for export');
        return;
      }

      // Generate CSV content
      const csvContent = generateCSV(data);
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditflow-insights-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export insights');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        {isExporting ? (
          <svg className="mr-1.5 size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        Export
        <svg className="ml-1 size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
            <button
              onClick={handleExportPDF}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <svg className="size-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Export as PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <svg className="size-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function generatePDFHtml(data: any, _filters?: InsightsFilters): string {
  const { complianceHealth, locationRisks, insights, aiInsights, dataStats } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>AuditFlow AI Insights Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a9988;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1a9988;
    }
    .date {
      color: #666;
      font-size: 14px;
    }
    h1 { font-size: 28px; margin-bottom: 5px; }
    h2 { font-size: 18px; margin: 25px 0 15px; color: #1a9988; border-bottom: 1px solid #e5e5e5; padding-bottom: 5px; }
    h3 { font-size: 14px; margin: 15px 0 10px; color: #333; }
    .section { margin-bottom: 25px; }
    .grade-box {
      display: inline-flex;
      align-items: center;
      gap: 15px;
      padding: 20px 30px;
      background: linear-gradient(135deg, #f0f9f8, #e8f5f3);
      border-radius: 12px;
      margin: 15px 0;
    }
    .grade {
      font-size: 48px;
      font-weight: bold;
    }
    .grade-a { color: #16a34a; }
    .grade-b { color: #10b981; }
    .grade-c { color: #eab308; }
    .grade-d { color: #f97316; }
    .grade-f { color: #dc2626; }
    .score { font-size: 24px; color: #666; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    .metric {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1a9988;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
    }
    .insight {
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .insight-warning { background: #fff7ed; border-color: #f97316; }
    .insight-opportunity { background: #eff6ff; border-color: #3b82f6; }
    .insight-achievement { background: #f0fdf4; border-color: #16a34a; }
    .insight-prediction { background: #faf5ff; border-color: #9333ea; }
    .insight-title { font-weight: 600; margin-bottom: 5px; }
    .insight-desc { font-size: 14px; color: #666; }
    .risk-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .risk-table th, .risk-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }
    .risk-table th {
      background: #f8f8f8;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #ea580c; }
    .badge-medium { background: #fef9c3; color: #ca8a04; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .summary-box {
      background: linear-gradient(135deg, #f0f9f8, #e8f5f3);
      padding: 20px;
      border-radius: 12px;
      margin: 15px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">AuditFlow</div>
      <h1>AI Insights Report</h1>
    </div>
    <div class="date">
      Generated: ${new Date().toLocaleDateString()}<br>
      Period: ${dataStats.dateRange.from} - ${dataStats.dateRange.to}
    </div>
  </div>

  <div class="section">
    <h2>Compliance Health Score</h2>
    <div class="grade-box">
      <span class="grade grade-${complianceHealth.grade.toLowerCase()}">${complianceHealth.grade}</span>
      <span class="score">${complianceHealth.overallScore}/100</span>
    </div>
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-value">${complianceHealth.breakdown.passRate}%</div>
        <div class="metric-label">Pass Rate</div>
      </div>
      <div class="metric">
        <div class="metric-value">${complianceHealth.breakdown.auditFrequency}%</div>
        <div class="metric-label">Coverage</div>
      </div>
      <div class="metric">
        <div class="metric-value">${complianceHealth.breakdown.actionCompletion}%</div>
        <div class="metric-label">Action Completion</div>
      </div>
      <div class="metric">
        <div class="metric-value">${complianceHealth.breakdown.responseTime}d</div>
        <div class="metric-label">Avg Response</div>
      </div>
    </div>
  </div>

  ${aiInsights ? `
  <div class="section">
    <h2>AI Analysis Summary</h2>
    <div class="summary-box">
      <p>${aiInsights.summary}</p>
      ${aiInsights.recommendations.length > 0 ? `
      <h3 style="margin-top: 15px;">Recommendations</h3>
      <ul style="margin-left: 20px;">
        ${aiInsights.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div class="metric" style="text-align: left;">
        <strong>Risk Analysis</strong>
        <p style="font-size: 13px; margin-top: 5px;">${aiInsights.riskAnalysis}</p>
      </div>
      <div class="metric" style="text-align: left;">
        <strong>Forecast</strong>
        <p style="font-size: 13px; margin-top: 5px;">${aiInsights.forecast}</p>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Key Insights</h2>
    ${insights.slice(0, 6).map((insight: any) => `
    <div class="insight insight-${insight.type}">
      <div class="insight-title">${insight.title}</div>
      <div class="insight-desc">${insight.description}</div>
      ${insight.suggestedAction ? `<p style="margin-top: 8px; font-size: 13px;"><strong>Suggested:</strong> ${insight.suggestedAction}</p>` : ''}
    </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Location Risk Assessment</h2>
    <table class="risk-table">
      <thead>
        <tr>
          <th>Location</th>
          <th>Risk Level</th>
          <th>Last Score</th>
          <th>Trend</th>
          <th>Key Factor</th>
        </tr>
      </thead>
      <tbody>
        ${locationRisks.slice(0, 10).map((loc: any) => `
        <tr>
          <td>${loc.locationName}</td>
          <td><span class="badge badge-${loc.riskLevel}">${loc.riskLevel.toUpperCase()}</span></td>
          <td>${loc.lastAuditScore}%</td>
          <td>${loc.trend === 'improving' ? '↑' : loc.trend === 'declining' ? '↓' : '→'} ${loc.trend}</td>
          <td>${loc.factors[0]}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by AuditFlow | ${dataStats.totalAudits} audits | ${dataStats.totalLocations} locations | ${dataStats.totalActions} actions</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;
}

function generateCSV(data: any): string {
  const { complianceHealth, locationRisks, insights, dataStats } = data;
  
  let csv = 'AuditFlow AI Insights Report\n';
  csv += `Generated,${new Date().toISOString()}\n`;
  csv += `Period,${dataStats.dateRange.from} to ${dataStats.dateRange.to}\n`;
  csv += `Total Audits,${dataStats.totalAudits}\n`;
  csv += `Total Locations,${dataStats.totalLocations}\n`;
  csv += `Total Actions,${dataStats.totalActions}\n\n`;

  csv += 'COMPLIANCE HEALTH\n';
  csv += `Grade,${complianceHealth.grade}\n`;
  csv += `Overall Score,${complianceHealth.overallScore}\n`;
  csv += `Pass Rate,${complianceHealth.breakdown.passRate}%\n`;
  csv += `Coverage,${complianceHealth.breakdown.auditFrequency}%\n`;
  csv += `Action Completion,${complianceHealth.breakdown.actionCompletion}%\n`;
  csv += `Avg Response Time,${complianceHealth.breakdown.responseTime} days\n\n`;

  csv += 'KEY INSIGHTS\n';
  csv += 'Type,Priority,Title,Description\n';
  insights.forEach((insight: any) => {
    csv += `${insight.type},${insight.priority},"${insight.title}","${insight.description.replace(/"/g, '""')}"\n`;
  });
  csv += '\n';

  csv += 'LOCATION RISK ASSESSMENT\n';
  csv += 'Location,Risk Level,Risk Score,Last Audit Score,Predicted Score,Trend,Audit Count,Key Factor\n';
  locationRisks.forEach((loc: any) => {
    csv += `"${loc.locationName}",${loc.riskLevel},${loc.riskScore},${loc.lastAuditScore}%,${loc.predictedNextScore}%,${loc.trend},${loc.auditCount},"${loc.factors[0]}"\n`;
  });

  return csv;
}
