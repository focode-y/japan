export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const name = String(body?.name || "").trim();
    const contact = String(body?.contact || "").trim();
    const property = String(body?.property || "").trim();
    const message = String(body?.message || "").trim();
    const source = String(body?.source || "").trim();
    const submittedAt = String(body?.submittedAt || "").trim();

    if (!name || !contact) {
      return json({ ok: false, error: "missing_required_fields" }, 400);
    }

    const webhook = context.env.CONTACT_WEBHOOK_URL;
    if (!webhook) {
      return json({ ok: false, error: "webhook_not_configured" }, 500);
    }

    const resp = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        contact,
        property,
        message,
        source,
        submittedAt
      })
    });

    if (!resp.ok) {
      return json({ ok: false, error: "webhook_request_failed" }, 502);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
