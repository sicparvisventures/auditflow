import type { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

import { createServiceClient } from '@/libs/supabase/server';

export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with the secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  // Get the event type
  const eventType = evt.type;

  // Create Supabase client with service role
  const supabase = createServiceClient();

  try {
    switch (eventType) {
      // ==================
      // USER EVENTS
      // ==================
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        if (!primaryEmail) {
          console.error('No email address found for user:', id);
          break;
        }

        const { error } = await supabase.rpc('handle_clerk_user_created', {
          p_clerk_user_id: id,
          p_email: primaryEmail,
          p_first_name: first_name || null,
          p_last_name: last_name || null,
          p_image_url: image_url || null,
        });

        if (error) {
          console.error('Error creating user:', error);
          throw error;
        }

        console.log(`User created: ${id}`);
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        const { error } = await supabase.rpc('handle_clerk_user_updated', {
          p_clerk_user_id: id,
          p_email: primaryEmail || null,
          p_first_name: first_name || null,
          p_last_name: last_name || null,
          p_image_url: image_url || null,
        });

        if (error) {
          console.error('Error updating user:', error);
          throw error;
        }

        console.log(`User updated: ${id}`);
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;

        if (!id) {
          console.error('No user ID in delete event');
          break;
        }

        const { error } = await supabase.rpc('handle_clerk_user_deleted', {
          p_clerk_user_id: id,
        });

        if (error) {
          console.error('Error deleting user:', error);
          throw error;
        }

        console.log(`User deleted: ${id}`);
        break;
      }

      // ==================
      // ORGANIZATION EVENTS
      // ==================
      case 'organization.created': {
        const { id, name, slug, created_by } = evt.data;

        const { error } = await supabase.rpc('handle_clerk_organization_created', {
          p_clerk_org_id: id,
          p_name: name,
          p_slug: slug || id,
          p_created_by_clerk_user_id: created_by || null,
        });

        if (error) {
          console.error('Error creating organization:', error);
          throw error;
        }

        console.log(`Organization created: ${id}`);
        break;
      }

      case 'organization.updated': {
        const { id, name, slug } = evt.data;

        const { error } = await supabase.rpc('handle_clerk_organization_updated', {
          p_clerk_org_id: id,
          p_name: name,
          p_slug: slug || null,
        });

        if (error) {
          console.error('Error updating organization:', error);
          throw error;
        }

        console.log(`Organization updated: ${id}`);
        break;
      }

      case 'organization.deleted': {
        const { id } = evt.data;

        if (!id) {
          console.error('No organization ID in delete event');
          break;
        }

        const { error } = await supabase.rpc('handle_clerk_organization_deleted', {
          p_clerk_org_id: id,
        });

        if (error) {
          console.error('Error deleting organization:', error);
          throw error;
        }

        console.log(`Organization deleted: ${id}`);
        break;
      }

      // ==================
      // MEMBERSHIP EVENTS
      // ==================
      case 'organizationMembership.created': {
        const { id, organization, public_user_data, role } = evt.data;

        const { error } = await supabase.rpc('handle_clerk_organization_membership_created', {
          p_clerk_membership_id: id,
          p_clerk_org_id: organization.id,
          p_clerk_user_id: public_user_data.user_id,
          p_role: role || 'member',
        });

        if (error) {
          console.error('Error creating membership:', error);
          throw error;
        }

        console.log(`Membership created: ${id}`);
        break;
      }

      case 'organizationMembership.updated': {
        const { id, role } = evt.data;

        const { error } = await supabase.rpc('handle_clerk_organization_membership_updated', {
          p_clerk_membership_id: id,
          p_role: role || 'member',
        });

        if (error) {
          console.error('Error updating membership:', error);
          throw error;
        }

        console.log(`Membership updated: ${id}`);
        break;
      }

      case 'organizationMembership.deleted': {
        const { id } = evt.data;

        if (!id) {
          console.error('No membership ID in delete event');
          break;
        }

        const { error } = await supabase.rpc('handle_clerk_organization_membership_deleted', {
          p_clerk_membership_id: id,
        });

        if (error) {
          console.error('Error deleting membership:', error);
          throw error;
        }

        console.log(`Membership deleted: ${id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}
