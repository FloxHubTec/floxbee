import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  numbers: string[]; // Array of phone numbers to validate
}

interface ValidationResult {
  number: string;
  formatted: string;
  valid: boolean;
  exists: boolean | null; // null means couldn't verify
  error?: string;
}

// Format Brazilian phone number
function formatBrazilianNumber(number: string): string {
  // Remove all non-numeric characters
  let cleaned = number.replace(/\D/g, "");
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, "");
  
  // Add country code if missing
  if (!cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }
  
  // Handle 9-digit mobile numbers (add 9 if missing for mobile)
  if (cleaned.length === 12) {
    // Check if it's a mobile number (starts with 6-9 after area code)
    const areaCode = cleaned.substring(2, 4);
    const firstDigit = cleaned.charAt(4);
    if (["6", "7", "8", "9"].includes(firstDigit)) {
      cleaned = cleaned.substring(0, 4) + "9" + cleaned.substring(4);
    }
  }
  
  return cleaned;
}

// Basic validation rules
function validateNumber(number: string): { valid: boolean; error?: string } {
  const cleaned = number.replace(/\D/g, "");
  
  if (cleaned.length < 10) {
    return { valid: false, error: "Número muito curto" };
  }
  
  if (cleaned.length > 15) {
    return { valid: false, error: "Número muito longo" };
  }
  
  // Brazilian number validation
  if (cleaned.startsWith("55")) {
    const withoutCountry = cleaned.substring(2);
    
    // Area code validation (11-99)
    const areaCode = parseInt(withoutCountry.substring(0, 2));
    if (areaCode < 11 || areaCode > 99) {
      return { valid: false, error: "DDD inválido" };
    }
    
    // Must have 8 or 9 digits after area code
    const localNumber = withoutCountry.substring(2);
    if (localNumber.length < 8 || localNumber.length > 9) {
      return { valid: false, error: "Número local inválido" };
    }
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { numbers }: ValidateRequest = await req.json();
    
    if (!numbers || !Array.isArray(numbers)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'numbers' array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validating numbers:", { count: numbers.length });

    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const canVerifyExistence = !!(WHATSAPP_TOKEN && PHONE_NUMBER_ID);

    const results: ValidationResult[] = [];

    for (const number of numbers) {
      const formatted = formatBrazilianNumber(number);
      const validation = validateNumber(formatted);
      
      const result: ValidationResult = {
        number,
        formatted,
        valid: validation.valid,
        exists: null,
        error: validation.error,
      };

      // If valid and we have WhatsApp credentials, verify if number exists
      if (validation.valid && canVerifyExistence) {
        try {
          // Use WhatsApp Business API to check if number exists
          // Note: This is a simplified check - in production you'd use the contacts API
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/contacts`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                blocking: "wait",
                contacts: [`+${formatted}`],
                force_check: true,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const contact = data.contacts?.[0];
            result.exists = contact?.status === "valid";
          }
        } catch (error) {
          console.error("WhatsApp check error:", error);
          // Don't fail the whole validation, just leave exists as null
        }
      }

      results.push(result);
    }

    const summary = {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      verified: results.filter(r => r.exists === true).length,
      notOnWhatsApp: results.filter(r => r.exists === false).length,
      unverified: results.filter(r => r.exists === null).length,
    };

    console.log("Validation complete:", summary);

    return new Response(
      JSON.stringify({ results, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
