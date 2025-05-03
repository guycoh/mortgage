'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditLead() {
    const router = useRouter();
    const { id } = useParams();
    const [lead, setLead] = useState({
        lead_name: '',
        cell_phone: '',
        email: '',
        date: '',
        hour: '',
        zoom: false,
        done: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLead();
    }, []);

    const fetchLead = async () => {
        setLoading(true);
        const response = await fetch(`/api/leadweb/${id}`);
        const data = await response.json();
        setLead(data);
        setLoading(false);
    };

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setLead({ ...lead, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        await fetch(`/api/leadweb/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
        });
        router.push('/private/crm/leadweb');
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">עריכת ליד</h2>
            {loading ? (
                <p>טוען נתונים...</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        name="lead_name"
                        value={lead.lead_name}
                        onChange={handleChange}
                        placeholder="שם מלא"
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="tel"
                        name="cell_phone"
                        value={lead.cell_phone}
                        onChange={handleChange}
                        placeholder="טלפון"
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="email"
                        name="email"
                        value={lead.email}
                        onChange={handleChange}
                        placeholder="אימייל"
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="date"
                        name="date"
                        value={lead.date}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="time"
                        name="hour"
                        value={lead.hour}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    />
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name="zoom"
                            checked={lead.zoom}
                            onChange={handleChange}
                        />
                        <span>שיחת זום</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name="done"
                            checked={lead.done}
                            onChange={handleChange}
                        />
                        <span>בוצע</span>
                    </label>
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        עדכן ליד
                    </button>
                </form>
            )}
        </div>
    );
}
