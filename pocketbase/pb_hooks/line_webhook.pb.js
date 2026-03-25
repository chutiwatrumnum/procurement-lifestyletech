// Webhook รับข้อความจาก LINE - แค่ตอบกลับด้วย LINE User ID ของผู้ส่ง
routerAdd("POST", "/api/line-webhook", (c) => {
    try {
        const info = c.requestInfo();
        const body = info.body || {};

        const events = body["events"];
        if (!events || events.length === 0) {
            return c.json(200, { "status": "ok" });
        }

        const event = events[0];
        const replyToken = String(event["replyToken"] || "");

        // ข้าม dummy token
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

        // ตรวจสอบว่าผู้ส่งเคย link กับระบบหรือยัง
        let linkedUser = null;
        let userName = "";
        try {
            linkedUser = $app.findRecordByFilter(
                "users",
                `line_user_id="${userId}"`,
                "id,email,name"
            );
            if (linkedUser) {
                userName = linkedUser.get("name") || "";
            }
        } catch (e) {
            linkedUser = null;
        }

        let replyText = "";
        if (linkedUser) {
            // ถ้าเคย link แล้ว
            replyText = "✅ *คุณได้เชื่อมต่อกับระบบแล้ว*\n\n" +
                "👤 ชื่อ: " + userName + "\n" +
                "📧 Email: " + linkedUser.get("email") + "\n\n" +
                "💡 คุณจะได้รับการแจ้งเตือนจากระบบ Procurement";
        } else {
            // ถ้ายังไม่ได้ link
            replyText = "👋 *สวัสดีครับ!*\n\n" +
                "📋 LINE User ID ของท่านคือ:\n" +
                "`" + userId + "`\n\n" +
                "🔗 หากต้องการรับการแจ้งเตือน ให้นำรหัสนี้ไปผูกในระบบ Procurement → Profile → LINE Integration";
        }

        // ส่ง reply
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
