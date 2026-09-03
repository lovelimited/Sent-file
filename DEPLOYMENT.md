# คู่มือการติดตั้งระบบขึ้นใช้งานจริง (Production Deployment Runbook)
### โครงการ: SCHOOL WORK HUB — ระบบจัดการงานโรงเรียนสำหรับคณะครูและบุคลากร

เอกสารนี้จัดทำขึ้นสำหรับฝ่ายเทคโนโลยีสารสนเทศ (School IT Administrator) เพื่อแนะนำขั้นตอนการนำระบบ **School Work Hub** ขึ้นสู่สภาพแวดล้อม Production อย่างปลอดภัยและถูกต้อง 100%

---

## 1. สถาปัตยกรรมระบบโดยรวม (Architecture Overview)

```
[ Frontend: React 19 + PWA (Standalone Mode) ]
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
[ Supabase Edge Functions ]   [ Supabase PostgreSQL ]
  - auth-login (Bridge)         - Row Level Security (RLS)
  - manage-users (Admin API)    - Realtime WebSockets (Chat & Notif)
                                - Storage & Resource Links
```

* **Frontend**: Single Page Application (Vite + React 19 + TypeScript + Tailwind CSS v4 + PWA)
* **Backend Database**: Supabase PostgreSQL พร้อมระบบความปลอดภัย **Row Level Security (RLS)** และ Audit Logs
* **Security Bridge**: Supabase Edge Functions (Deno) สำหรับซ่อน Internal Email และจำกัดสิทธิ์ Admin

---

## 2. สิ่งที่ต้องเตรียม (Prerequisites)

