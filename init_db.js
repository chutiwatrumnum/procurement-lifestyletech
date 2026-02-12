import http from 'http';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PB_URL = 'http://127.0.0.1:8090';

async function request(path, method, body = null, token = null) {
    const url = new URL(`${PB_URL}${path}`);
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = token;

    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const json = data ? JSON.parse(data) : {};
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
                else reject({ status: res.statusCode, data: json });
            });
        });
        req.on('error', (e) => reject({ message: `PocketBase NOT RUNNING` }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function setup() {
    console.log('\n🚀 ProcureReal - ฐานข้อมูลสมบูรณ์แบบ (STABLE VERSION v0.36) 🚀');
    const email = await new Promise(r => rl.question('PocketBase Admin Email: ', r));
    const password = await new Promise(r => rl.question('PocketBase Admin Password: ', r));

    try {
        console.log('⏳ กำลังเชื่อมต่อระบบ...');
        let auth, token;
        try {
            auth = await request('/api/collections/_superusers/auth-with-password', 'POST', { identity: email, password });
            token = auth.token;
        } catch (e) {
            auth = await request('/api/admins/auth-with-password', 'POST', { identity: email, password });
            token = auth.token;
        }
        console.log('✅ Login สำเร็จ!');

        async function createCleanTable(name, fields) {
            console.log(`📦 จัดการตาราง: ${name}...`);
            try {
                const list = await request(`/api/collections?filter=(name='${name}')`, 'GET', null, token);
                if (list.items && list.items.length > 0) {
                    console.log(`   🗑️ ลบตารางเก่าที่ค้างอยู่...`);
                    await request(`/api/collections/${list.items[0].id}`, 'DELETE', null, token);
                }
            } catch (e) {}

            return await request('/api/collections', 'POST', {
                name, type: 'base', fields,
                listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null
            }, token);
        }

        // --- สร้างตารางแบบ Stable (ใช้ Text แทน Relation เพื่อเลี่ยงบัคระบบ) ---
        
        await createCleanTable('projects', [
            { name: 'name', type: 'text', required: true },
            { name: 'code', type: 'text', required: true },
            { name: 'budget', type: 'number' },
            { name: 'location', type: 'text' },
            { name: 'status', type: 'text' }
        ]);

        await createCleanTable('vendors', [
            { name: 'name', type: 'text', required: true },
            { name: 'tax_id', type: 'text' },
            { name: 'category', type: 'text' },
            { name: 'address', type: 'text' },
            { name: 'contact_person', type: 'text', required: true },
            { name: 'email', type: 'email' },
            { name: 'phone', type: 'text' },
            { name: 'status', type: 'text' }
        ]);

        await createCleanTable('purchase_requests', [
            { name: 'pr_number', type: 'text', required: true },
            { name: 'type', type: 'text' },
            { name: 'project_id', type: 'text' }, // เก็บ ID เป็นข้อความเพื่อความชัวร์
            { name: 'vendor_id', type: 'text' },
            { name: 'po_ref', type: 'text' },
            { name: 'delivery_location', type: 'text' },
            { name: 'requester_id', type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'total_amount', type: 'number' }
        ]);

        await createCleanTable('pr_items', [
            { name: 'pr_id', type: 'text', required: true },
            { name: 'name', type: 'text', required: true },
            { name: 'unit', type: 'text' },
            { name: 'quantity', type: 'number' },
            { name: 'unit_price', type: 'number' },
            { name: 'total_price', type: 'number' }
        ]);

        console.log('\n✨ กำลังเพิ่มข้อมูลโครงการจริง "Skyline Residencies" และผู้ขาย "Apex"...');
        await request('/api/collections/projects/records', 'POST', { name: 'Skyline Residencies Phase II', code: 'SKY-P2', budget: 5000000, status: 'active' }, token);
        await request('/api/collections/vendors/records', 'POST', { name: 'Apex Construction Ltd.', contact_person: 'Johnathan Doe', email: 'john@apex.com', status: 'active' }, token);

        console.log('\n🎉 เสร็จสมบูรณ์ 100%! ข้อมูลจะมาโชว์ในหน้าเว็บทันทีค่ะ ✨🚀🐻✅');

    } catch (err) {
        console.error('\n❌ เกิดข้อผิดพลาด:', JSON.stringify(err.data || err));
    } finally {
        rl.close();
    }
}

setup();
