# تشغيل المشروع

لتشغيل المشروع ، اتبع هذا الدليل خطوة بخطوة:

## الخطوة 1: تثبيت البرامج الأساسية على الجهاز الجديد

قم بتحميل وتثبيت البرامج التالية:

### بايثون (Python)

قم بتحميل وتثبيت Python 3.10+ وتأكد من تفعيل خيار "Add Python to PATH" أثناء التثبيت.

https://www.python.org/downloads/

### نود (Node.js)

قم بتحميل وتثبيت Node.js (LTS).

https://nodejs.org/en/download

### قاعدة البيانات (MySQL Server)

قم بتثبيت MySQL Community Server ومعه برنامج MySQL Workbench لتسهيل إدارة الجداول.

https://dev.mysql.com/downloads/installer/

أثناء التثبيت، قم بوضع كلمة مرور للمستخدم root (المشروع مضبوط افتراضياً على كلمة مرور password واسم المستخدم root).

## الخطوة 2: نقل كود المشروع وإعداد قاعدة البيانات

قم بنسخ مجلد المشروع بالكامل (my_digital_clinic) إلى الجهاز الجديد.

افتح برنامج MySQL Workbench (أو أي أداة لإدارة قواعد البيانات) واتصل بالخادم.

قم بإنشاء قاعدة بيانات فارغة جديدة باسم المشروع:

```sql
CREATE DATABASE my_digital_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> NOTE
> 

> 
> 

> إذا كانت كلمة مرور MySQL على الجهاز الجديد مختلفة عن password، ستحتاج إلى تعديلها في ملف إعدادات الباكيند على الجهاز الجديد في المسار:
> 

> 
> 

> `backend/config/settings.py`
> 

> 
> 

> في السطر 101.
> 

## الخطوة 3: تشغيل القسم الخلفي (Backend)

افتح Terminal (أو PowerShell/CMD) وتوجه إلى مجلد backend:

```bash
cd path/to/my_digital_clinic/backend
```

### إنشاء بيئة افتراضية جديدة (Virtual Environment)

(حيث أن البيئة الافتراضية القديمة venv لا يمكن نقلها بين الأجهزة ويجب إعادة بنائها):

قم بحذف مجلد venv القديم إن وُجد.

ثم أنشئ بيئة جديدة بالأمر التالي:

```bash
python -m venv venv
```

### تفعيل البيئة الافتراضية

على Windows:

```bash
venv\Scripts\activate
```

على Mac / Linux:

```bash
source venv/bin/activate
```

### تثبيت المكتبات المطلوبة

```bash
pip install -r requirements.txt
```

### تهيئة جداول قاعدة البيانات (Migrations)

```bash
python manage.py migrate
```

### تشغيل سيرفر الباكيند

```bash
python manage.py runserver
```

سيعمل السيرفر الآن على الرابط http://127.0.0.1:8000/.

## الخطوة 4: تشغيل القسم الأمامي (Frontend)

المشروع مبرمج بذكاء بحيث يتعرف تلقائياً على اسم المضيف (Hostname) للباكيند عبر window.location.hostname، لذا لن تحتاج لتغيير عناوين IP يدوياً في الفرونتند.

افتح نافذة Terminal جديدة وتوجه إلى مجلد frontend:

```bash
cd path/to/my_digital_clinic/frontend
```

### تثبيت مكتبات الفرونتند (الـ node_modules)

```bash
npm install
```

### تشغيل سيرفر الفرونتند

```bash
npm run dev
```

سيظهر لك رابط تشغيل الواجهة (غالباً http://localhost:5173/).

لعمل حسابات يجب في البداية عمل حساب للادمن من كلال الايعاز 

`python manage.py createsuperuser`

ادخل الايميل ثم كلمة المرور 

**بعدها يجب عليك انشاء API SMTP ليتلقى المستخدمين رسائل التاكيد الخ..**

**يمكنك الحصول على انشاء مفتاح من خلال :**

https://myaccount.google.com/apppasswords 

يجب تفعيل المصادقة الثنائية قبل ذلك في ايميلك 

انشا مفتاح ثم توجه لخانة الـ **SMTP** عند الادمن وادخله
