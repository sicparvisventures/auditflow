'use client';

import { useOrganization } from '@clerk/nextjs';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  getLocation,
  getLocationManagerCandidates,
  type Location,
  type OrganizationMember,
  updateLocation,
} from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

export default function EditLocationPage() {
  const t = useTranslations('NewLocation');
  const tLocations = useTranslations('Locations');
  const params = useParams();
  const router = useRouter();
  const { organization } = useOrganization();
  const locationId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Load location data
  useEffect(() => {
    async function loadLocation() {
      setIsLoading(true);
      try {
        const data = await getLocation(locationId);
        if (data) {
          setLocation(data);
        } else {
          setError('Location not found');
        }
      } catch (err) {
        console.error('Failed to load location:', err);
        setError('Failed to load location');
      } finally {
        setIsLoading(false);
      }
    }

    loadLocation();
  }, [locationId]);

  // Load organization members for manager selection
  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      try {
        const memberList = await getLocationManagerCandidates();
        setMembers(memberList);
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoadingMembers(false);
      }
    }

    if (organization) {
      loadMembers();
    }
  }, [organization]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateLocation(locationId, formData);

    if (result.success) {
      router.push(`/dashboard/locations/${locationId}`);
    } else {
      setError(result.error || 'Failed to update location');
      setIsSubmitting(false);
    }
  }

  // Get role label for display
  function getRoleLabel(role: string): string {
    switch (role) {
      case 'org:admin':
      case 'admin':
        return 'Admin';
      case 'org:inspector':
      case 'inspector':
        return 'Inspector';
      case 'org:member':
      case 'member':
        return 'Manager';
      default:
        return 'Viewer';
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Locatie niet gevonden</p>
        <Link href="/dashboard/locations" className={buttonVariants()}>
          Terug naar Locaties
        </Link>
      </div>
    );
  }

  return (
    <>
      <TitleBar
        title={tLocations('edit_location')}
        description={location.name}
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Location Details Card */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">{t('location_details')}</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                {t('location_name')} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={location.name}
                placeholder={t('location_name_placeholder')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium">
                  {t('address')}
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  defaultValue={location.address || ''}
                  placeholder={t('address_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="city" className="mb-1 block text-sm font-medium">
                  {t('city')}
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  defaultValue={location.city || ''}
                  placeholder={t('city_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="postalCode" className="mb-1 block text-sm font-medium">
                  {t('postal_code')}
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  defaultValue={location.postal_code || ''}
                  placeholder="1234 AB"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="country" className="mb-1 block text-sm font-medium">
                  {t('country')}
                </label>
                <select
                  id="country"
                  name="country"
                  defaultValue={location.country || 'Netherlands'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Netherlands">Nederland</option>
                  <option value="Belgium">België</option>
                  <option value="Germany">Duitsland</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details Card */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">{t('contact_details')}</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                {t('phone')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                defaultValue={location.phone || ''}
                placeholder="+31 6 12345678"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                {t('email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={location.email || ''}
                placeholder="location@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Manager Assignment Card */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-2 font-semibold">{t('assign_manager')}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('assign_manager_description')}
          </p>

          <div>
            <label htmlFor="managerId" className="mb-1 block text-sm font-medium">
              {t('assign_manager')}
            </label>
            <select
              id="managerId"
              name="managerId"
              defaultValue={location.manager_id || ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={loadingMembers}
            >
              <option value="">
                {loadingMembers ? 'Laden...' : '-- Selecteer Manager (optioneel) --'}
              </option>
              {members
                .filter((member) => member.supabaseUserId) // Only show members with a Supabase user
                .map((member) => (
                  <option key={member.id} value={member.supabaseUserId}>
                    {member.fullName} ({member.email}) - {getRoleLabel(member.role)}
                  </option>
                ))}
            </select>
            {!loadingMembers && members.filter(m => m.supabaseUserId).length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Geen teamleden gevonden. {' '}
                <Link
                  href="/dashboard/settings/organization"
                  className="text-primary underline"
                >
                  {t('invite_new_manager')}
                </Link>
              </p>
            )}
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && members.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Debug: {members.length} leden gevonden, {members.filter(m => m.supabaseUserId).length} met Supabase ID.
                Huidige manager_id: {location.manager_id || 'geen'}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/dashboard/locations/${locationId}`}
            className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={buttonVariants({ className: 'flex-1 disabled:opacity-50' })}
          >
            {isSubmitting ? t('saving') : t('save_location')}
          </button>
        </div>
      </form>
    </>
  );
}