1. บัญชี [Supabase](https://supabase.com) (สร้าง New Project เช่น `school-work-hub`)
2. ติดตั้ง [Supabase CLI](https://supabase.com/docs/guides/cli) บนเครื่องผู้ดูแลระบบ
3. บัญชีโฮสติ้งสำหรับ Frontend เช่น [Cloudflare Pages](https://pages.cloudflare.com/), [Vercel](https://vercel.com/), หรือเว็บเซิร์ฟเวอร์ Nginx ของโรงเรียน

---

## 3. ขั้นตอนการติดตั้งฐานข้อมูล (Database Migrations)

รันคำสั่ง SQL ผ่าน **Supabase Dashboard > SQL Editor** หรือใช้ **Supabase CLI** ตามลำดับไฟล์ต่อไปนี้:

```bash
# ลำดับการรัน Migration (ห้ามข้ามขั้นตอน)
1. supabase/migrations/20260903000001_school_work_hub_phase2.sql
2. supabase/migrations/20260903000002_tasks_and_workflow.sql
3. supabase/migrations/20260903000003_chat_and_notifications.sql
4. supabase/migrations/20260903000004_drive_and_exports.sql
5. supabase/seed.sql (ข้อมูลเริ่มต้นกลุ่มสาระฯ และห้องสื่อสาร)
```

> [!TIP]
> **หากใช้ Supabase CLI:**
> ```bash
> supabase link --project-ref <your-project-id>
> supabase db push
> ```

---

## 4. ขั้นตอนการ Deploy Supabase Edge Functions

ระบบมี Edge Functions จำนวน 2 ตัวที่ต้อง Deploy:
1. `auth-login`: เชื่อม Username เข้ากับระบบ Authenticate พร้อมซ่อนอีเมลภายใน
2. `manage-users`: จัดการสร้างครูใหม่, รีเซ็ตรหัสผ่าน, ระงับบัญชี และลบบัญชี

```bash
# 1. ล็อกอิน Supabase CLI
supabase login

# 2. Deploy Edge Functions
supabase functions deploy auth-login --project-ref <your-project-id>
supabase functions deploy manage-users --project-ref <your-project-id>

# 3. ตั้งค่า Secrets ให้ Edge Functions (จำเป็นสำหรับ manage-users)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> --project-ref <your-project-id>
```

---

## 5. การสร้างบัญชีผู้ดูแลระบบคนแรก (Initial Super Admin)

1. ไปที่ **Supabase Dashboard > Authentication > Users**
2. กด **Add User > Create User**
   * **Email**: `admin@school.local` (หรือ username ที่ต้องการตามด้วย `@school.local`)
   * **Password**: กำหนดรหัสผ่านเริ่มต้นที่ปลอดภัย
   * ติ๊ก **Auto Confirm User**
3. ไปที่ **Supabase Dashboard > SQL Editor** และรันคำสั่งยกระดับสิทธิ์เป็นผู้ดูแลระบบ (Admin):

```sql
UPDATE public.profiles
SET
  role = 'admin',
  name = 'ผู้ดูแลระบบโรงเรียน (Super Admin)',
  active = true
WHERE username = 'admin';
```

4. ทดสอบเข้าสู่ระบบผ่านหน้าเว็บด้วย:
   * **ชื่อผู้ใช้งาน (Username)**: `admin`
   * **รหัสผ่าน (Password)**: ตามที่ตั้งไว้ในข้อ 2

---

## 6. การตั้งค่า Environment Variables ฝั่ง Frontend

สร้างไฟล์ `.env.production` (หรือตั้งค่าใน Environment Variables ของ Cloudflare Pages / Vercel):

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

---

## 7. การ Build และ Deploy Frontend PWA

### คำสั่ง Build Bundle:
```bash
npm run build
```
ผลลัพธ์จะถูกบันทึกไว้ในโฟลเดอร์ `dist/` ซึ่งพร้อมสำหรับการนำขึ้น Web Server หรือ Static Host

### 7.1 ตัวเลือก A: Deploy บน Cloudflare Pages (แนะนำ - ฟรี & เร็วมากในไทย)
1. เชื่อมต่อ Git Repository กับ Cloudflare Pages
2. ตั้งค่าการ Build:
   * **Framework Preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
3. ในส่วน Environment Variables: ใส่ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
4. บันทึกและ Deploy ทันที

### 7.2 ตัวเลือก B: Deploy บน Nginx Web Server ภายในโรงเรียน
```nginx
server {
    listen 80;
    server_name workhub.school.ac.th;
    root /var/www/school-work-hub/dist;
    index index.html;

    # รองรับ React Router (SPA Fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # แคช PWA Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webmanifest)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 8. การทดสอบความปลอดภัย RLS (Automated Verification)

ก่อนเปิดให้ครูเข้าใช้งานจริง ให้รันสคริปต์ตรวจสอบความปลอดภัยใน **Supabase SQL Editor**:

```sql
-- รันไฟล์นี้เพื่อตรวจสอบ RLS ครบทั้ง 8 ตาราง
-- ระบบจะทดสอบและ Rollback อัตโนมัติโดยไม่ทิ้งข้อมูลขยะ
\i supabase/tests/test_full_system_rls.sql
```
ผลลัพธ์จะต้องขึ้นข้อความ `PASSED` ครบทั้ง 6 การทดสอบหลัก

---

## 9. การบำรุงรักษาและการสำรองข้อมูล (Maintenance & Backup)

1. **การสำรองข้อมูล (Backup):**
   * Supabase มีระบบ Daily Backup อัตโนมัติบน Cloud
   * สามารถสำรองข้อมูลแบบ Manual ผ่านคำสั่ง:
     ```bash
     supabase db dump -f school_backup_$(date +%Y%m%d).sql
     ```
2. **การตรวจสอบ Audit Trail:**
   * ตรวจสอบกิจกรรมทั้งหมดของผู้ใช้และแอดมินได้ตลอดเวลาที่หน้า **"ประวัติระบบ" (`/admin/logs`)**
   * สามารถกดปุ่ม **"ส่งออก CSV"** เพื่อเก็บเป็นหลักฐานรายงานราชการประจำเดือน/ภาคเรียนได้
