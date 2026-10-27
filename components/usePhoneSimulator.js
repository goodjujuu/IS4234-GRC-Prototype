'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function clockTime(d = new Date()) {
  return d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}

function longDate(d = new Date()) {
  return d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' });
}

// State and helpers for the simulated customer phone (components/CustomerPhone.js):
// the SMS thread, which screen is showing, lock-screen notifications, the
// "bank is typing" indicator, vibration, and a live clock.
export default function usePhoneSimulator() {
  const [messages, setMessages] = useState([]);
  const [screen, setScreen] = useState('lock'); // lock | messages | app
  const [hasNotification, setHasNotification] = useState(false);
  const [bankTyping, setBankTyping] = useState(false);
  const [buzzKey, setBuzzKey] = useState(0);
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  const screenRef = useRef('lock');
  const timers = useRef([]);

  // Live clock (client only, to avoid a server/client mismatch).
  useEffect(() => {
    const tick = () => {
      setTime(clockTime());
      setDate(longDate());
    };
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const showScreen = useCallback((next) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  // An SMS from the bank lands on the phone. `extra` can carry a `link`.
  const receive = useCallback((text, extra = {}) => {
    setBankTyping(false);
    setMessages((prev) => [...prev, { from: 'bank', text, time: clockTime(), ...extra }]);
    setBuzzKey((k) => k + 1);
    if (screenRef.current === 'lock') setHasNotification(true);
  }, []);

  // Deliver an SMS after a delay. `asReply` shows the typing dots first,
  // as when the bank's system answers something the customer just sent.
  const receiveLater = useCallback(
    (text, ms, { asReply = false, ...extra } = {}) => {
      if (asReply && screenRef.current !== 'lock') setBankTyping(true);
      later(() => receive(text, extra), ms);
    },
    [later, receive],
  );

  const sendFromCustomer = useCallback((text) => {
    setMessages((prev) => [...prev, { from: 'customer', text, time: clockTime() }]);
  }, []);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMessages([]);
    setHasNotification(false);
    setBankTyping(false);
    showScreen('lock');
  }, [showScreen]);

  const phoneProps = {
    time,
    date,
    screen,
    hasNotification,
    messages,
    bankTyping,
    buzzKey,
    onOpenNotification: () => {
      setHasNotification(false);
      showScreen('messages');
    },
    onBack: () => showScreen(screenRef.current === 'app' ? 'messages' : 'lock'),
  };

  return { phoneProps, receive, receiveLater, sendFromCustomer, reset, showScreen, later };
}
