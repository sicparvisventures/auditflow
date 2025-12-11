'use client';

import { useEffect, useState, useTransition } from 'react';

import { 
  assignLocationToGroup,
  createLocationGroup, 
  deleteLocationGroup, 
  getLocationGroups, 
  type LocationGroup 
} from '@/actions/location-groups';
import { getLocations, type Location } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

const COLORS = [
  '#1a9988', '#10b981', '#3b82f6', '#8b5cf6', 
  '#ec4899', '#f97316', '#eab308', '#ef4444'
];

export default function RegionsPage() {
  const [isPending, startTransition] = useTransition();
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null); // groupId
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1a9988',
    icon: 'building',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [groupsData, locationsData] = await Promise.all([
      getLocationGroups(),
      getLocations(),
    ]);
    setGroups(groupsData);
    setLocations(locationsData);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createLocationGroup(formData);
      if (result.success) {
        setShowForm(false);
        setFormData({ name: '', description: '', color: '#1a9988', icon: 'building' });
        await loadData();
      }
    });
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this region? Locations will be unassigned.')) return;
    
    startTransition(async () => {
      const result = await deleteLocationGroup(groupId);
      if (result.success) {
        await loadData();
      }
    });
  };

  const handleAssignLocation = async (locationId: string, groupId: string | null) => {
    startTransition(async () => {
      const result = await assignLocationToGroup(locationId, groupId);
      if (result.success) {
        await loadData();
      }
    });
  };

  const handleRemoveFromGroup = async (locationId: string) => {
    startTransition(async () => {
      const result = await assignLocationToGroup(locationId, null);
      if (result.success) {
        await loadData();
      }
    });
  };

  const getLocationsInGroup = (groupId: string) => {
    return locations.filter(l => l.group_id === groupId);
  };

  const unassignedLocations = locations.filter(l => !l.group_id);

  return (
    <>
      <TitleBar
        title="Regions & Groups"
        description="Organize locations into regions for better management"
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{groups.length}</div>
          <div className="text-xs text-muted-foreground">Regions</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{locations.length - unassignedLocations.length}</div>
          <div className="text-xs text-muted-foreground">Assigned</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-yellow-600 sm:text-2xl">{unassignedLocations.length}</div>
          <div className="text-xs text-muted-foreground">Unassigned</div>
        </div>
      </div>

      {/* Add Region Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className={`mb-6 w-full sm:w-auto ${buttonVariants()}`}
      >
        <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {showForm ? 'Cancel' : 'Add Region'}
      </button>

      {/* Add Region Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold">Create New Region</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="e.g., North Region"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`size-8 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={buttonVariants({ variant: 'outline' })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.name}
              className={buttonVariants()}
            >
              {isPending ? 'Creating...' : 'Create Region'}
            </button>
          </div>
        </form>
      )}

      {/* Regions List */}
      <div className="space-y-4">
        {groups.map(group => {
          const groupLocations = getLocationsInGroup(group.id);
          return (
            <div key={group.id} className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${group.color}20`, color: group.color }}
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l8-4v18" />
                      <path d="M19 21V11l-6-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="truncate text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium sm:inline">
                    {groupLocations.length} locations
                  </span>
                  <button
                    onClick={() => setShowAssignModal(group.id)}
                    className="rounded p-1.5 text-primary transition-colors hover:bg-primary/10"
                    title="Add locations"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Locations in group */}
              {groupLocations.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {groupLocations.map(loc => (
                    <span
                      key={loc.id}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                      style={{ borderColor: group.color, color: group.color }}
                    >
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {loc.name}
                      <button
                        onClick={() => handleRemoveFromGroup(loc.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-red-100"
                        title="Remove from region"
                      >
                        <svg className="size-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No locations assigned yet. Click + to add locations.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned Locations */}
      {unassignedLocations.length > 0 && groups.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 font-semibold text-muted-foreground">
            Unassigned Locations ({unassignedLocations.length})
          </h3>
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="flex flex-wrap gap-2">
              {unassignedLocations.map(loc => (
                <div
                  key={loc.id}
                  className="group inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
                >
                  <svg className="size-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{loc.name}</span>
                  
                  {/* Quick assign dropdown */}
                  <select
                    className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignLocation(loc.id, e.target.value);
                      }
                    }}
                  >
                    <option value="">Assign to...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {groups.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <svg className="size-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Regions Yet</h3>
          <p className="mb-4 text-muted-foreground">
            Create regions to group your locations by area, franchise, or any other criteria.
          </p>
          <button onClick={() => setShowForm(true)} className={buttonVariants()}>
            Create Your First Region
          </button>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAssignModal(null)}
        >
          <div 
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Locations to Region</h3>
              <button
                onClick={() => setShowAssignModal(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {unassignedLocations.length > 0 ? (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {unassignedLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      handleAssignLocation(loc.id, showAssignModal);
                      // Don't close modal to allow multiple selections
                    }}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{loc.name}</p>
                      {loc.city && (
                        <p className="truncate text-sm text-muted-foreground">{loc.city}</p>
                      )}
                    </div>
                    <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                All locations are already assigned to regions.
              </p>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAssignModal(null)}
                className={buttonVariants({ variant: 'outline' })}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
