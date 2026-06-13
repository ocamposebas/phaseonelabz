export const prerender = false;

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function POST({ request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return jsonResponse(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        400
      );
    }

    const apiKey = import.meta.env.OMNISEND_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        {
          success: false,
          message: "OMNISEND_API_KEY is missing on the server.",
        },
        500
      );
    }

    const now = new Date().toISOString();

    const omnisendResponse = await fetch(
      "https://api.omnisend.com/v3/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          sendWelcomeEmail: true,
          identifiers: [
            {
              type: "email",
              id: email,
              sendWelcomeMessage: true,
              channels: {
                email: {
                  status: "subscribed",
                  statusDate: now,
                },
              },
            },
          ],
          tags: [
            "newsletter",
            "welcome10",
            "source: phaseone-newsletter",
          ],
          customProperties: {
            signup_source: "phaseone_newsletter_section",
            welcome_coupon: "WELCOME10",
          },
        }),
      }
    );

    const data = await omnisendResponse.json().catch(() => ({}));

    if (!omnisendResponse.ok) {
      console.error("Omnisend subscribe error:", {
        status: omnisendResponse.status,
        data,
      });

      return jsonResponse(
        {
          success: false,
          message:
            data?.message ||
            data?.error ||
            `Omnisend rejected the request. Status: ${omnisendResponse.status}`,
          details: data,
        },
        omnisendResponse.status
      );
    }

    return jsonResponse({
      success: true,
      message: "You’re in. Check your email for WELCOME10.",
      data,
    });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Something went wrong. Please try again.",
      },
      500
    );
  }
}