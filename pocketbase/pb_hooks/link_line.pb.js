// API Endpoint สำหรับผูก LINE User ID กับ Account
// Usage: POST /api/link-line โดยส่ง line_user_id จาก body

routerAdd("POST", "/api/link-line", (c) => {
    try {
        const info = c.requestInfo();
        const body = info.body || {};
        
        const lineUserId = String(body["line_user_id"] || "").trim();
        
        // ตรวจสอบว่ามี line_user_id หรือไม่
        if (!lineUserId) {
            return c.json(400, { 
                success: false, 
                message: "กรุณาระบุ LINE User ID" 
            });
        }
        
        // ตรวจสอบว่ามี user ที่ login อยู่หรือไม่
        const currentUser = info.auth;
        if (!currentUser || !currentUser.id) {
            return c.json(401, { 
                success: false, 
                message: "กรุณาเข้าสู่ระบบก่อน" 
            });
        }
        
        // ตรวจสอบว่า line_user_id นี้ถูกใช้โดย user คนอื่นแล้วหรือไม่
        let existingUser = null;
        try {
            existingUser = $app.findRecordByFilter("users", `line_user_id="${lineUserId}"`, "id,email,name");
        } catch (e) {
            existingUser = null;
        }
        
        if (existingUser && existingUser.id !== currentUser.id) {
            return c.json(400, { 
                success: false, 
                message: "LINE User ID นี้ถูกใช้โดยผู้ใช้อื่นแล้ว" 
            });
        }
        
        // ดึง user record และอัปเดต line_user_id
        const userRecord = $app.findRecordById("users", currentUser.id);
        userRecord.set("line_user_id", lineUserId);
        $app.save(userRecord);
        
        console.log("[Link LINE] User " + currentUser.id + " linked with LINE ID: " + lineUserId);
        
        return c.json(200, { 
            success: true, 
            message: "ผูก LINE สำเร็จ",
            line_user_id: lineUserId
        });
        
    } catch (err) {
        console.error("[Link LINE] Error:", String(err));
        return c.json(500, { 
            success: false, 
            message: "เกิดข้อผิดพลาด: " + String(err) 
        });
    }
});

// API Endpoint สำหรับยกเลิกการผูก LINE
routerAdd("POST", "/api/unlink-line", (c) => {
    try {
        const info = c.requestInfo();
        
        // ตรวจสอบว่ามี user ที่ login อยู่หรือไม่
        const currentUser = info.auth;
        if (!currentUser || !currentUser.id) {
            return c.json(401, { 
                success: false, 
                message: "กรุณาเข้าสู่ระบบก่อน" 
            });
        }
        
        // ดึง user record และอัปเดต line_user_id เป็น empty
        const userRecord = $app.findRecordById("users", currentUser.id);
        userRecord.set("line_user_id", "");
        $app.save(userRecord);
        
        console.log("[Unlink LINE] User " + currentUser.id + " unlinked LINE");
        
        return c.json(200, { 
            success: true, 
            message: "ยกเลิกการผูก LINE สำเร็จ" 
        });
        
    } catch (err) {
        console.error("[Unlink LINE] Error:", String(err));
        return c.json(500, { 
            success: false, 
            message: "เกิดข้อผิดพลาด: " + String(err) 
        });
    }
});

// API Endpoint สำหรับตรวจสอบสถานะการผูก LINE
routerAdd("GET", "/api/line-status", (c) => {
    try {
        const info = c.requestInfo();
        
        // ตรวจสอบว่ามี user ที่ login อยู่หรือไม่
        const currentUser = info.auth;
        if (!currentUser || !currentUser.id) {
            return c.json(401, { 
                success: false, 
                message: "กรุณาเข้าสู่ระบบก่อน" 
            });
        }
        
        // ดึงข้อมูล user เพื่อดู line_user_id
        const userRecord = $app.findRecordById("users", currentUser.id);
        const lineUserId = userRecord.get("line_user_id") || "";
        
        return c.json(200, { 
            success: true, 
            linked: !!lineUserId,
            line_user_id: lineUserId
        });
        
    } catch (err) {
        console.error("[Line Status] Error:", String(err));
        return c.json(500, { 
            success: false, 
            message: "เกิดข้อผิดพลาด: " + String(err) 
        });
    }
});
