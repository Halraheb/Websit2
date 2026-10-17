# قدرات الخويلدية

موقع اختبار القدرات (القسم الكمي) لمدرسة الخويلدية الثانوية، مع قاعدة بيانات PostgreSQL لحفظ **المستخدمين** و**درجات الطلاب**.

## المزايا
- تسجيل دخول وإنشاء حساب للطلاب (كلمات المرور مشفّرة bcrypt).
- بنك أسئلة كامل بوضعين: فردي (تُحفظ درجة الطالب تلقائياً عند نهاية الاختبار) وفرق.
- صفحة **درجاتي** للطالب: كل محاولاته، المتوسط، أعلى نسبة.
- **سجل الطلاب** (أول تبويب في لوحة المعلم): يضيف المدير/المعلم اسم الطالب وصفه ودرجته (من 100) ومستوى تقدمه (0–100% مع شريط تقدم) وملاحظات، مع التعديل والحذف والبحث والتصفية بالصف.
- **لوحة المعلم**: كل درجات الطلاب مع بحث وتصفية بالصف وتصدير CSV (يفتح في Excel)، وإدارة المستخدمين (إضافة، تغيير كلمة المرور، حذف).
- الصلاحيات: `student` طالب · `teacher` معلم · `admin` مدير النظام (وحده يضيف المعلمين).

## قاعدة البيانات
تُنشأ الجداول تلقائياً عند تشغيل الخادم (`db.js`):
- `users`: id, username, full_name, password_hash, role, class_name, created_at
- `results`: id, user_id, score, total, percent, level, created_at
- `students`: id, full_name, class_name, grade, progress, notes, updated_at

## النشر على Railway
1. ادخل [railway.com](https://railway.com) ← **New Project** ← **Deploy from GitHub repo** ← اختر `Websit2`.
2. داخل المشروع: **+ New** ← **Database** ← **PostgreSQL**.
3. افتح خدمة الموقع ← **Variables** وأضف:
   | المتغير | القيمة |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `JWT_SECRET` | نص عشوائي طويل |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | كلمة مرور المدير |
   | `NODE_ENV` | `production` |
4. **Settings** ← **Networking** ← **Generate Domain** للحصول على رابط الموقع.
5. ادخل بحساب المدير، ثم أضف المعلمين من «لوحة المعلم ← المستخدمون».

## التشغيل محلياً
```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/qudrat ADMIN_PASSWORD=admin123 JWT_SECRET=dev npm start
# http://localhost:3000
```

إعداد: الأستاذ حسن الراهب · مدير المدرسة: رمضان حيدر الرمضان
