# Ishaqzada Delivery — وروستۍ ساده نسخه

دا نسخه R2 او د عکسونو ذخیرې ته اړتیا نه لري. د جنس لپاره یوازې نوم ثبتېږي او د کاروونکو پروفایل عکس هم نه پورته کېږي. معلومات په Cloudflare D1 کې ساتل کېږي.

اډمین:
- موبایل: 0700426319
- PIN: 1111

Worker باید د `DB` binding له `ishaqzada-delivery` D1 database سره ولري. د Worker اصلي فایلونه `src/index.js` او `src/delivery-api.js` دي. Frontend په `public/` کې دی او `public/app.js` د `https://ishaqzada-delivery-api.nk6341350.workers.dev` API سره نښلول شوی.

مهم: دا پروژه R2، کارت یا PayPal نه غواړي. Cloudflare Workers/D1 د خپل وړیا پلان د حدودو تابع دي.
