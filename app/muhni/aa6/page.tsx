'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg space-y-4">
      <h2 className="text-xl font-semibold text-center">צור קשר</h2>

      <input
        type="text"
        name="name"
        placeholder="שם מלא"
        value={formData.name}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      <input
        type="email"
        name="email"
        placeholder="אימייל"
        value={formData.email}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      <textarea
        name="message"
        placeholder="ההודעה שלך"
        value={formData.message}
        onChange={handleChange}
        required
        rows={5}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-md transition"
      >
        {status === 'loading' ? 'שולח...' : 'שלח הודעה'}
      </button>

      {status === 'success' && <p className="text-green-600 text-center">ההודעה נשלחה בהצלחה ✅</p>}
      {status === 'error' && <p className="text-red-600 text-center">אירעה שגיאה בשליחה ❌</p>}
    </form>
  );
}
