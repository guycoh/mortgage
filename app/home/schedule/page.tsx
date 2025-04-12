"use client"

import { useState } from "react";
import { useRouter } from "next/navigation"; // ייבוא useRouter
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Image from "next/image";



export default function CreateLeadForm() {
    const router = useRouter(); // יצירת מופע הניווט
    const [formData, setFormData] = useState({
        lead_name: "",
        zoom: true, 
        cell_phone: "",
        email: "",
        date: null as Date | null,
        hour: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleDateChange = (date: Date | null) => {
        if (date?.getDay() === 6) {
            setMessage("לא ניתן לקבוע פגישות ביום שבת, אנא בחר יום אחר.");
            return;
        }
        setMessage("");
        setFormData((prev) => ({
            ...prev,
            date,
            hour: "",
        }));
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData((prev) => ({
            ...prev,
            hour: e.target.value,
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (!formData.date || !formData.hour) {
            setMessage("אנא בחר תאריך ושעה תחילה.");
            setLoading(false);
            return;
        }

        const formattedData = {
            ...formData,
            date: formData.date.toISOString().split("T")[0],
            zoom: 1, 
        };

        const response = await fetch("/api/leadweb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formattedData),
        });

        const data = await response.json();
        setLoading(false);

        if (response.ok) {
            router.push(`/home/schedule/success?name=${formData.lead_name}&phone=${formData.cell_phone}&email=${formData.email}&date=${formattedData.date}&hour=${formData.hour}`);
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    const generateTimeSlots = () => {
        if (!formData.date) return [];
        const dayOfWeek = formData.date.getDay();
        let startHour = 9;
        let endHour = dayOfWeek === 5 ? 13 : 20;

        const times = [];
        for (let hour = startHour; hour < endHour; hour++) {
            times.push(`${hour.toString().padStart(2, "0")}:00`);
            times.push(`${hour.toString().padStart(2, "0")}:30`);
        }
        times.push(`${endHour}:00`);
        return times;
    };

    return (
        <div className="my-6">
            <div className="flex flex-col md:flex-row max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">
                <div className="md:w-1/2 space-y-6 px-4 md:px-8">
                    <h2 className="text-2xl font-bold mb-6 text-center">קביעת פגישת זום עם יועץ משכנתאות</h2>
                    {message && <p className="mb-6 text-center text-sm text-red-500">{message}</p>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <DatePicker
                            selected={formData.date}
                            onChange={handleDateChange}
                            dateFormat="dd/MM/yyyy"
                            className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
                            placeholderText="בחר תאריך"
                            minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                            filterDate={(date) => date.getDay() !== 6}
                        />

                        {formData.date && (
                            <select
                                name="hour"
                                value={formData.hour}
                                onChange={handleTimeChange}
                                className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
                                required
                            >
                                <option value="" disabled>
                                    בחר שעה
                                </option>
                                {generateTimeSlots().map((time) => (
                                    <option key={time} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        )}

                        {formData.date && formData.hour && (
                            <>
                        <div className="relative w-full">
                                <input
                                   type="text"
                                   name="lead_name"
                                   placeholder="הכנס שם"
                                   value={formData.lead_name}                                
                                    onChange={handleChange}
                                    className="w-full p-3 pr-10 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
                                    required
                                />
                            <Image
                                src="/assets/images/svg/user.svg"
                                alt="mail icon"
                                width={25}
                                height={25}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            />
                        </div>

                        <div className="relative w-full">
                                <input
                                    type="tel"
                                    name="cell_phone"
                                    pattern="^05[0-9]-?[0-9]{7}$"
                                    placeholder="   הכנס טלפון"
                                    value={formData.cell_phone}
                                    onChange={handleChange}
                                    className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
                                    required
                                />
                                <Image
                                src="/assets/images/svg/smart-phone.svg"
                                alt="mail icon"
                                width={25}
                                height={25}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                />
                        </div>

                         <div className="relative w-full">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="   דואר אלקטרוני"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-3 pr-10 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
                                    required
                                />
                            <Image
                                src="/assets/images/svg/mail.svg"
                                alt="mail icon"
                                width={25}
                                height={25}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            />
                        </div>
                            </>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white p-3 h-[55px] rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg"
                            disabled={loading}
                        >
                            {loading ? "מתאם פגישה..." : "קבע פגישה"}
                        </button>
                    </form>
                </div>

                <div className="md:w-1/2 hidden md:block">
                    <img
                        src="/assets/images/imgFiles/zoom-meeting.jpg"
                        alt="Zoom Meeting"
                        className="w-full h-auto object-cover rounded-lg"
                    />
                </div>
            </div>
        </div>
    );
}






























// "use client"

// import { useState } from "react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";

// export default function CreateLeadForm() {
//     const [formData, setFormData] = useState({
//         lead_name: "",
//         zoom: true, // מוסתר אך תמיד דלוק
//         cell_phone: "",
//         email: "",
//         date: null as Date | null,
//         hour: "",
//     });
//     const [loading, setLoading] = useState(false);
//     const [message, setMessage] = useState("");

//     const handleDateChange = (date: Date | null) => {
//         if (date?.getDay() === 6) {
//             setMessage("לא ניתן לקבוע פגישות ביום שבת, אנא בחר יום אחר.");
//             return;
//         }
//         setMessage("");
//         setFormData((prev) => ({
//             ...prev,
//             date,
//             hour: "", // איפוס שעה במקרה של שינוי תאריך
//         }));
//     };

//     const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//         setFormData((prev) => ({
//             ...prev,
//             hour: e.target.value,
//         }));
//     };

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({
//             ...prev,
//             [name]: value,
//         }));
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);
//         setMessage("");

//         if (!formData.date || !formData.hour) {
//             setMessage("אנא בחר תאריך ושעה תחילה.");
//             setLoading(false);
//             return;
//         }

//         const formattedData = {
//             ...formData,
//             date: formData.date.toISOString().split("T")[0], // yyyy-mm-dd
//             zoom: 1, // שליחה כמספר
//         };

//         const response = await fetch("/api/leadweb", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(formattedData),
//         });

//         const data = await response.json();
//         setLoading(false);

//         if (response.ok) {
//             setMessage("נקבעה פגישה בהצלחה !!!");
//             setFormData({
//                 lead_name: "",
//                 zoom: true,
//                 cell_phone: "",
//                 email: "",
//                 date: null,
//                 hour: "",
//             });
//         } else {
//             setMessage(`Error: ${data.error}`);
//         }
//     };

//     const generateTimeSlots = () => {
//         if (!formData.date) return [];
//         const dayOfWeek = formData.date.getDay();
//         let startHour = 9;
//         let endHour = dayOfWeek === 5 ? 13 : 20;

//         const times = [];
//         for (let hour = startHour; hour < endHour; hour++) {
//             times.push(`${hour.toString().padStart(2, "0")}:00`);
//             times.push(`${hour.toString().padStart(2, "0")}:30`);
//         }
//         times.push(`${endHour}:00`);
//         return times;
//     };

//     return (
//         <div className="my-6">
//             <div className="flex flex-col md:flex-row max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">
//                 {/* טופס */}
//                 <div className="md:w-1/2 space-y-6 px-4 md:px-8">
//                     <h2 className="text-2xl font-bold mb-6 text-center">קביעת פגישת זום עם יועץ משכנתאות</h2>
//                     {message && <p className="mb-6 text-center text-sm text-red-500">{message}</p>}
//                     <form onSubmit={handleSubmit} className="space-y-6">
//                         {/* בורר תאריך */}
//                         <DatePicker
//                             selected={formData.date}
//                             onChange={handleDateChange}
//                             dateFormat="dd/MM/yyyy"
//                             className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
//                             placeholderText="בחר תאריך"
//                             minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
//                             filterDate={(date) => date.getDay() !== 6}
//                         />

//                         {/* בורר שעה (מופיע רק אם נבחר תאריך) */}
//                         {formData.date && (
//                             <select
//                                 name="hour"
//                                 value={formData.hour}
//                                 onChange={handleTimeChange}
//                                 className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
//                                 required
//                             >
//                                 <option value="" disabled>
//                                     בחר שעה
//                                 </option>
//                                 {generateTimeSlots().map((time) => (
//                                     <option key={time} value={time}>
//                                         {time}
//                                     </option>
//                                 ))}
//                             </select>
//                         )}

//                         {/* שדות הטופס (מוסתרים עד שנבחרו תאריך ושעה) */}
//                         {formData.date && formData.hour && (
//                             <>
//                                 <input
//                                     type="text"
//                                     name="lead_name"
//                                     placeholder="Lead Name"
//                                     value={formData.lead_name}
//                                     onChange={handleChange}
//                                     className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
//                                     required
//                                 />
//                                 <input
//                                     type="tel"
//                                     name="cell_phone"
//                                     placeholder="Cell Phone"
//                                     value={formData.cell_phone}
//                                     onChange={handleChange}
//                                     className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
//                                     required
//                                 />
//                                 <input
//                                     type="email"
//                                     name="email"
//                                     placeholder="Email"
//                                     value={formData.email}
//                                     onChange={handleChange}
//                                     className="w-full p-3 h-[55px] text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-orange-50"
//                                     required
//                                 />
//                             </>
//                         )}

//                           <button
//                               type="submit"
//                               className="w-full bg-green-500 text-white p-3 h-[55px] rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg"
//                               disabled={loading}
//                           >
//                               {loading ? "מתאם פגישה..." : "קבע פגישה"}
//                           </button>
//                     </form>
//                 </div>

//                 {/* תמונה שתופיע רק במסך md ומעלה */}
//                 <div className="md:w-1/2 hidden md:block">
//                     <img
//                         src="/assets/images/imgFiles/zoom-meeting.jpg"
//                         alt="Zoom Meeting"
//                         className="w-full h-auto object-cover rounded-lg"
//                     />
//                 </div>
//             </div>
//         </div>
//     );
// }