# NOTURI — Website starter

## ১. এই প্যাকেজে কী আছে
- React + Vite ওয়েবসাইট
- Supabase Email/Password Auth
- বিদ্যমান `videos` টেবিলে ভিডিও metadata সংরক্ষণ
- Supabase Storage-এ ভিডিও ফাইল আপলোড
- ভিডিও রিপোর্ট `video_reports` টেবিলে জমা
- Admin `is_admin()` RPC দিয়ে যাচাই
- Cloudflare Pages build configuration

## ২. গুরুত্বপূর্ণ: ডাটাবেজ অক্ষত
এই কোড কোনো `DROP`, `ALTER`, `TRUNCATE` বা schema migration চালায় না। বিদ্যমান `videos` এবং `video_reports` টেবিলের কলাম পরিবর্তন করে না। আপনার আগের RLS policies, trigger ও function-ও পরিবর্তন করে না।

## ৩. GitHub-এ আপলোড
ZIP Extract করে সব ফাইল আপনার `noturi` GitHub repository-র root-এ upload করুন।

## ৪. Environment variables
Cloudflare Pages → Settings → Variables and Secrets-এ যোগ করুন:
- `VITE_SUPABASE_URL` = Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase Publishable key অথবা legacy anon key
- `VITE_SUPABASE_VIDEO_BUCKET` = আপনার Storage bucket-এর সঠিক নাম (ডিফল্ট `videos`)

কোডে কখনো `service_role` বা Supabase Secret key দেবেন না।

## ৫. Cloudflare Pages
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

## ৬. Supabase-এ আগে যাচাই করুন
- Authentication → Providers → Email চালু
- Storage-এ `videos` bucket আছে কি না যাচাই করুন; না থাকলে আপনার নির্ধারিত bucket-এর নাম environment variable-এ দিন।
- Storage bucket-এর upload/read policy নিরাপদভাবে সেট করুন।
- `videos` টেবিলের RLS যেন authenticated user-কে নিজের ভিডিও insert করতে দেয় এবং public/member-কে শুধু published video পড়তে দেয়।
- `video_reports` insert policy যেন কেবল authenticated user-কে নিজের `reporter_id` দিয়ে রিপোর্ট করতে দেয়।
- `is_admin()` RPC যেন শুধু অনুমোদিত অ্যাডমিনের ক্ষেত্রে true দেয়।

## ৭. এই সংস্করণের সীমা / পরের সংযোগ
আপনার `profiles`, `memberships`, `membership_settings`, `payments` টেবিলের প্রকৃত কলাম সংক্রান্ত schema এই প্যাকেজ তৈরির সময় পাওয়া যায়নি। তাই এগুলোতে কোনো অনুমানভিত্তিক INSERT/UPDATE নেই এবং কোনো payment gateway ভুয়া ভাবে চালু দেখানো হয়নি। Free/Premium access enforcement, join approval, payment verification এবং admin membership management যুক্ত করার আগে Supabase-এর ওই টেবিলগুলোর column list/policies প্রয়োজন।

## ৮. নোট
ভিডিও আপলোডের পর `is_published=false` থাকে। অ্যাডমিন Dashboard থেকে publish করলে public video feed-এ দেখা যায়। `is_admin()` RPC-এর বর্তমান function signature যদি parameter নেয়, `src/App.jsx`-এ call অনুযায়ী সামঞ্জস্য করতে হবে।
