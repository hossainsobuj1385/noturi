import React,{useEffect,useMemo,useState} from 'react';
import {supabase,supabaseReady,VIDEO_BUCKET} from './supabase';
import {
 Play,Search,LogIn,LogOut,Upload,Shield,Home,Users,
 Video,Flag,Settings,Lock,Menu,X
} from 'lucide-react';

export default function App(){

 const initialAdminRequest=
  new URLSearchParams(window.location.search).get('tab')==='admin';

 const [session,setSession]=useState(undefined);
 const [profile,setProfile]=useState(null);
 const [isAdmin,setIsAdmin]=useState(false);

 const [videos,setVideos]=useState([]);
 const [tab,setTab]=useState(initialAdminRequest?'admin':'home');
 const [adminRequested,setAdminRequested]=useState(initialAdminRequest);
 const [query,setQuery]=useState('');

 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState('');
 const [authMode,setAuthMode]=useState('login');

 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [fullName,setFullName]=useState('');

 const [title,setTitle]=useState('');
 const [description,setDescription]=useState('');
 const [file,setFile]=useState(null);
 const [busy,setBusy]=useState(false);

 const [reportVideo,setReportVideo]=useState(null);
 const [reason,setReason]=useState('আপত্তিকর কনটেন্ট');
 const [details,setDetails]=useState('');
 const [mobileOpen,setMobileOpen]=useState(false);

 // URL management
 useEffect(()=>{
  const url=new URL(window.location.href);

  if(adminRequested){
   url.searchParams.set('tab','admin');
  }else{
   url.searchParams.delete('tab');
  }

  window.history.replaceState({},'',url);
 },[tab,adminRequested]);

 // Supabase session and password recovery
 useEffect(()=>{
  if(!supabaseReady){
   setLoading(false);
   return;
  }

  let mounted=true;

  supabase.auth.getSession().then(({data,error})=>{
   if(!mounted)return;

   if(error)setNotice(error.message);
   setSession(data?.session||null);
  });

  const {data:{subscription}}=
   supabase.auth.onAuthStateChange((event,newSession)=>{

    if(!mounted)return;

    setSession(newSession);

    if(event==='PASSWORD_RECOVERY'){
     setTab('auth');
     setAuthMode('reset');
     setPassword('');
     setConfirmPassword('');
     setNotice('নতুন পাসওয়ার্ড তৈরি করুন।');
    }

   });

  return ()=>{
   mounted=false;
   subscription.unsubscribe();
  };
 },[]);

 // Load account and check Admin role
 useEffect(()=>{
  if(!supabaseReady||session===undefined)return;

  let cancelled=false;

  async function loadAccount(){

   setLoading(true);

   if(session?.user){

    const {data:profileData,error:profileError}=await supabase
     .from('profiles')
     .select('*')
     .eq('id',session.user.id)
     .maybeSingle();

    let adminStatus=profileData?.role==='admin';

    const {data:adminData,error:adminError}=
     await supabase.rpc('is_admin');

    if(!adminError&&adminData===true){
     adminStatus=true;
    }

    if(cancelled)return;

    setProfile(profileData||session.user.user_metadata||null);
    setIsAdmin(adminStatus);

    if(adminRequested&&adminStatus){
     setTab('admin');
    }

    if(adminRequested&&!adminStatus){
     setNotice(
      profileError
       ?'প্রোফাইল যাচাই করা যায়নি: '+profileError.message
       :'এই অ্যাকাউন্টটি Admin নয়। Admin ইমেইল দিয়ে লগইন করুন।'
     );
    }

   }else{
    setProfile(null);
    setIsAdmin(false);
   }

   await loadVideos();

   if(!cancelled)setLoading(false);
  }

  loadAccount();

  return ()=>{cancelled=true};
 },[session,adminRequested]);

 // Load published videos
 async function loadVideos(){

  if(!supabaseReady)return;

  const {data,error}=await supabase
   .from('videos')
   .select('id,title,description,storage_path,is_published,uploaded_by,created_at')
   .eq('is_published',true)
   .order('created_at',{ascending:false});

  if(error){
   setNotice('ভিডিও লোড হয়নি: '+error.message);
  }else{
   setVideos(data||[]);
  }
 }

 // Login and Signup
 async function authSubmit(e){

  e.preventDefault();

  setBusy(true);
  setNotice('');

  try{

   let result;

   if(authMode==='signup'){

    result=await supabase.auth.signUp({
     email:email.trim(),
     password,
     options:{
      data:{full_name:fullName}
     }
    });

   }else{

    result=await supabase.auth.signInWithPassword({
     email:email.trim(),
     password
    });

   }

   setBusy(false);

   if(result.error){
    setNotice('অ্যাকাউন্ট সমস্যা: '+result.error.message);
    return;
   }

   if(authMode==='signup'){
    setNotice('অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাই করুন।');
   }else{
    setNotice('লগইন সফল হয়েছে। অ্যাকাউন্ট যাচাই হচ্ছে...');
    setAdminRequested(true);
    setTab('admin');
   }

  }catch(error){
   setBusy(false);
   setNotice('সমস্যা হয়েছে: '+error.message);
  }
 }

 // Send password reset email
 async function sendResetEmail(e){

  e.preventDefault();

  if(!email.trim()){
   setNotice('আপনার ইমেইল ঠিকানা লিখুন।');
   return;
  }

  setBusy(true);
  setNotice('');

  try{

   const {error}=await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
     redirectTo:window.location.origin
    }
   );

   setBusy(false);

   if(error){
    setNotice('রিসেট ইমেইল পাঠানো যায়নি: '+error.message);
   }else{
    setNotice('পাসওয়ার্ড পরিবর্তনের লিংক আপনার ইমেইলে পাঠানো হয়েছে। ইনবক্স ও Spam ফোল্ডার দেখুন।');
   }

  }catch(error){
   setBusy(false);
   setNotice('সমস্যা হয়েছে: '+error.message);
  }
 }

 // Update new password
 async function updatePassword(e){

  e.preventDefault();

  if(password.length<6){
   setNotice('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
   return;
  }

  if(password!==confirmPassword){
   setNotice('দুটি পাসওয়ার্ড এক নয়। আবার লিখুন।');
   return;
  }

  setBusy(true);
  setNotice('');

  try{

   const {error}=await supabase.auth.updateUser({
    password:password
   });

   setBusy(false);

   if(error){
    setNotice('পাসওয়ার্ড পরিবর্তন হয়নি: '+error.message);
   }else{
    setPassword('');
    setConfirmPassword('');
    setAuthMode('login');
    setNotice('আপনার নতুন পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন লগইন করুন।');
   }

  }catch(error){
   setBusy(false);
   setNotice('সমস্যা হয়েছে: '+error.message);
  }
 }

 // Logout
 async function logout(){

  const {error}=await supabase.auth.signOut();

  if(error){
   setNotice('লগআউট হয়নি: '+error.message);
  }else{
   setSession(null);
   setIsAdmin(false);
   setProfile(null);
   setNotice('লগআউট সফল হয়েছে।');
  }
 }

 // Video upload
 async function uploadVideo(e){

  e.preventDefault();

  if(!session?.user){
   setNotice('ভিডিও আপলোড করতে আগে লগইন করুন।');
   return;
  }

  if(!file||!title.trim()){
   setNotice('ভিডিও ফাইল ও শিরোনাম দিন।');
   return;
  }

  setBusy(true);
  setNotice('');

  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${session.user.id}/${Date.now()}-${safeName}`;

  const up=await supabase.storage
   .from(VIDEO_BUCKET)
   .upload(path,file,{upsert:false});

  if(up.error){
   setBusy(false);
   setNotice('আপলোড ব্যর্থ: '+up.error.message);
   return;
  }

  const ins=await supabase
   .from('videos')
   .insert({
    title:title.trim(),
    description,
    storage_path:path,
    uploaded_by:session.user.id,
    is_published:false
   });

  setBusy(false);

  if(ins.error){
   setNotice('ভিডিও Storage-এ গেছে, কিন্তু Database-এ যোগ হয়নি: '+ins.error.message);
   return;
  }

  setTitle('');
  setDescription('');
  setFile(null);

  setNotice('ভিডিও জমা হয়েছে। অ্যাডমিন প্রকাশ করলে দেখা যাবে।');
  setTab('myvideos');
 }

 // Video report
 async function submitReport(e){

  e.preventDefault();

  if(!reportVideo||!session?.user)return;

  const {error}=await supabase
   .from('video_reports')
   .insert({
    video_id:reportVideo.id,
    reporter_id:session.user.id,
    reason,
    details,
    status:'pending'
   });

  setNotice(
   error
    ?'রিপোর্ট পাঠানো যায়নি: '+error.message
    :'রিপোর্ট পাঠানো হয়েছে।'
  );

  setReportVideo(null);
  setDetails('');
 }

 // Admin publish/unpublish
 async function adminPublish(video,published){

  if(!isAdmin){
   setNotice('শুধু Admin ভিডিও প্রকাশ করতে পারবেন।');
   return;
  }

  const {error}=await supabase
   .from('videos')
   .update({is_published:published})
   .eq('id',video.id);

  if(error){
   setNotice('ভিডিও আপডেট হয়নি: '+error.message);
  }else{
   setNotice(published?'ভিডিও প্রকাশ করা হয়েছে।':'ভিডিও আনপাবলিশ করা হয়েছে।');
  }

  await loadVideos();
 }

 // Navigation
 const nav=[
  ['home','হোম',Home],
  ['videos','ভিডিও গ্রুপ',Video],
  ['upload','ভিডিও আপলোড',Upload],
  ['myvideos','আমার ভিডিও',Users],
  ['membership','মেম্বারশিপ',Shield],
  ...(isAdmin?[
   ['admin','অ্যাডমিন ড্যাশবোর্ড',Settings],
   ['reports','রিপোর্ট',Flag]
  ]:[])
 ];

 const filtered=useMemo(()=>{
  return videos.filter(v=>
   (v.title+' '+(v.description||''))
    .toLowerCase()
    .includes(query.toLowerCase())
  );
 },[videos,query]);

 function openAdmin(){
  setAdminRequested(true);
  setTab('admin');
  setMobileOpen(false);
 }

 function openPage(page){
  if(page==='admin'){
   openAdmin();
  }else{
   setAdminRequested(false);
   setTab(page);
   setMobileOpen(false);
  }
 }

 function videoUrl(v){
  const {data}=supabase.storage
   .from(VIDEO_BUCKET)
   .getPublicUrl(v.storage_path);
  return data.publicUrl;
 }

 if(!supabaseReady){
  return <div className="setup">
   <div className="brand-mark"><Play/></div>
   <h1>NOTURI</h1>
   <h2>Supabase সংযোগ সেটআপ করুন</h2>
   <p>প্রজেক্টের .env ফাইলে Supabase Project URL এবং Publishable/anon key বসিয়ে আবার Deploy করুন।</p>
   <pre>VITE_SUPABASE_URL=...{"\n"}VITE_SUPABASE_ANON_KEY=...</pre>
   <small>কখনো service_role বা Secret key ব্যবহার করবেন না।</small>
  </div>;
 }

 if(loading){
  return <div className="setup">
   <div className="brand-mark"><Play/></div>
   <h2>NOTURI লোড হচ্ছে...</h2>
  </div>;
 }

 return <div className="app">

  {/* Sidebar */}
  <aside className={`sidebar ${mobileOpen?'open':''}`}>

   <div className="brand">
    <span className="brand-mark"><Play size={19}/></span>
    <div><b>NOTURI</b><small>Watch · Share · Enjoy</small></div>
    <button className="mobile-close" onClick={()=>setMobileOpen(false)}><X/></button>
   </div>

   <nav>
    {nav.map(([id,label,Icon])=>(
     <button key={id} className={tab===id?'active':''} onClick={()=>openPage(id)}>
      <Icon size={18}/>{label}
     </button>
    ))}
   </nav>

   <div className="sidebar-bottom">
    <div className="join-box">
     <Lock size={18}/>
     <b>একসাথে এগিয়ে চলি</b>
     <span>ভালো ভিডিও • ভালো কমিউনিটি</span>
    </div>

    {session?
     <button onClick={logout}><LogOut size={17}/> লগআউট</button>
     :
     <button onClick={()=>{setTab('auth');setAuthMode('login')}}><LogIn size={17}/> লগইন</button>
    }
   </div>
  </aside>

  {/* Main */}
  <main className="main">

   <header className="topbar">
    <button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu/></button>

    <div className="search">
     <Search size={18}/>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ভিডিও বা বিষয় খুঁজুন..."/>
    </div>

    <div className="top-actions">
     {session?
      <span className="user-pill">{profile?.full_name||session.user.email}</span>
      :
      <button className="primary small" onClick={()=>{setTab('auth');setAuthMode('login')}}>Login / Sign Up</button>
     }
    </div>
   </header>

   {notice&&
    <div className="notice" onClick={()=>setNotice('')} role="button">
     {notice}<button>×</button>
    </div>
   }

   {/* Home */}
   {tab==='home'&&<>
    <section className="hero">
     <div>
      <span className="eyebrow">VIDEO COMMUNITY PLATFORM</span>
      <h1>Welcome to <em>NOTURI</em></h1>
      <p>ভালো ভিডিও • ভালো মানুষ • ভালো কমিউনিটি</p>
      <button className="light-btn" onClick={()=>openPage(session?'videos':'auth')}>
       {session?'ভিডিও দেখুন':'কমিউনিটিতে যোগ দিন'}<Play size={16}/>
      </button>
     </div>
     <div className="hero-orb"><Play size={58}/></div>
    </section>

    <section className="section-head">
     <div><h2>ভিডিও গ্রুপ</h2><p>কমিউনিটির প্রকাশিত ভিডিওগুলো দেখুন</p></div>
     <button className="text-btn" onClick={()=>openPage('videos')}>সব ভিডিও দেখুন →</button>
    </section>

    <VideoGrid items={filtered.slice(0,6)} url={videoUrl} onReport={setReportVideo} session={session}/>
   </>}

   {/* Videos */}
   {tab==='videos'&&<>
    <Section title="ভিডিও গ্রুপ" sub="কমিউনিটির সব প্রকাশিত ভিডিও"/>
    <VideoGrid items={filtered} url={videoUrl} onReport={setReportVideo} session={session}/>
   </>}

   {/* Authentication */}
   {tab==='auth'&&<div className="auth-card">

    <div className="brand-mark"><Play/></div>

    <h2>
     {authMode==='signup'?'NOTURI-তে যোগ দিন':
      authMode==='forgot'?'পাসওয়ার্ড ভুলে গেছেন?':
      authMode==='reset'?'নতুন পাসওয়ার্ড তৈরি করুন':
      'আবার স্বাগতম'}
    </h2>

    <p>
     {authMode==='forgot'
      ?'আপনার ইমেইলে পাসওয়ার্ড পরিবর্তনের লিংক পাঠানো হবে।'
      :authMode==='reset'
       ?'আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন।'
       :'আপনার অ্যাকাউন্টে প্রবেশ করুন'}
    </p>

    {authMode==='forgot'?

     <form onSubmit={sendResetEmail}>
      <input
       type="email"
       required
       placeholder="আপনার অ্যাকাউন্টের ইমেইল"
       value={email}
       onChange={e=>setEmail(e.target.value)}
      />
      <button className="primary" disabled={busy}>
       {busy?'পাঠানো হচ্ছে...':'Reset Password লিংক পাঠান'}
      </button>
     </form>

     :authMode==='reset'?

     <form onSubmit={updatePassword}>
      <input
       type="password"
       required
       minLength="6"
       placeholder="নতুন পাসওয়ার্ড"
       value={password}
       onChange={e=>setPassword(e.target.value)}
      />
      <input
       type="password"
       required
       minLength="6"
       placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
       value={confirmPassword}
       onChange={e=>setConfirmPassword(e.target.value)}
      />
      <button className="primary" disabled={busy}>
       {busy?'পরিবর্তন হচ্ছে...':'নতুন পাসওয়ার্ড সংরক্ষণ করুন'}
      </button>
     </form>

     :

     <form onSubmit={authSubmit}>
      {authMode==='signup'&&
       <input required placeholder="আপনার নাম" value={fullName} onChange={e=>setFullName(e.target.value)}/>
      }

      <input
       type="email"
       required
       placeholder="ইমেইল"
       value={email}
       onChange={e=>setEmail(e.target.value)}
      />

      <input
       type="password"
       required
       minLength="6"
       placeholder="পাসওয়ার্ড"
       value={password}
       onChange={e=>setPassword(e.target.value)}
      />

      <button className="primary" disabled={busy}>
       {busy?'অপেক্ষা করুন...':authMode==='login'?'লগইন':'অ্যাকাউন্ট তৈরি করুন'}
      </button>
     </form>
    }

    {authMode==='login'&&
     <button className="text-btn" onClick={()=>{setAuthMode('forgot');setNotice('')}}>
      পাসওয়ার্ড ভুলে গেছেন?
     </button>
    }

    {(authMode==='login'||authMode==='signup')&&
     <button className="text-btn" onClick={()=>{
      setAuthMode(authMode==='login'?'signup':'login');
      setNotice('');
     }}>
      {authMode==='login'?'নতুন অ্যাকাউন্ট তৈরি করুন':'আগে থেকেই অ্যাকাউন্ট আছে? লগইন'}
     </button>
    }

    {(authMode==='forgot'||authMode==='reset')&&
     <button className="text-btn" onClick={()=>{
      setAuthMode('login');
      setPassword('');
      setConfirmPassword('');
      setNotice('');
     }}>
      লগইন পেজে ফিরে যান
     </button>
    }

   </div>}

   {/* Upload */}
   {tab==='upload'&&<>
    <Section title="ভিডিও আপলোড" sub="আপনার ভিডিও কমিউনিটির সঙ্গে শেয়ার করুন"/>

    {session?
     <form className="panel form-panel" onSubmit={uploadVideo}>
      <label>ভিডিওর শিরোনাম
       <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="ভিডিওর নাম লিখুন"/>
      </label>

      <label>বিবরণ
       <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="ভিডিও সম্পর্কে লিখুন"/>
      </label>

      <label className="file-drop">
       <Upload/>
       <b>ভিডিও ফাইল নির্বাচন করুন</b>
       <span>{file?file.name:'MP4, WebM ইত্যাদি'}</span>
       <input type="file" accept="video/*" required onChange={e=>setFile(e.target.files?.[0]||null)}/>
      </label>

      <button className="primary" disabled={busy}>{busy?'আপলোড হচ্ছে...':'ভিডিও জমা দিন'}</button>
      <small>জমা দেওয়া ভিডিও অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে।</small>
     </form>
     :
     <LoginPrompt onClick={()=>setTab('auth')}/>
    }
   </>}

   {/* My Videos */}
   {tab==='myvideos'&&<>
    <Section title="আমার ভিডিও" sub="আপনার আপলোড করা ভিডিও"/>

    {session?
     <div className="empty">
      নিজের ভিডিও দেখতে নিচের বাটনে চাপ দিন।
      <button className="text-btn" onClick={async()=>{
       const {data,error}=await supabase.from('videos').select('*').eq('uploaded_by',session.user.id).order('created_at',{ascending:false});
       setNotice(error?'ভিডিও লোড হয়নি: '+error.message:`${data?.length||0}টি ভিডিও পাওয়া গেছে।`);
      }}>আমার ভিডিও রিফ্রেশ</button>
     </div>
     :
     <LoginPrompt onClick={()=>setTab('auth')}/>
    }
   </>}

   {/* Membership */}
   {tab==='membership'&&<>
    <Section title="Membership" sub="Free এবং Premium সদস্যপদ"/>

    <div className="plans">
     <div className="plan">
      <span>FREE</span>
      <h2>ফ্রি মেম্বার</h2>
      <p>কমিউনিটিতে যোগ দিন এবং ফ্রি ভিডিও দেখুন।</p>
      <button className="outline" onClick={()=>openPage(session?'videos':'auth')}>শুরু করুন</button>
     </div>

     <div className="plan featured">
      <span>PREMIUM</span>
      <h2>প্রিমিয়াম মেম্বার</h2>
      <p>প্রিমিয়াম ভিডিও ও বিশেষ সুবিধা।</p>
      <button className="primary" onClick={()=>setNotice('প্রিমিয়াম মূল্য অ্যাডমিন Dashboard থেকে নির্ধারণ করা হবে।')}>বিস্তারিত</button>
     </div>
    </div>

    <p className="muted">মূল্য ও পেমেন্ট চালুর আগে বিদ্যমান Database টেবিলের প্রকৃত কলাম ম্যাপ করতে হবে।</p>
   </>}

   {/* Admin Dashboard */}
   {tab==='admin'&&<>
    <Section title="Admin Dashboard" sub="ভিডিও মডারেশন ও অনুমোদন"/>

    {!session||!isAdmin?
     <div className="auth-card admin-login-card">
      <div className="brand-mark"><Shield/></div>
      <h2>Admin Login</h2>
      <p>Admin ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।</p>

      <form onSubmit={authSubmit}>
       <input type="email" required placeholder="Admin ইমেইল" value={email} onChange={e=>setEmail(e.target.value)}/>
       <input type="password" required minLength="6" placeholder="পাসওয়ার্ড" value={password} onChange={e=>setPassword(e.target.value)}/>
       <button className="primary" disabled={busy}>{busy?'লগইন হচ্ছে...':'Admin হিসেবে লগইন করুন'}</button>
      </form>

      <button className="text-btn" onClick={()=>{setAuthMode('forgot');setTab('auth')}}>পাসওয়ার্ড ভুলে গেছেন?</button>

      {session&&
       <button className="text-btn" onClick={logout}>অন্য অ্যাকাউন্ট দিয়ে লগইন করতে লগআউট করুন</button>
      }

      {!session&&
       <button className="text-btn" onClick={()=>setTab('auth')}>সাধারণ সদস্য লগইন</button>
      }
     </div>
     :
     <div className="panel">
      <div className="admin-heading">
       <h3>ভিডিও অনুমোদন</h3>
       <span className="status">Admin</span>
      </div>
      <AdminVideos onPublish={adminPublish}/>
     </div>
    }
   </>}

   {/* Reports */}
   {tab==='reports'&&<>
    <Section title="ভিডিও রিপোর্ট" sub="সদস্যদের রিপোর্ট পর্যালোচনা"/>
    {isAdmin?<Reports/>:<div className="empty">শুধু Admin দেখতে পারবেন।</div>}
   </>}

  </main>

  <footer>
   © 2026 NOTURI. All rights reserved.
   <span>Made with ♥ for our community</span>
  </footer>

  {/* Report modal */}
  {reportVideo&&
   <div className="modal-backdrop">
    <form className="modal" onSubmit={submitReport}>
     <button type="button" className="modal-x" onClick={()=>setReportVideo(null)}>×</button>
     <h2>ভিডিও রিপোর্ট করুন</h2>
     <p>{reportVideo.title}</p>

     <select value={reason} onChange={e=>setReason(e.target.value)}>
      {['আপত্তিকর কনটেন্ট','সহিংসতা / ক্ষতিকর কিছু','ভুল তথ্য','কপিরাইট লঙ্ঘন','অন্য কিছু'].map(x=><option key={x}>{x}</option>)}
     </select>

     <textarea placeholder="বিস্তারিত লিখুন (ঐচ্ছিক)" value={details} onChange={e=>setDetails(e.target.value)}/>
     <button className="primary">রিপোর্ট পাঠান</button>
    </form>
   </div>
  }

 </div>;
}

// Section
function Section({title,sub}){
 return <div className="section-head page-head">
  <div><h2>{title}</h2><p>{sub}</p></div>
 </div>;
}

// Video grid
function VideoGrid({items,url,onReport,session}){

 if(!items.length){
  return <div className="empty">
   <Video size={28}/>
   <b>এখনো কোনো প্রকাশিত ভিডিও নেই</b>
   <span>অ্যাডমিন অনুমোদনের পর ভিডিও এখানে দেখা যাবে।</span>
  </div>;
 }

 return <div className="video-grid">
  {items.map(v=>
   <article className="video-card" key={v.id}>
    <div className="video-frame">
     <video controls preload="metadata" src={url(v)}/>
    </div>

    <div className="video-info">
     <h3>{v.title}</h3>
     <p>{v.description||'NOTURI কমিউনিটি ভিডিও'}</p>

     <div className="video-meta">
      <span>{new Date(v.created_at).toLocaleDateString('bn-BD')}</span>
      {session&&
       <button title="রিপোর্ট" onClick={()=>onReport(v)}><Flag size={16}/></button>
      }
     </div>
    </div>
   </article>
  )}
 </div>;
}

// Login prompt
function LoginPrompt({onClick}){
 return <div className="empty">
  <Lock/>
  <b>এই সুবিধা ব্যবহার করতে লগইন করুন</b>
  <button className="primary" onClick={onClick}>লগইন করুন</button>
 </div>;
}

// Admin videos
function AdminVideos({onPublish}){

 const [rows,setRows]=useState([]);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;

  async function load(){
   const {data,error}=await supabase.from('videos').select('*').order('created_at',{ascending:false});
   if(!active)return;
   if(error)setError(error.message);
   else setRows(data||[]);
  }

  load();
  return ()=>{active=false};
 },[]);

 if(error)return <p>ভিডিও লোড হয়নি: {error}</p>;

 return rows.length?
  rows.map(v=>
   <div className="admin-row" key={v.id}>
    <div>
     <b>{v.title}</b>
     <small>{v.is_published?'প্রকাশিত':'অনুমোদনের অপেক্ষায়'}</small>
    </div>

    <button
     className={v.is_published?'outline':'primary'}
     onClick={async()=>{
      await onPublish(v,!v.is_published);
      setRows(old=>old.map(x=>x.id===v.id?{...x,is_published:!x.is_published}:x));
     }}
    >
     {v.is_published?'আনপাবলিশ':'প্রকাশ করুন'}
    </button>
   </div>
  )
  :
  <p>কোনো ভিডিও নেই।</p>;
}

// Reports
function Reports(){

 const [rows,setRows]=useState([]);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;

  async function load(){
   const {data,error}=await supabase.from('video_reports').select('*').order('created_at',{ascending:false});
   if(!active)return;
   if(error)setError(error.message);
   else setRows(data||[]);
  }

  load();
  return ()=>{active=false};
 },[]);

 if(error)return <p>রিপোর্ট লোড হয়নি: {error}</p>;

 return rows.length?
  rows.map(r=>
   <div className="admin-row" key={r.id}>
    <div>
     <b>{r.reason}</b>
     <small>{r.details||'বিস্তারিত নেই'} · {new Date(r.created_at).toLocaleDateString('bn-BD')}</small>
    </div>
    <span className="status">{r.status}</span>
   </div>
  )
  :
  <p>কোনো রিপোর্ট নেই বা রিপোর্ট পড়ার অনুমতি নেই।</p>;
     }
