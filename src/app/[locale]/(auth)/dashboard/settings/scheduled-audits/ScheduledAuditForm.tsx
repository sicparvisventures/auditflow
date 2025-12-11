'use client';

import { useEffect, useState } from 'react';

import {
  getAuditTemplates,
  getLocations,
  getOrganizationMembers,
  type AuditTemplate,
  type Location,
  type OrganizationMember,
} from '@/actions/supabase';
import type { ScheduledAudit } from '@/actions/scheduled-audits';

type Props = {
  schedule?: ScheduledAudit;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
};

const recurrenceOptions = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly (Every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export function ScheduledAuditForm({ schedule, onSubmit, isPending }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'>(schedule?.recurrence || 'monthly');

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [locs, temps, mems] = await Promise.all([
          getLocations(),
          getAuditTemplates(),
          getOrganizationMembers(),
        ]);
        setLocations(locs);
        setTemplates(temps.filter(t => t.is_active));
        setMembers(mems);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Schedule Details</h3>
        
        <div>
          <label className="mb-1 block text-sm font-medium">Name *</label>
          <input
            type="text"
            name="name"
            defaultValue={schedule?.name}
            placeholder="e.g., Monthly Kitchen Inspection"
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            defaultValue={schedule?.description || ''}
            placeholder="Optional description..."
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Location & Template */}
      <div className="space-y-4">
        <h3 className="font-semibold">Audit Configuration</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Location *</label>
            <select
              name="locationId"
              defaultValue={schedule?.location_id}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.city && `(${loc.city})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Template *</label>
            <select
              name="templateId"
              defaultValue={schedule?.template_id}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select template...</option>
              {templates.map((temp) => (
                <option key={temp.id} value={temp.id}>
                  {temp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Default Inspector</label>
          <select
            name="inspectorId"
            defaultValue={schedule?.default_inspector_id || ''}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Auto-assign / None</option>
            {members.filter(m => m.role === 'org:admin' || m.role === 'org:inspector').map((mem) => (
              <option key={mem.supabaseUserId} value={mem.supabaseUserId}>
                {mem.fullName} ({mem.role.replace('org:', '')})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Inspector who will be assigned to audits from this schedule
          </p>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h3 className="font-semibold">Schedule</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Recurrence *</label>
            <select
              name="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly')}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {recurrenceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Start Date *</label>
            <input
              type="date"
              name="startDate"
              defaultValue={schedule?.start_date || new Date().toISOString().split('T')[0]}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Conditional fields based on recurrence */}
        {(recurrence === 'weekly' || recurrence === 'biweekly') && (
          <div>
            <label className="mb-1 block text-sm font-medium">Day of Week</label>
            <select
              name="dayOfWeek"
              defaultValue={schedule?.day_of_week?.toString() || '1'}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {dayOfWeekOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {recurrence === 'monthly' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Day of Month</label>
            <select
              name="dayOfMonth"
              defaultValue={schedule?.day_of_month?.toString() || '1'}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                </option>
              ))}
            </select>
          </div>
        )}

        {recurrence !== 'once' && (
          <div>
            <label className="mb-1 block text-sm font-medium">End Date (Optional)</label>
            <input
              type="date"
              name="endDate"
              defaultValue={schedule?.end_date || ''}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty for no end date
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="font-semibold">Options</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Time Window (days)</label>
            <input
              type="number"
              name="timeWindowDays"
              defaultValue={schedule?.time_window_days || 3}
              min={1}
              max={30}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Days allowed to complete audit after scheduled date
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Reminder (days before)</label>
            <input
              type="number"
              name="reminderDaysBefore"
              defaultValue={schedule?.reminder_days_before || 1}
              min={0}
              max={14}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Send reminder this many days before
            </p>
          </div>
        </div>

        {/* Notification checkboxes */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="notifyInspector"
              value="true"
              defaultChecked={schedule?.notify_inspector !== false}
              className="size-4 rounded border-input"
            />
            <span className="text-sm">Notify inspector when audit is due</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="notifyManager"
              value="true"
              defaultChecked={schedule?.notify_manager !== false}
              className="size-4 rounded border-input"
            />
            <span className="text-sm">Notify location manager when audit is due</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
