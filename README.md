# اسحاق‌زاده ډیلیوري

دا وېبپاڼه په GitHub Pages کې خپرېږي او معلومات یې د خپل شخصي Supabase پروژې په ډیټابېس کې خوندي کېږي. Cloudflare Worker او ChatGPT حساب ته اړتیا نه لري. شاګرد د جنس نوم، مقدار، د مشتری شمېره، ولایت، ادرس او بیه لیکي؛ د جنس عکس نه پورته کوي.

## اوسنی تنظیم

- GitHub Pages: `https://nk6341350-cloud.github.io/-ishaqzada-delivery/`
- Supabase پروژه: `ishaqzada-delivery`، د `Ishaqzada Delivery` سازمان کې
- د ډیټابېس جوړولو SQL اجرا شوی. `config.js` د همدې پروژې Project URL او عام Publishable key لري.
- د لومړي اډمین د جوړولو لپاره په Supabase SQL Editor کې دا امر اجرا کړئ: `select setup_code from delivery_private.settings where id=1;`. کوډ یوازې په خپل وسیله کې وساتئ او د وېبپاڼې د لومړي اډمین په فورم کې یې ولیکئ. خپل نوی، پټ څلور عددي PIN وټاکئ. دا کوډ یا PIN په GitHub کې مه خپروئ.

د Supabase **secret/service_role** key هېڅکله په `config.js` کې مه لیکئ. د پخواني Cloudflare ډیټابېس آرډرونه دلته پخپله نه راځي؛ که د هغوی انتقال پکار وي، جلا کاپي یې اړینه ده.

د Free پلان حدود او د کم فعالیت له امله د پروژې ځنډېدل ممکن دي. د ډیټابېس منظم backup واخلئ.
