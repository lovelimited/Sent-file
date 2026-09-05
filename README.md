# 🎓 SCHOOL WORK HUB — ระบบจัดการงานโรงเรียน

> **ระบบบริหารจัดการภาระงาน สื่อสารภายใน และคลังทรัพยากรโรงเรียน สำหรับคณะครูและบุคลากร**  
> พัฒนาด้วยเทคโนโลยีสมัยใหม่ **React 19 + TypeScript + Tailwind CSS v4 + Supabase + PWA**

---

## 🌟 จุดเด่นของระบบ (Key Features)

* **🔐 ระบบล็อกอินด้วยชื่อผู้ใช้ (Username-Based Authentication)**: ครูล็อกอินด้วย Username สั้นๆ (เช่น `teacher01`) โดยระบบจะ Bridge เข้ากับอีเมลภายใน `username@school.local` ผ่าน Edge Function แบบ **Zero-Trust** โดยที่ครูไม่ต้องจำอีเมล
* **👥 การบริหารจัดการครูและกลุ่มสาระฯ (User & Group Administration)**: แอดมินสามารถเพิ่มคุณครูใหม่, รีเซ็ตรหัสผ่าน, ระงับ/เปิดสิทธิ์, และจัดสรรตาม 10 กลุ่มสาระการเรียนรู้
* **📋 ระบบจัดการภาระงานและตรวจรับงาน (Task Management & Review Workflow)**: มอบหมายงานรายบุคคล รายกลุ่มสาระฯ หรือครูทุกคน ครูส่งงานพร้อมแนบลิงก์ Google Drive / Canva และแอดมินตรวจรับงานพร้อมให้ข้อคิดเห็น
* **💬 ห้องสื่อสารภายในโรงเรียน (Realtime School Chat)**: ห้องสื่อสารกลางโรงเรียน, ห้องประกาศทางการฝ่ายบริหาร, และห้องเฉพาะกลุ่มสาระฯ พร้อม Realtime Websocket Sync
* **🔔 กระดิ่งแจ้งเตือนอัตโนมัติ (Live Notifications)**: แจ้งเตือนครูทันทีเมื่องานได้รับการมอบหมาย หรือเมื่อผลงานได้รับการตรวจรับ
* **📁 คลัง Google Drive & แม่แบบเอกสาร (School Drive Hub)**: ศูนย์รวมโฟลเดอร์ Drive ประจำกลุ่มสาระฯ และแม่แบบเอกสารสำคัญ (แผนการสอน, ปพ.5, วิจัยในชั้นเรียน, ตราสัญลักษณ์)
* **📊 รายงานและการส่งออกข้อมูล (Excel-Ready CSV Export)**: ส่งออกรายงานความคืบหน้าการส่งงาน รายชื่อครู และบันทึกกิจกรรมระบบเป็นไฟล์ UTF-8 BOM CSV (เปิดใน Microsoft Excel ภาษาไทยได้ทันที)
* **📱 Progressive Web App (PWA) & Offline Sync**: ติดตั้งแอปลงบนสมาร์ตโฟน (Android/iOS) หรือคอมพิวเตอร์ใน 1 คลิก พร้อมระบบตรวจจับออฟไลน์และแคชข้อมูลอัตโนมัติ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| **Core Framework** | React 19, TypeScript 5.9+, Vite 8+ |
| **Styling & UI** | Tailwind CSS v4 (Pure CSS Configuration), Lucide Icons |
| **Routing & Code-Splitting** | React Router v7, `React.lazy` & `Suspense` |
| **Backend & Database** | Supabase PostgreSQL, Row Level Security (RLS) |
| **Serverless Logic** | Supabase Edge Functions (Deno / TypeScript) |
| **Realtime Engine** | Supabase Realtime Channels (WebSockets) |
| **PWA & Offline** | `vite-plugin-pwa`, Workbox Service Worker, Web Manifest |
| **Code Quality** | Oxlint (0 errors, 0 warnings), TypeScript Strict Mode |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
d:/antigravity/project_3/
├── public/                     # Static assets, PWA icons (192x192, 512x512)
├── src/
│   ├── components/
│   │   ├── auth/               # ProtectedRoute, RoleGuards
│   │   ├── layout/             # Navbar (with Notifications), Layout, Shell
│   │   ├── notifications/      # NotificationBell & Dropdown
│   │   └── pwa/                # OfflineBanner, PWAInstallBanner
│   ├── contexts/               # AuthContext & Session management
│   ├── hooks/                  # useAuth, useNetworkStatus, usePWAInstall
│   ├── pages/
│   │   ├── admin/              # UserManagement, GroupManagement, ActivityLogs, AdminTasks
│   │   ├── chat/               # ChatPage (General, Announcements, Group chats)
│   │   ├── drive/              # DriveHubPage (Folder & Template repository)
│   │   ├── tasks/              # TeacherTasksPage (Submission & Feedback)
│   │   ├── HomePage.tsx        # Executive Analytics Dashboard & Launchpad
│   │   ├── LoginPage.tsx       # Thai Login Portal
│   │   └── NotFoundPage.tsx    # 404 handler
│   ├── services/               # Supabase API, userService, taskService, chatService, driveService
│   ├── types/                  # database.types.ts, auth.types.ts, index.ts
│   └── utils/                  # exportUtils (UTF-8 BOM CSV Generator)
├── supabase/
│   ├── functions/
│   │   ├── auth-login/         # Username-to-email bridge Edge Function
│   │   └── manage-users/       # Privileged Admin user management Edge Function
│   ├── migrations/             # 4 Idempotent migrations with RLS policies
│   ├── tests/                  # test_full_system_rls.sql (Automated RLS test suite)
│   └── seed.sql                # Seed data for Thai learning groups & templates
├── DEPLOYMENT.md               # คู่มือการติดตั้งระบบสำหรับฝ่ายไอทีโรงเรียน
└── vite.config.ts              # Vite & PWA configuration
```

---

## 🚀 การเริ่มต้นใช้งานในสภาพแวดล้อม Development

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local`:
```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

### 3. ตรวจสอบคุณภาพโค้ด (Typecheck & Lint)
```bash
# ตรวจสอบ TypeScript Types
npm run typecheck

