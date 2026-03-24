// Hook ทำงานเมื่อมี notification record ใหม่เข้ามา
// → ดึง line_user_id ของ user → ส่ง LINE message
onRecordAfterCreateSuccess((e) => {
    const notif = e.record;
    const userId = notif.get("user");
    if (!userId) return;

    try {
        // PocketBase v0.23+: ใช้ $app.findRecordById แทน $app.dao().findRecordById
        const user = $app.findRecordById("users", userId);
        const lineUserId = user.get("line_user_id");

        if (!lineUserId) return;

        const token = $os.getenv("LINE_CHANNEL_ACCESS_TOKEN");
        if (!token) {
            console.log("[LINE] Missing LINE_CHANNEL_ACCESS_TOKEN env variable");
            return;
        }

        const prId = notif.get("pr_id") || "";
        const title = notif.get("title") || "";
        const message = notif.get("message") || "";

        let text = "📢 " + title + "\n━━━━━━━━━━━━━━━\n" + message;

        if (prId) {
            text += "\n🔗 https://procurement-11c33.web.app/purchase-requests/" + prId;
        }

        const res = $http.send({
            url: "https://api.line.me/v2/bot/message/push",
            method: "POST",
            body: JSON.stringify({
                to: lineUserId,
                messages: [{ type: "text", text: text }]
            }),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        console.log("[LINE] Notification sent to " + lineUserId + " (Status: " + res.statusCode + ")");

    } catch (err) {
        console.error("[LINE] Error sending notification: ", String(err));
    }

}, "notifications");
