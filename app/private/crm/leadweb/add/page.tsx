"use client"

import { useState } from 'react';

export default function CreateLeadForm() {
    const [formData, setFormData] = useState({
        lead_name: '',
        zoom: false,
        cell_phone: '',
        email: '',
        date: '',
        hour: '',
        done: false,
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setFormData((prev) => ({
            ...prev,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formattedData = {
            ...formData,
            zoom: formData.zoom ? 1 : 0, // המרת boolean ל-0 או 1
            done: formData.done ? 1 : 0, // המרת boolean ל-0 או 1
        };

        const response = await fetch('/api/leadweb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedData),
        });

        const data = await response.json();
        setLoading(false);
        
        if (response.ok) {
            setMessage('Lead created successfully!');
            setFormData({
                lead_name: '',
                zoom: false,
                cell_phone: '',
                email: '',
                date: '',
                hour: '',
                done: false,
            });
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    return (

        <div className='my-6'>
        <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">צור ליד אתר חדש</h2>
            {message && <p className="mb-4 text-center text-sm text-red-500">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    name="lead_name"
                    placeholder="Lead Name"
                    value={formData.lead_name}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="tel"
                    name="cell_phone"
                    placeholder="Cell Phone"
                    value={formData.cell_phone}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="time"
                    name="hour"
                    value={formData.hour}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="zoom"
                        checked={formData.zoom}
                        onChange={handleChange}
                    />
                    <span>Zoom Meeting</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="done"
                        checked={formData.done}
                        onChange={handleChange}
                    />
                    <span>Completed</span>
                </label>
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                    disabled={loading}
                >
                    {loading ? 'Creating...' : 'Create Lead'}
                </button>
            </form>
        </div>

</div>

    );
}