# ตรวจสอบ Code Quality ด้วย Oxlint
npm run lint
```

### 4. รันระบบสำหรับ Development
```bash
npm run dev
```

### 5. Build สำหรับ Production
```bash
npm run build
```

---

## 🛡️ สถาปัตยกรรมความปลอดภัย (Security & RLS Model)

1. **Zero Raw Passwords**: ระบบไม่เคยบันทึกหรือส่งรหัสผ่าน Plaintext ในตารางแอปพลิเคชัน
2. **Hidden Internal Email**: ตาราง `auth_identities` ถูกล็อกสิทธิ์ผ่าน RLS ห้าม Client ทำคำสั่ง `SELECT` โดยเด็ดขาด ผู้ใช้จะไม่เห็นหรือมีปฏิสัมพันธ์กับอีเมลภายใน
3. **Privileged Edge Functions**: การสร้างคุณครู, รีเซ็ตรหัสผ่าน, ระงับบัญชี และลบบัญชี ทำผ่าน Supabase Edge Function ด้วย `SUPABASE_SERVICE_ROLE_KEY` พร้อมตรวจสิทธิ์ `role = 'admin'` เท่านั้น
4. **Isolated Task Workflow**: คุณครูไม่สามารถแอบอนุมัติงานตนเองได้ และไม่สามารถดูงานที่มอบหมายให้ครูท่านอื่นที่ไม่เกี่ยวข้อง
5. **Department Privacy**: ห้องแชทกลุ่มสาระฯ และทรัพยากรเฉพาะกลุ่มถูกป้องกันให้เข้าถึงได้เฉพาะครูในกลุ่มสาระฯ นั้นและผู้ดูแลระบบ
6. **Immutable Audit Trail**: บันทึกกิจกรรมสำคัญทั้งหมดลงในตาราง `activity_logs` (เข้าสู่ระบบ, สร้างครู, รีเซ็ตรหัสผ่าน, มอบหมายงาน, ส่งงาน, ตรวจรับงาน, ส่งข้อความแชท)

---

## 📖 คู่มือการติดตั้งขึ้นใช้งานจริง (Production Deployment)

ดูรายละเอียดขั้นตอนการติดตั้งระบบฐานข้อมูล, การ Deploy Edge Functions, การสร้างผู้ดูแลระบบคนแรก และการ Deploy Frontend บน Cloudflare Pages / Vercel ได้ในเอกสาร:
👉 [คู่มือการติดตั้งระบบ (DEPLOYMENT.md)](file:///d:/antigravity/project_3/DEPLOYMENT.md)

---

## 📄 ลิขสิทธิ์และการพัฒนา

พัฒนาขึ้นสำหรับระบบการบริหารจัดการงานของโรงเรียนในประเทศไทย รองรับคณะครูและบุคลากรทางการศึกษา พร้อมขยายขีดความสามารถได้ในอนาคต
