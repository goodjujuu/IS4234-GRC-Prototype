'use client';

import { useEffect, useRef, useState } from 'react';

// A simulated smartphone showing the customer's side of the M2 consent check:
// the lock-screen notification, then the SMS thread where the customer replies
// YES or NO. It is deliberately separate from the banker's screen — the banker
// has no way to approve the account themselves.

function SignalIcon() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
      <rect x="0" y="7" width="3" height="4" rx="1" />
      <rect x="4.5" y="5" width="3" height="6" rx="1" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
      <rect x="13.5" y="0" width="3" height="11" rx="1" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden="true">
      <path d="M7.5 2.2c2.2 0 4.2.8 5.7 2.2l1.2-1.3A10 10 0 0 0 7.5.4 10 10 0 0 0 .6 3.1l1.2 1.3A8.2 8.2 0 0 1 7.5 2.2Z" />
      <path d="M7.5 5.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3a6.7 6.7 0 0 0-9.2 0l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Z" />
      <circle cx="7.5" cy="9.3" r="1.6" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <div className="flex items-center" aria-hidden="true">
      <div className="relative h-[11px] w-[22px] rounded-[3px] border border-current opacity-90">
        <div className="absolute bottom-[1.5px] left-[1.5px] top-[1.5px] w-[14px] rounded-[1.5px] bg-current" />
      </div>
      <div className="ml-[1px] h-[4px] w-[1.5px] rounded-r bg-current opacity-60" />
    </div>
  );
}

function MessagesAppIcon() {
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-green-500" aria-hidden="true">
      <svg width="11" height="10" viewBox="0 0 11 10" fill="white">
        <ellipse cx="5.5" cy="4.3" rx="5.2" ry="4.1" />
        <path d="M2 7.2 1.2 9.6 4 8.1Z" />
      </svg>
    </span>
  );
}

function StatusBar({ time, onLockScreen }) {
  return (
    <div
      className={`relative z-10 flex h-[44px] shrink-0 items-center justify-between px-7 text-[13px] font-semibold ${
        onLockScreen ? 'text-white' : 'text-slate-900'
      }`}
    >
      {/* iOS hides the clock in the status bar on the lock screen (it's shown large instead) */}
      <span className="w-14">{onLockScreen ? '' : time}</span>
      <span className="flex w-14 items-center justify-end gap-1">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  );
}

