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
        const prNumber = notif.get("pr_number") || "";
        const prType = notif.get("pr_type") || "";
        const notifType = notif.get("type") || "";
        const title = notif.get("title") || "";
        const message = notif.get("message") || "";

        let text = "📢 " + title + "\n━━━━━━━━━━━━━━━\n" + message;

        if (prId) {
            let url;
            
            // ถ้า PR ถูกตีกลับ → ไปหน้ารายละเอียด PR โดยตรง
            if (notifType === "rejection") {
                url = "https://procurement-11c33.web.app/purchase-requests/" + prId;
            } else {
                // PR ใหม่หรืออนุมัติ → กำหนด URL ตามประเภท PR
                if (prType === "project") {
                    // PRP - ใบขอซื้อโครงการ → หน้าอนุมัติ PR โครงการ
                    url = "https://procurement-11c33.web.app/purchase-requests/approval";
                } else if (prType === "sub") {
                    // PRS - ใบขอซื้อย่อย → หน้าอนุมัติ PO
                    url = "https://procurement-11c33.web.app/purchase-orders/approval";
                } else if (prType === "other") {
                    // PRO - ใบขอซื้ออื่นๆ → หน้าอนุมัติ PR อื่นๆ
                    url = "https://procurement-11c33.web.app/purchase-requests/approval-other";
                } else {
                    // ไม่มี pr_type → ไปหน้ารายละเอียด PR
                    url = "https://procurement-11c33.web.app/purchase-requests/" + prId;
                }
            }
            
            text += "\n🔗 " + url;
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
