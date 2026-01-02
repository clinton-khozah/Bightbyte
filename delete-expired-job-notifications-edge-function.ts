// Deno Edge Function to delete expired job post notifications
// Deploy this to Supabase Edge Functions and schedule it to run hourly

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Delete expired notifications
    const { data: deletedNotifications, error: deleteError } = await supabaseClient
      .from('job_post_notifications')
      .delete()
      .lte('expires_at', new Date().toISOString())
      .select('id')

    if (deleteError) {
      console.error('Error deleting expired notifications:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const deletedCount = deletedNotifications?.length || 0

    return new Response(
      JSON.stringify({
        message: `Deleted ${deletedCount} expired notifications.`,
        deletedCount,
        deletedIds: deletedNotifications?.map(n => n.id) || [],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

