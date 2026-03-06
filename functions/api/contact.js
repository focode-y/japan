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

    // Priority 1: send email via Resend
    const resendApiKey = context.env.RESEND_API_KEY;
    const toEmail = context.env.CONTACT_TO_EMAIL;
    const fromEmail = context.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
    if (resendApiKey && toEmail) {
      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: `【官網詢盤】${name} - ${property || "未填寫物件"}`,
          text:
            `姓名: ${name}\n` +
            `聯絡方式: ${contact}\n` +
            `感興趣物件: ${property || "未填寫"}\n` +
            `備註: ${message || "無"}\n` +
            `來源頁面: ${source || "未知"}\n` +
            `提交時間: ${submittedAt || new Date().toISOString()}`
        })
      });

      if (!emailResp.ok) {
        const bodyText = await emailResp.text();
        return json({ ok: false, error: "email_send_failed", detail: bodyText }, 502);
      }
      return json({ ok: true, via: "email" }, 200);
    }

    // Priority 2: fallback webhook
    const webhook = context.env.CONTACT_WEBHOOK_URL;
    if (webhook) {
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
      return json({ ok: true, via: "webhook" }, 200);
    }

    return json({ ok: false, error: "delivery_not_configured" }, 500);
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