export default function CustomerPhone({
  time,
  date,
  screen,
  hasNotification,
  messages,
  bankName,
  canReply,
  bankTyping,
  buzzKey,
  onOpenNotification,
  onBack,
  onSend,
}) {
  const [draft, setDraft] = useState('');
  const [buzzing, setBuzzing] = useState(false);
  const threadRef = useRef(null);

  // Phones show "12:49", not "12:49 am".
  const phoneTime = (time || '').replace(/\s?[ap]\.?m\.?$/i, '');

  const latestBank = [...messages].reverse().find((m) => m.from === 'bank');
  const lastCustomerIndex = messages.map((m) => m.from).lastIndexOf('customer');

  // Vibrate the phone whenever a new message from the bank arrives.
  useEffect(() => {
    if (!buzzKey) return undefined;
    setBuzzing(true);
    const t = setTimeout(() => setBuzzing(false), 550);
    return () => clearTimeout(t);
  }, [buzzKey]);

  // Keep the newest message in view (scroll only the thread, never the page).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, bankTyping, screen]);

  function submit(text) {
    const trimmed = text.trim();
    if (!trimmed || !canReply) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <div
      className={`relative h-[620px] w-[300px] shrink-0 rounded-[50px] bg-slate-900 p-[10px] shadow-2xl ring-1 ring-slate-700 ${
        buzzing ? 'animate-phone-buzz' : ''
      }`}
    >
      {/* Side buttons */}
      <div className="absolute -left-[3px] top-24 h-7 w-[3px] rounded-l bg-slate-700" />
      <div className="absolute -left-[3px] top-36 h-12 w-[3px] rounded-l bg-slate-700" />
      <div className="absolute -left-[3px] top-[200px] h-12 w-[3px] rounded-l bg-slate-700" />
      <div className="absolute -right-[3px] top-40 h-16 w-[3px] rounded-r bg-slate-700" />

      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-white">
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-[11px] z-20 h-[25px] w-[88px] -translate-x-1/2 rounded-full bg-black" />

        {screen === 'lock' ? (
          <div className="relative flex h-full flex-col bg-gradient-to-b from-indigo-950 via-indigo-800 to-fuchsia-700 text-white">
            <StatusBar time={phoneTime} onLockScreen />

            <div className="mt-6 text-center">
              <p className="text-[15px] font-medium opacity-90">{date}</p>
              <p className="text-[72px] font-semibold leading-none tracking-tight">{phoneTime}</p>
            </div>

            <div className="mt-8 px-3">
              {hasNotification && latestBank && (
                <button
                  type="button"
                  onClick={onOpenNotification}
                  className="animate-slide-down w-full rounded-[18px] bg-white/80 p-3 text-left text-slate-900 shadow-lg backdrop-blur-md transition hover:bg-white/90"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MessagesAppIcon />
                      MESSAGES
                    </span>
                    <span>now</span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold">{bankName}</p>
                  <p className="line-clamp-3 text-[13px] leading-snug">{latestBank.text}</p>
                </button>
              )}
            </div>

            {hasNotification && (
              <p className="absolute bottom-[86px] w-full text-center text-[11px] opacity-75">
                Tap the notification to open
              </p>
            )}

            {/* Flashlight / camera shortcuts */}
            <div className="mt-auto flex items-center justify-between px-9 pb-11">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur" aria-hidden="true">
                <svg width="14" height="18" viewBox="0 0 14 18" fill="white">
                  <path d="M2 0h10v3l-2 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6L2 3Z" />
                </svg>
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur" aria-hidden="true">
                <svg width="20" height="16" viewBox="0 0 20 16" fill="white">
                  <path d="M7 0h6l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h3.5Z" />
                  <circle cx="10" cy="9" r="3.5" fill="#4338ca" />
                </svg>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col bg-white">
            <StatusBar time={phoneTime} />

            {/* Conversation header */}
            <div className="relative shrink-0 border-b border-slate-200 bg-slate-50/95 px-3 pb-2">
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="absolute left-2 top-2 flex items-center text-[22px] leading-none text-blue-500"
              >
                ‹
              </button>
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-slate-400 to-slate-500 text-sm font-semibold text-white">
                  {bankName.charAt(0)}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-700">{bankName} ›</p>
              </div>
            </div>

            {/* Thread */}
            <div ref={threadRef} className="flex-1 overflow-y-auto px-3 py-3">
              {messages.length > 0 && (
                <p className="mb-2 text-center text-[10px] text-slate-400">
                  Text Message · Today {messages[0].time}
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.from === 'customer' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`animate-pop-in max-w-[80%] whitespace-pre-line rounded-[18px] px-3 py-2 text-[13px] leading-snug ${
                        m.from === 'customer'
                          ? 'rounded-br-[6px] bg-green-500 text-white'
                          : 'rounded-bl-[6px] bg-slate-200 text-slate-900'
                      }`}
                    >
                      {m.text}
                    </div>
                    {i === lastCustomerIndex && (
                      <span className="mr-1 mt-0.5 text-[10px] text-slate-400">Delivered</span>
                    )}
                  </div>
                ))}
                {bankTyping && (
                  <div className="flex items-start">
                    <div className="flex gap-1 rounded-[18px] rounded-bl-[6px] bg-slate-200 px-3 py-3">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick replies (like the suggested replies a phone keyboard offers) */}
            {canReply && (
              <div className="flex shrink-0 gap-2 px-3 pb-1">
                {['YES', 'NO'].map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => submit(reply)}
                    className="rounded-full border border-green-500 px-4 py-1 text-[13px] font-medium text-green-600 hover:bg-green-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Compose bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
              className="flex shrink-0 items-center gap-2 px-3 pb-7 pt-1"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!canReply}
                placeholder={canReply ? 'Text Message · SMS' : 'Text Message'}
                className="min-w-0 flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-[13px] text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={!canReply || !draft.trim()}
                aria-label="Send"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-[15px] font-bold text-white disabled:bg-slate-300"
              >
                ↑
              </button>
            </form>
          </div>
        )}

        {/* Home indicator */}
        <div
          className={`absolute bottom-2 left-1/2 h-[5px] w-[110px] -translate-x-1/2 rounded-full ${
            screen === 'lock' ? 'bg-white/80' : 'bg-slate-900'
          }`}
        />
      </div>
    </div>
  );
}
