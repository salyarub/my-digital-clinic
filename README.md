لتشغيل المشروع ، اتبع هذا الدليل خطوة بخطوة لتهيئة البيئة بالكامل وتشغيل المشروع بنجاح:
الخطوة 1: تثبيت البرامج الأساسية على الجهاز الجديد
قم بتحميل وتثبيت البرامج التالية:
بايثون (Python): قم بتحميل وتثبيت Python 3.10+ وتأكد من تفعيل خيار "Add Python to PATH" أثناء التثبيت.
https://www.python.org/downloads/
نود (Node.js): قم بتحميل وتثبيت Node.js (LTS).
https://nodejs.org/en/download
قاعدة البيانات (MySQL Server):
قم بتثبيت MySQL Community Server ومعه برنامج MySQL Workbench لتسهيل إدارة الجداول.
https://dev.mysql.com/downloads/installer/
أثناء التثبيت، قم بوضع كلمة مرور للمستخدم root (المشروع مضبوط افتراضياً على كلمة مرور password واسم المستخدم root).
الخطوة 2: نقل كود المشروع وإعداد قاعدة البيانات
قم بنسخ مجلد المشروع بالكامل (my_digital_clinic) إلى الجهاز الجديد.
افتح برنامج MySQL Workbench (أو أي أداة لإدارة قواعد البيانات) واتصل بالخادم.
قم بإنشاء قاعدة بيانات فارغة جديدة باسم المشروع:
sql
CREATE DATABASE my_digital_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
NOTE
إذا كانت كلمة مرور MySQL على الجهاز الجديد مختلفة عن password، ستحتاج إلى تعديلها في ملف إعدادات الباكيند على الجهاز الجديد في المسار: backend/config/settings.py في السطر 101.
الخطوة 3: تشغيل القسم الخلفي (Backend)
افتح Terminal (أو PowerShell/CMD) وتوجه إلى مجلد backend:
cmd
cd path/to/my_digital_clinic/backend
إنشاء بيئة افتراضية جديدة (Virtual Environment): (حيث أن البيئة الافتراضية القديمة venv لا يمكن نقلها بين الأجهزة ويجب إعادة بنائها):
قم بحذف مجلد venv القديم إن وُجد.
ثم أنشئ بيئة جديدة بالأمر التالي:
cmd
python -m venv venv
تفعيل البيئة الافتراضية:
على Windows:
cmd
venv\Scripts\activate
على Mac / Linux:
bash
source venv/bin/activate
تثبيت المكتبات المطلوبة:
cmd
pip install -r requirements.txt
تهيئة جداول قاعدة البيانات (Migrations):
cmd
python manage.py migrate
تشغيل سيرفر الباكيند:
cmd
python manage.py runserver
سيعمل السيرفر الآن على الرابط http://127.0.0.1:8000/.
الخطوة 4: تشغيل القسم الأمامي (Frontend)
المشروع مبرمج بذكاء بحيث يتعرف تلقائياً على اسم المضيف (Hostname) للباكيند عبر window.location.hostname، لذا لن تحتاج لتغيير عناوين IP يدوياً في الفرونتند.
افتح نافذة Terminal جديدة وتوجه إلى مجلد frontend:
cmd
cd path/to/my_digital_clinic/frontend
تثبيت مكتبات الفرونتند (الـ node_modules):
cmd
npm install
تشغيل سيرفر الفرونتند:
cmd
npm run dev
سيظهر لك رابط تشغيل الواجهة (غالباً http://localhost:5173/). 
