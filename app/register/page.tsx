"use client";
import { useState } from "react";
import { signUpAction } from "@/app/actions";
import Image from "next/image";
import {
  MailIcon,
  LockIcon,
  UserIcon,
  PhoneIcon,
} from "lucide-react";

export default function SignUpPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const validate = (formData: Record<string, string>) => {
    const newErrors: Record<string, string> = {};
    const email = formData.email || "";
    const password = formData.password || "";
    const confirm = formData.confirmPassword || "";
    const phone = formData.phone || "";

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "כתובת אימייל לא תקינה";

    if (password.length < 6)
      newErrors.password = "הסיסמה חייבת להכיל לפחות 6 תווים";

    if (password !== confirm)
      newErrors.confirmPassword = "הסיסמאות אינן תואמות";

    if (!phone.match(/^\d{9,10}$/))
      newErrors.phone = "יש להזין מספר טלפון חוקי (9–10 ספרות)";

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const formObject: Record<string, string> = {};
    formData.forEach((value, key) => {
      formObject[key] = value.toString();
    });

    const formErrors = validate(formObject);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setSuccess("");
      return;
    }

    const res = await signUpAction(formObject);
    if (res.success) {
      setSuccess("ההרשמה הצליחה! בדקו את תיבת המייל לאימות.");
      setErrors({});
    } else {
      setSuccess("");
      setErrors({ general: res.error });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-5xl flex flex-col md:flex-row-reverse">
        {/* צד ימין - לוגו */}
        <div className="hidden md:flex items-center justify-center bg-blue-50 p-8 w-1/2">
          <Image
            src="/assets/images/svg/muhni_logo.svg"
            alt="Morgi Logo"
            width={300}
            height={300}
            className="object-contain"
          />
        </div>

        {/* צד שמאל - טופס */}
        <form
          onSubmit={handleSubmit}
          className="w-full md:w-1/2 p-8 space-y-6"
        >
          <h2 className="text-3xl font-extrabold text-center text-gray-800">
            הירשמו אלינו
          </h2>
          <p className="text-center text-gray-500">
            התחילו את הדרך למשכנתא מושלמת.
          </p>

          <FormField
            label="שם מלא"
            name="fullName"
            required
            error={errors.fullName}
            icon={<UserIcon className="w-5 h-5 text-gray-400" />}
          />
          <FormField
            label="טלפון"
            name="phone"
            required
            error={errors.phone}
            type="tel"
            icon={<PhoneIcon className="w-5 h-5 text-gray-400" />}
          />
          <FormField
            label="אימייל"
            name="email"
            required
            error={errors.email}
            type="email"
            icon={<MailIcon className="w-5 h-5 text-gray-400" />}
          />
          <FormField
            label="סיסמה"
            name="password"
            required
            error={errors.password}
            type="password"
            icon={<LockIcon className="w-5 h-5 text-gray-400" />}
          />
          <FormField
            label="אימות סיסמה"
            name="confirmPassword"
            required
            error={errors.confirmPassword}
            type="password"
            icon={<LockIcon className="w-5 h-5 text-gray-400" />}
          />

          <button
            type="submit"
            className="w-full bg-main hover:bg-[#16628a] text-white py-3 rounded-xl font-semibold shadow-md transition"
          >
            הרשם עכשיו
          </button>

          {success && (
            <p className="text-center text-green-600 font-medium">{success}</p>
          )}
          {errors.general && (
            <p className="text-center text-red-600 font-medium">{errors.general}</p>
          )}
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  required,
  error,
  type = "text",
  icon,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <label className="block text-sm font-semibold mb-1 text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex items-center border rounded-xl shadow-sm px-3 py-2 bg-white transition focus-within:ring-2 focus-within:ring-orange-300 focus-within:bg-orange-50">
        {icon && <div className="mr-2">{icon}</div>}
        <input
          name={name}
          type={type}
          required={required}
          className="w-full outline-none bg-transparent text-sm placeholder-gray-400"
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}





