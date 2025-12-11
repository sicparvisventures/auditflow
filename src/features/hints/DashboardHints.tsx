'use client';

import { HintBubble } from './HintBubble';

// Dashboard Home Hints
export function DashboardHomeHints({ hasData }: { hasData: boolean }) {
  if (!hasData) {
    return (
      <HintBubble
        id="dashboard-getting-started"
        title="Getting Started"
        message="Welcome! To start auditing, first create a Location (like a store or warehouse) and set up an Audit Template with your checklist items. Then you can create audits!"
        icon="star"
        position="bottom-right"
        delay={1000}
      />
    );
  }

  return (
    <HintBubble
      id="dashboard-overview"
      title="Your Dashboard"
      message="This is your audit overview. The KPI cards show your performance at a glance. Click on recent audits or pending actions to view details."
      icon="lightbulb"
      position="bottom-right"
      delay={800}
    />
  );
}

// Audits Page Hints
export function AuditsPageHints({ hasAudits }: { hasAudits: boolean }) {
  if (!hasAudits) {
    return (
      <HintBubble
        id="audits-first-audit"
        title="Create Your First Audit"
        message="Click 'New Audit' to start. You'll select a location and template, then go through each checklist item. Mark items as pass/fail and add notes or photos as evidence."
        icon="arrow"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return (
    <HintBubble
      id="audits-list-explained"
      title="Your Audits"
      message="Each audit shows its score and status. Click on an audit to see the full report with all findings. Completed audits show a pass percentage - green is good, red needs attention."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// Actions Page Hints
export function ActionsPageHints({ hasActions }: { hasActions: boolean }) {
  if (!hasActions) {
    return (
      <HintBubble
        id="actions-empty"
        title="Corrective Actions"
        message="Actions are automatically created when you mark audit items as 'failed'. They help track what needs to be fixed. Complete an audit with failed items to see actions here."
        icon="info"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return (
    <HintBubble
      id="actions-workflow"
      title="Action Workflow"
      message="The colored dots show urgency (gray=low, yellow=medium, orange=high, red=critical). Click an action to respond with a fix, then it can be verified by a manager."
      icon="lightbulb"
      position="bottom-right"
      delay={600}
    />
  );
}

// Reports Page Hints
export function ReportsPageHints() {
  return (
    <HintBubble
      id="reports-overview"
      title="Understanding Reports"
      message="Reports show your audit performance over time. The charts display pass/fail trends and action status. Use this to identify locations that need improvement and track progress."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// New Audit Page Hints
export function NewAuditPageHints({ step }: { step: 'select' | 'audit' | 'review' }) {
  if (step === 'select') {
    return (
      <HintBubble
        id="new-audit-select"
        title="Starting an Audit"
        message="Select a location and template to begin. If you don't have any yet, create them first in Settings > Templates and Locations. The template defines what items you'll check."
        icon="arrow"
        position="bottom-right"
        delay={800}
      />
    );
  }

  if (step === 'audit') {
    return (
      <HintBubble
        id="new-audit-conducting"
        title="Conducting Your Audit"
        message="For each item: tap Pass ✓, Fail ✗, or N/A. Add comments for context and photos as evidence when needed. Navigate with Previous/Next buttons."
        icon="lightbulb"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return (
    <HintBubble
      id="new-audit-review"
      title="Review Before Completing"
      message="Review all your answers before submitting. Failed items will automatically create corrective actions. Once completed, the audit cannot be edited."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// Audit Detail Page Hints
export function AuditDetailHints({ status }: { status: string }) {
  if (status === 'in_progress' || status === 'draft') {
    return (
      <HintBubble
        id="audit-in-progress"
        title="Audit In Progress"
        message="This audit hasn't been completed yet. Click 'Continue Audit' to finish recording your findings."
        icon="arrow"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return (
    <HintBubble
      id="audit-completed-report"
      title="Audit Report"
      message="This is your completed audit report. The score shows overall compliance. Failed items have generated actions that need to be addressed. Download as PDF to share."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// Action Detail Page Hints
export function ActionDetailHints({ status }: { status: string }) {
  if (status === 'pending' || status === 'in_progress') {
    return (
      <HintBubble
        id="action-respond"
        title="Responding to Actions"
        message="Describe what you did to fix this issue in the response form below. Add photos as evidence if possible. Once submitted, the action goes to verification."
        icon="arrow"
        position="bottom-right"
        delay={600}
      />
    );
  }

  if (status === 'completed') {
    return (
      <HintBubble
        id="action-verify"
        title="Verification Required"
        message="This action has been responded to and needs verification. Review the response and either approve (verify) or reject it with feedback."
        icon="info"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return null;
}

// Location Page Hints
export function LocationsPageHints({ hasLocations }: { hasLocations: boolean }) {
  if (!hasLocations) {
    return (
      <HintBubble
        id="locations-first"
        title="Add Your First Location"
        message="Locations are the places you audit - stores, warehouses, offices, etc. Create at least one location before you can start auditing."
        icon="star"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return (
    <HintBubble
      id="locations-manage"
      title="Your Locations"
      message="Click on a location to view its details, start a new audit, or see its audit history. Active locations can be audited, inactive ones are archived."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// Location Detail Page Hints
export function LocationDetailHints() {
  return (
    <HintBubble
      id="location-detail"
      title="Location Actions"
      message="From here you can start a new audit for this location, view past audits, or check pending actions. Use Quick Actions for fast access."
      icon="lightbulb"
      position="bottom-right"
      delay={600}
    />
  );
}

// New Location Page Hints
export function NewLocationHints() {
  return (
    <HintBubble
      id="new-location"
      title="Adding a Location"
      message="Enter the location name (required) and address details. Contact info helps your team coordinate. You can edit these details later."
      icon="info"
      position="bottom-right"
      delay={800}
    />
  );
}

// Templates Page Hints  
export function TemplatesPageHints({ hasTemplates }: { hasTemplates: boolean }) {
  if (!hasTemplates) {
    return (
      <HintBubble
        id="templates-first"
        title="Create an Audit Template"
        message="Templates define what you check during audits. Add sections (like 'Safety' or 'Cleanliness') and items to check. You can reuse templates across all locations."
        icon="star"
        position="bottom-right"
        delay={600}
      />
    );
  }

  return (
    <HintBubble
      id="templates-manage"
      title="Managing Templates"
      message="Click a template to edit its sections and items. Toggle templates active/inactive to control which ones appear when creating new audits."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// Template Detail Page Hints
export function TemplateDetailHints() {
  return (
    <HintBubble
      id="template-detail"
      title="Template Details"
      message="This template shows all categories and checklist items. Items marked 'Creates action on fail' will automatically generate corrective actions when failed during audits."
      icon="info"
      position="bottom-right"
      delay={600}
    />
  );
}

// New Template Page Hints
export function NewTemplateHints() {
  return (
    <HintBubble
      id="new-template"
      title="Creating a Template"
      message="Organize items into categories (like 'Hygiene', 'Safety'). Each item is a checkpoint. Set pass threshold to define minimum score required. Check 'Creates action on fail' for critical items."
      icon="star"
      position="bottom-right"
      delay={800}
    />
  );
}

// Settings Page Hints
export function SettingsPageHints() {
  return (
    <HintBubble
      id="settings-overview"
      title="Settings & Configuration"
      message="Manage your audit templates, invite team members, configure your organization, and handle billing. Templates are key - create them first to enable auditing."
      icon="lightbulb"
      position="bottom-right"
      delay={600}
    />
  );
}


