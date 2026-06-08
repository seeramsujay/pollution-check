// edge/audit-proxy.ts  
export interface Env {  
  OPENAI_API_KEY: string;  
}

export default {  
  async fetch(request: Request, env: Env): Promise<Response> {  
    const corsHeaders = {  
      'Access-Control-Allow-Origin': '*',  
      'Access-Control-Allow-Methods': 'POST, OPTIONS',  
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-Name',  
    };

    if (request.method === 'OPTIONS') {  
      return new Response(null, { headers: corsHeaders });  
    }

    if (request.method !== 'POST') {  
      return new Response(JSON.stringify({ error: 'Post requests only' }), {  
        status: 405,  
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      });  
    }

    try {  
      const { imagePayload, systemPrompt } = await request.json() as { imagePayload: string; systemPrompt: string };  
        
      if (!imagePayload) {  
        return new Response(JSON.stringify({ error: 'Missing imagePayload parameter' }), {  
          status: 400,  
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        });  
      }

      // Format payload for OpenAI gpt-4o-mini  
      const openAiBody = {  
        model: 'gpt-4o-mini',  
        messages: [  
          { role: 'system', content: systemPrompt },  
          {  
            role: 'user',  
            content: [  
              {  
                type: 'image_url',  
                image_url: { url: imagePayload }  
              }  
            ]  
          }  
        ],  
        temperature: 0.1,  
        response_format: { type: 'json_object' }  
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {  
        method: 'POST',  
        headers: {  
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,  
          'Content-Type': 'application/json'  
        },  
        body: JSON.stringify(openAiBody)  
      });

      if (!response.ok) {  
        const errorDetails = await response.text();  
        return new Response(JSON.stringify({ error: 'OpenAI Upstream Error', details: errorDetails }), {  
          status: response.status,  
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        });  
      }

      const rawData = await response.json() as {  
        choices: Array<{ message: { content: string } }>;  
        usage?: { prompt_tokens: number; completion_tokens: number };  
      };  
        
      const responseContent = rawData.choices?.[0]?.message?.content || '{}';  
      const promptTokens = rawData.usage?.prompt_tokens || 0;  
      const completionTokens = rawData.usage?.completion_tokens || 0;

      // Meta-Feature Token-to-Carbon Calculation logic  
      // Wh constants reflect model processing on H100 GPU clusters:  
      // 200 Wh per Million input tokens, 990 Wh per Million output tokens.  
      const WH_PER_INPUT_TOKEN = 2.0e-6; // 2.0 Wh per Million is 2.0e-6 Wh per token
      const WH_PER_OUTPUT_TOKEN = 9.9e-6; // 9.9 Wh per Million is 9.9e-6 Wh per token
      const HYPERSCALE_PUE = 1.1; // Cloud provider Power Usage Effectiveness  
        
      const queryEnergyWh = (  
        (promptTokens * WH_PER_INPUT_TOKEN) +   
        (completionTokens * WH_PER_OUTPUT_TOKEN)  
      ) * HYPERSCALE_PUE;

      // Host server grid emissions footprint - e.g. US East Northern Virginia (SERC region):   
      // 0.3651 kg CO2e per kWh, which converts to 365.13 micro-grams (ug) of CO2e per Wh.  
      const US_EAST_GRID_INTENSITY_UG_PER_WH = 365.1278;   
      const totalCarbonMicroGrams = Math.round(queryEnergyWh * US_EAST_GRID_INTENSITY_UG_PER_WH);

      return new Response(JSON.stringify({  
        data: JSON.parse(responseContent),  
        tokensConsumed: promptTokens + completionTokens,  
        carbonCostMicroGrams: totalCarbonMicroGrams  
      }), {  
        headers: {  
          ...corsHeaders,  
          'Content-Type': 'application/json',  
          'x-ai-carbon-cost-ug': totalCarbonMicroGrams.toString()  
        }  
      });

    } catch (err: any) {  
      return new Response(JSON.stringify({ error: err.message }), {  
        status: 500,  
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      });  
    }  
  }  
};
