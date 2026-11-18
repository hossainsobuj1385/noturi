import React, { useMemo, useRef, useState } from 'react';
import './FriendsChat.css';

const initialPeople = [
  { id: 1, name: 'সাবিহা ইসলাম', privacy: 'পাবলিক', initial: 'স', color: 'lavender', status: 'none' },
  { id: 2, name: 'রাফি আহমেদ', privacy: 'লক করা', initial: 'র', color: 'mint', status: 'none' },
  { id: 3, name: 'নুসরাত জাহান', privacy: 'পাবলিক', initial: 'ন', color: 'rose', status: 'connected' },
  { id: 4, name: 'মেহেদী হাসান', privacy: 'পাবলিক', initial: 'ম', color: 'blue', status: 'none' },
  { id: 5, name: 'নাসিম উদ্দিন', privacy: 'লক করা', initial: 'ন', color: 'violet', status: 'none' },
];

const initialRequests = [
  { id: 6, name: 'তানিয়া আক্তার', initial: 'তা', color: 'peach', message: 'আপনার ইনবক্সে যোগাযোগের অনুরোধ পাঠিয়েছেন' },
];

export default function FriendsChat() {
  const [people, setPeople] = useState(initialPeople);
  const [requests, setRequests] = useState(initialRequests);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const imageRef = useRef(null);
  const wordCount = useMemo(() => draft.trim() ? draft.trim().split(/\s+/u).length : 0, [draft]);

  const flash = (message) => {
    setNotice(message);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setNotice(''), 2400);
  };

  const connect = (person) => {
    setPeople(current => current.map(p => p.id === person.id ? { ...p, status: 'pending' } : p));
    flash(`${person.name}-কে সঙ্গী হওয়ার অনুরোধ পাঠানো হয়েছে (ডেমো)`);
  };

  const decideRequest = (id, accepted) => {
    const request = requests.find(r => r.id === id);
    setRequests(current => current.filter(r => r.id !== id));
    if (accepted) {
      setPeople(current => [...current, { id, name: request.name, privacy: 'পাবলিক', initial: request.initial, color: request.color, status: 'connected' }]);
      flash(`${request.name}-এর অনুরোধ গ্রহণ করা হয়েছে`);
    } else flash('অনুরোধটি বর্জন করা হয়েছে');
  };

  const openChat = (person) => {
    setActiveChat(person);
    setMessages([]);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!activeChat) return flash('আগে একজনকে ইনবক্সে নির্বাচন করুন');
    if (!text) return;
    if (wordCount > 200) return flash('একটি বার্তায় সর্বোচ্চ ২০০ শব্দ পাঠানো যাবে');
    setMessages(current => [...current, { id: Date.now(), text, type: 'text' }]);
    setDraft('');
  };

  const sendImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return flash('শুধু ছবি পাঠানো যাবে, ভিডিও নয়');
    if (!activeChat) return flash('ছবি পাঠাতে আগে ইনবক্সে একজনকে নির্বাচন করুন');
    const reader = new FileReader();
    reader.onload = () => setMessages(current => [...current, { id: Date.now(), type: 'image', src: reader.result }]);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <main className="htv-app">
      <header className="htv-header">
        <div className="htv-brand"><span className="htv-mark">♫</span><span>HushTalk<span>Voice</span></span></div>
        <div className="htv-header-actions"><button aria-label="নোটিফিকেশন">♧</button><div className="htv-my-avatar">আ</div></div>
      </header>

      <nav className="htv-tabs" aria-label="প্রধান বিভাগ">
        <button className="active">বন্ধু তালিকা</button>
        <button onClick={() => flash('অনুসন্ধান সুবিধা পরের ধাপে যুক্ত হবে')}>অনুসন্ধান</button>
        <button onClick={() => flash('আপনার সংযোগ তালিকা')}>আমার সঙ্গী</button>
      </nav>

      {notice && <div className="htv-toast" role="status">{notice}</div>}

      <div className="htv-layout">
        <section className="htv-main-column">
          <div className="htv-section-heading"><div><h1>মানুষ খুঁজুন</h1><p>নতুন মানুষের সঙ্গে পরিচিত হোন</p></div><span className="htv-count">{people.length} জন</span></div>
          <div className="htv-list">
            {people.map(person => (
              <article className="htv-person" key={person.id}>
                <div className={`htv-avatar ${person.color}`}>{person.initial}</div>
                <div className="htv-person-info"><strong>{person.name}</strong><span className="htv-privacy">{person.privacy === 'লক করা' ? '▣' : '◎'} {person.privacy}</span></div>
                <div className="htv-person-actions">
                  {person.status === 'connected' ? <button className="htv-connected" disabled>✓ সঙ্গী আছেন</button> : person.status === 'pending' ? <button className="htv-pending" disabled>অনুরোধ পাঠানো</button> : <button className="htv-connect" onClick={() => connect(person)}>＋ সঙ্গী হোন</button>}
                  <button className="htv-inbox" onClick={() => openChat(person)}>ইনবক্স</button>
                </div>
              </article>
            ))}
          </div>

          <section className="htv-requests">
            <div className="htv-section-heading"><div><h2>ইনবক্স অনুরোধ</h2><p>আপনি গ্রহণ বা বর্জন করতে পারেন</p></div><span className="htv-count">{requests.length}টি</span></div>
            {requests.length === 0 ? <p className="htv-empty">নতুন কোনো অনুরোধ নেই</p> : requests.map(request => (
              <article className="htv-request-card" key={request.id}>
                <div className={`htv-avatar small ${request.color}`}>{request.initial}</div>
                <div className="htv-request-info"><strong>{request.name}</strong><span>{request.message}</span></div>
                <div className="htv-request-actions"><button onClick={() => decideRequest(request.id, true)}>গ্রহণ</button><button onClick={() => decideRequest(request.id, false)}>বর্জন</button></div>
              </article>
            ))}
          </section>
        </section>

        <aside className="htv-chat-panel">
          <div className="htv-chat-title"><div><h2>{activeChat ? activeChat.name : 'আপনার ইনবক্স'}</h2><p>{activeChat ? 'বার্তা পাঠানোর জন্য প্রস্তুত' : 'কথা শুরু করতে তালিকা থেকে ইনবক্স নির্বাচন করুন'}</p></div><span className="htv-chat-symbol">✉</span></div>
          <div className="htv-chat-body" aria-live="polite">
            {!activeChat && <div className="htv-chat-placeholder"><div className="htv-placeholder-icon">✉</div><strong>আপনার কথোপকথন এখানে</strong><p>বন্ধু তালিকা থেকে কাউকে ইনবক্স করুন।</p></div>}
            {activeChat && messages.length === 0 && <div className="htv-chat-placeholder"><div className="htv-placeholder-icon">✦</div><strong>{activeChat.name}-কে শুভেচ্ছা জানান</strong><p>প্রথম বার্তাটি আপনিই পাঠাতে পারেন।</p></div>}
            {messages.map(message => <div className="htv-message" key={message.id}>{message.type === 'image' ? <img src={message.src} alt="পাঠানো ছবি" /> : <p>{message.text}</p>}</div>)}
          </div>
          <div className="htv-composer">
            <input ref={imageRef} type="file" accept="image/*" hidden onChange={sendImage} />
            <button className="htv-image-button" aria-label="ছবি পাঠান" title="শুধু ছবি পাঠানো যাবে" onClick={() => imageRef.current?.click()}>▧</button>
            <div className="htv-input-wrap"><textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="এখানে বার্তা লিখুন..." rows={2} aria-label="বার্তা লিখুন" /><span className={wordCount > 200 ? 'over' : ''}>{wordCount}/২০০ শব্দ</span></div>
            <button className="htv-send" onClick={sendMessage} aria-label="বার্তা পাঠান">➤</button>
          </div>
          <p className="htv-note">শুধু লেখা ও ছবি • ভিডিও পাঠানো যাবে না</p>
        </aside>
      </div>
      <footer className="htv-footer">HushTalkVoice <span>•</span> কথা বলুন, সংযোগ গড়ুন</footer>
    </main>
  );
}
