'use client';

import { buttonVariants } from '@/components/ui/buttonVariants';

type Props = {
  locationName: string;
  qrToken: string;
  size?: number;
};

export function LocationQRCode({ locationName, qrToken, size = 200 }: Props) {
  // Generate QR code URL (using a public QR code API)
  const scanUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/scan/${qrToken}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(scanUrl)}&format=svg`;

  const handleDownload = () => {
    // Create a download link for the QR code as PNG
    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}&format=png`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `qr-${locationName.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code - ${locationName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            .location-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #1a9988;
            }
            .qr-image {
              width: 300px;
              height: 300px;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            .logo {
              font-size: 18px;
              font-weight: bold;
              color: #1a9988;
              margin-bottom: 30px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="logo">📋 AuditFlow</div>
            <div class="location-name">${locationName}</div>
            <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scanUrl)}" alt="QR Code" />
            <div class="instructions">
              Scan this QR code to start an audit at this location
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Image */}
      <div className="mb-4 rounded-lg border border-border bg-white p-4">
        <img
          src={qrCodeUrl}
          alt={`QR Code for ${locationName}`}
          width={size}
          height={size}
          className="block"
        />
      </div>

      {/* Location Name */}
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Scan to start audit at <strong>{locationName}</strong>
      </p>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={handleDownload}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
        <button
          onClick={handlePrint}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </button>
        <button
          onClick={handleCopyLink}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Link
        </button>
      </div>
    </div>
  );
}
