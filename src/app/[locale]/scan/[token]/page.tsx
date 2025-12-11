import { redirect } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';

import { createServiceClient } from '@/libs/supabase/server';

type Props = {
  params: { token: string };
};

export default async function ScanQRPage({ params }: Props) {
  const { userId } = await auth();
  const supabase = createServiceClient();

  // Get location by QR token
  const { data: location, error } = await supabase
    .from('locations')
    .select('id, organization_id, name, city, status, qr_code_enabled')
    .eq('qr_code_token', params.token)
    .single();

  // Log the scan attempt
  if (location) {
    await supabase.from('qr_scan_log').insert({
      location_id: location.id,
      scan_result: location.qr_code_enabled ? 'success' : 'disabled',
    });
  }

  // Invalid token
  if (error || !location) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100">
            <svg className="size-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold">Invalid QR Code</h1>
          <p className="mb-6 text-muted-foreground">
            This QR code is not valid or has expired.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white"
          >
            Go to AuditFlow
          </a>
        </div>
      </div>
    );
  }

  // QR code disabled
  if (!location.qr_code_enabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-100">
            <svg className="size-8 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold">QR Code Disabled</h1>
          <p className="mb-6 text-muted-foreground">
            Quick access for <strong>{location.name}</strong> has been disabled.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white"
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  // Location is inactive
  if (location.status !== 'active') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="size-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold">Location Inactive</h1>
          <p className="mb-6 text-muted-foreground">
            <strong>{location.name}</strong> is currently not active.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white"
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  // User not signed in - show sign in prompt
  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="size-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h1 className="mb-1 text-2xl font-bold text-primary">{location.name}</h1>
            {location.city && (
              <p className="text-muted-foreground">{location.city}</p>
            )}
          </div>

          <div className="mb-6 rounded-lg bg-muted p-4 text-center">
            <p className="text-sm">
              Sign in to start an audit at this location
            </p>
          </div>

          <a
            href={`/sign-in?redirect_url=${encodeURIComponent(`/scan/${params.token}`)}`}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Sign In
          </a>

          <p className="text-center text-xs text-muted-foreground">
            Powered by AuditFlow
          </p>
        </div>
      </div>
    );
  }

  // User is signed in - redirect to start audit
  redirect(`/dashboard/audits/new?locationId=${location.id}`);
}
