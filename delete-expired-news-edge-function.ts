// Supabase Edge Function to delete expired news and their images
// Deploy this as an Edge Function and schedule it to run daily via cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all expired news
    const { data: expiredNews, error: fetchError } = await supabase
      .from("news")
      .select("id, image_url")
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    if (fetchError) {
      throw fetchError;
    }

    let deletedCount = 0;
    let deletedImagesCount = 0;

    // Process each expired news item
    for (const news of expiredNews || []) {
      // Delete image from storage if it exists
      if (news.image_url) {
        try {
          // Extract file path from URL
          const urlMatch = news.image_url.match(/\/course-media\/(.+)$/);
          if (urlMatch && urlMatch[1]) {
            const filePath = urlMatch[1];
            
            // Delete from storage
            const { error: storageError } = await supabase.storage
              .from("course-media")
              .remove([filePath]);

            if (!storageError) {
              deletedImagesCount++;
            } else {
              console.error(`Failed to delete image ${filePath}:`, storageError);
            }
          }
        } catch (error) {
          console.error(`Error deleting image for news ${news.id}:`, error);
        }
      }

      // Delete news record
      const { error: deleteError } = await supabase
        .from("news")
        .delete()
        .eq("id", news.id);

      if (!deleteError) {
        deletedCount++;
      } else {
        console.error(`Failed to delete news ${news.id}:`, deleteError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedNews: deletedCount,
        deletedImages: deletedImagesCount,
        message: `Deleted ${deletedCount} expired news items and ${deletedImagesCount} images`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

