import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listings, userLocation, userPreferences } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare data for AI analysis
    const listingsData = listings.map((listing: any) => ({
      id: listing.id,
      title: listing.title || listing.food_name,
      category: listing.category,
      quantity: `${listing.quantity} ${listing.quantity_unit}`,
      location: listing.general_area,
      expiresIn: listing.expiration_date,
      transportationAvailable: listing.transportation_available,
    }));

    const systemPrompt = `You are an AI assistant helping match food donations with recipients. 
Analyze food listings and recipient needs to calculate match scores (0-100).

Consider these factors:
1. Location proximity (if user location provided)
2. Food category preferences
3. Quantity needs
4. Expiration urgency (prefer items expiring soon)
5. Transportation availability

Return suggestions with match scores, reasoning, and prioritization.`;

    const userPrompt = `User Location: ${userLocation || "Not provided"}
User Preferences: ${JSON.stringify(userPreferences || {})}

Available Food Listings:
${JSON.stringify(listingsData, null, 2)}

Calculate match scores for each listing and provide recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "match_donations",
            description: "Calculate match scores for food donations",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      listingId: { type: "string" },
                      matchScore: { 
                        type: "number",
                        minimum: 0,
                        maximum: 100
                      },
                      reasoning: { type: "string" },
                      priority: { 
                        type: "string",
                        enum: ["high", "medium", "low"]
                      }
                    },
                    required: ["listingId", "matchScore", "reasoning", "priority"]
                  }
                }
              },
              required: ["matches"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "match_donations" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway Error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const matches = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(matches),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Match Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to match donations" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});