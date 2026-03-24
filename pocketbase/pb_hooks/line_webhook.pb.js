// Webhook รับข้อความจาก LINE แล้วตอบกลับด้วย User ID
// PocketBase v0.23+ ใช้ c.requestInfo() แทน $apis.requestInfo(c)
routerAdd("POST", "/api/line-webhook", (c) => {
    try {
        // ใช้ c.requestInfo() ซึ่งมีอยู่ใน PocketBase v0.23+
        const info = c.requestInfo();
        const body = info.body || {};

        const events = body["events"];
        if (!events || events.length === 0) {
            return c.json(200, { "status": "ok" });
        }

        const event = events[0];
        const replyToken = String(event["replyToken"] || "");

        // dummy token จากปุ่ม Verify
        if (!replyToken ||
            replyToken === "00000000000000000000000000000000" ||
            replyToken === "ffffffffffffffffffffffffffffffff") {
            return c.json(200, { "status": "ok" });
        }

        const source = event["source"] || {};
        const userId = String(source["userId"] || "");
        if (!userId) {
            return c.json(200, { "status": "ok" });
        }

        const token = $os.getenv("LINE_CHANNEL_ACCESS_TOKEN");
        if (!token) {
            console.log("[LINE Webhook] Missing LINE_CHANNEL_ACCESS_TOKEN");
            return c.json(200, { "status": "ok" });
        }

        const replyText = "สวัสดีครับ!\n\n" +
            "📋 รหัส LINE User ID ของท่านคือ:\n" +
            userId + "\n\n" +
            "⚠️ กรุณาคัดลอกรหัสนี้แล้วส่งให้แอดมินครับ";

        const result = $http.send({
            url: "https://api.line.me/v2/bot/message/reply",
            method: "POST",
            body: JSON.stringify({
                replyToken: replyToken,
                messages: [{ type: "text", text: replyText }]
            }),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        console.log("[LINE Webhook] Replied to " + userId + " status=" + result.statusCode);

    } catch (err) {
        console.error("[LINE Webhook] Error: ", String(err));
    }

    return c.json(200, { "status": "ok" });
});
