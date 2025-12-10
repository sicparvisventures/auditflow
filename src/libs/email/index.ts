import { Resend } from 'resend';

// ============================================
// Email Service Configuration
// ============================================

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'AuditFlow <noreply@auditflow.app>';

// ============================================
// Types
// ============================================

export type EmailType =
  | 'audit_completed'
  | 'action_created'
  | 'action_reminder'
  | 'action_overdue'
  | 'weekly_summary';

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type AuditCompletedEmailData = {
  auditId: string;
  locationName: string;
  auditDate: string;
  passPercentage: number;
  passed: boolean;
  totalActions: number;
  inspectorName: string;
  dashboardUrl: string;
};

export type ActionCreatedEmailData = {
  actionId: string;
  actionTitle: string;
  locationName: string;
  urgency: string;
  deadline: string | null;
  description: string | null;
  createdBy: string;
  dashboardUrl: string;
};

export type ActionReminderEmailData = {
  actionId: string;
  actionTitle: string;
  locationName: string;
  deadline: string;
  daysRemaining: number;
  dashboardUrl: string;
};

// ============================================
// Email Templates
// ============================================

function getAuditCompletedEmailHtml(data: AuditCompletedEmailData, recipientName: string): string {
  const statusColor = data.passed ? '#10b981' : '#ef4444';
  const statusText = data.passed ? 'GESLAAGD' : 'NIET GESLAAGD';
  const statusBg = data.passed ? '#d1fae5' : '#fee2e2';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Voltooid</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a9988 0%, #10b981 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">🔍 Audit Voltooid</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                Hallo ${recipientName},
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                Er is een audit voltooid voor <strong>${data.locationName}</strong>.
              </p>
              
              <!-- Status Badge -->
              <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; padding: 12px 24px; background-color: ${statusBg}; color: ${statusColor}; font-weight: 600; border-radius: 8px; font-size: 18px;">
                  ${statusText} - ${data.passPercentage}%
                </span>
              </div>
              
              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Locatie:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 500;">${data.locationName}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Datum:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 500;">${data.auditDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Inspecteur:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 500;">${data.inspectorName}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Score:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 500;">${data.passPercentage}%</td>
                      </tr>
                      ${data.totalActions > 0 ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Openstaande acties:</td>
                        <td style="color: #ef4444; font-size: 14px; font-weight: 500;">${data.totalActions} ${data.totalActions === 1 ? 'actie' : 'acties'}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a9988 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Bekijk Audit Details
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Deze email is verstuurd door AuditFlow.<br>
                Je ontvangt deze email omdat je bent toegewezen als manager voor deze locatie.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getActionCreatedEmailHtml(data: ActionCreatedEmailData, recipientName: string): string {
  const urgencyColors: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: '#dbeafe', text: '#1d4ed8', label: 'Laag' },
    medium: { bg: '#fef3c7', text: '#d97706', label: 'Medium' },
    high: { bg: '#fed7aa', text: '#ea580c', label: 'Hoog' },
    critical: { bg: '#fee2e2', text: '#dc2626', label: 'Kritiek' },
  };

  const urgency = urgencyColors[data.urgency] || urgencyColors.medium;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nieuwe Actie Aangemaakt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">⚠️ Nieuwe Actie</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                Hallo ${recipientName},
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                Er is een nieuwe actie aangemaakt voor <strong>${data.locationName}</strong> die jouw aandacht nodig heeft.
              </p>
              
              <!-- Action Title -->
              <div style="background-color: #f9fafb; border-left: 4px solid #1a9988; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <h3 style="margin: 0 0 8px; color: #111827; font-size: 18px;">${data.actionTitle}</h3>
                ${data.description ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${data.description}</p>` : ''}
              </div>
              
              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Urgentie:</span>
                    <span style="float: right; display: inline-block; padding: 4px 12px; background-color: ${urgency.bg}; color: ${urgency.text}; border-radius: 9999px; font-size: 12px; font-weight: 600;">${urgency.label}</span>
                  </td>
                </tr>
                ${data.deadline ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Deadline:</span>
                    <span style="float: right; color: #111827; font-size: 14px; font-weight: 500;">${data.deadline}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Aangemaakt door:</span>
                    <span style="float: right; color: #111827; font-size: 14px; font-weight: 500;">${data.createdBy}</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a9988 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Actie Bekijken
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Deze email is verstuurd door AuditFlow.<br>
                Je ontvangt deze email omdat je bent toegewezen als manager voor deze locatie.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getActionReminderEmailHtml(data: ActionReminderEmailData, recipientName: string): string {
  const isOverdue = data.daysRemaining < 0;
  const headerBg = isOverdue
    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  const headerEmoji = isOverdue ? '🚨' : '⏰';
  const headerTitle = isOverdue ? 'Actie Overschreden' : 'Actie Herinnering';

  const daysText = isOverdue
    ? `${Math.abs(data.daysRemaining)} dagen over deadline`
    : data.daysRemaining === 0
      ? 'Vandaag deadline!'
      : data.daysRemaining === 1
        ? 'Nog 1 dag'
        : `Nog ${data.daysRemaining} dagen`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: ${headerBg}; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${headerEmoji} ${headerTitle}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                Hallo ${recipientName},
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                ${isOverdue
                  ? 'De volgende actie is over de deadline en moet zo snel mogelijk worden afgerond:'
                  : 'De volgende actie nadert zijn deadline:'}
              </p>
              
              <!-- Action Card -->
              <div style="background-color: ${isOverdue ? '#fee2e2' : '#fef3c7'}; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px; color: #111827; font-size: 18px;">${data.actionTitle}</h3>
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                  <strong>Locatie:</strong> ${data.locationName}
                </p>
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                  <strong>Deadline:</strong> ${data.deadline}
                </p>
                <p style="margin: 0; color: ${isOverdue ? '#dc2626' : '#d97706'}; font-size: 14px; font-weight: 600;">
                  ${daysText}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a9988 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Actie Afronden
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Deze email is verstuurd door AuditFlow.<br>
                Je ontvangt deze email omdat je bent toegewezen als manager voor deze locatie.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================
// Send Email Functions
// ============================================

export async function sendAuditCompletedEmail(
  recipient: EmailRecipient,
  data: AuditCompletedEmailData,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    const recipientName = recipient.name || 'Manager';
    const html = getAuditCompletedEmailHtml(data, recipientName);
    const statusText = data.passed ? 'Geslaagd' : 'Niet geslaagd';

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject: `🔍 Audit Voltooid: ${data.locationName} - ${statusText} (${data.passPercentage}%)`,
      html,
    });

    if (result.error) {
      console.error('Error sending audit completed email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error sending audit completed email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendActionCreatedEmail(
  recipient: EmailRecipient,
  data: ActionCreatedEmailData,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    const recipientName = recipient.name || 'Manager';
    const html = getActionCreatedEmailHtml(data, recipientName);

    const urgencyLabels: Record<string, string> = {
      low: '🟢 Laag',
      medium: '🟡 Medium',
      high: '🟠 Hoog',
      critical: '🔴 Kritiek',
    };
    const urgencyLabel = urgencyLabels[data.urgency] || urgencyLabels.medium;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject: `⚠️ Nieuwe Actie: ${data.actionTitle} [${urgencyLabel}]`,
      html,
    });

    if (result.error) {
      console.error('Error sending action created email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error sending action created email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendActionReminderEmail(
  recipient: EmailRecipient,
  data: ActionReminderEmailData,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    const recipientName = recipient.name || 'Manager';
    const html = getActionReminderEmailHtml(data, recipientName);

    const isOverdue = data.daysRemaining < 0;
    const emoji = isOverdue ? '🚨' : '⏰';
    const prefix = isOverdue ? 'OVERDUE' : 'Herinnering';

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject: `${emoji} ${prefix}: ${data.actionTitle} - ${data.locationName}`,
      html,
    });

    if (result.error) {
      console.error('Error sending action reminder email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error sending action reminder email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
