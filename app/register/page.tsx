"use client";
import { useState } from "react";
import { signUpAction } from "@/app/actions";

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
      newErrors.email = "Invalid email";

    if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (password !== confirm)
      newErrors.confirmPassword = "Passwords do not match";

    if (!phone.match(/^\d{9,10}$/))
      newErrors.phone = "Phone must be 9–10 digits";

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const formObject: Record<string, string> = {};
    
    // המרה של FormData ל-Record<string, string>
    formData.forEach((value, key) => {
      formObject[key] = value.toString();
    });

    const formErrors = validate(formObject); // בעיות בתוקף השדות
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const res = await signUpAction(formObject); // שליחה לפונקציית signUpAction
    if (res.success) {
      setSuccess("Check your email to verify your account.");
      setErrors({});
    } else {
      setSuccess("");
      setErrors({ general: res.error });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>

        <FormField
          label="Full Name"
          name="fullName"
          required
          error={errors.fullName}
        />
        <FormField
          label="Phone"
          name="phone"
          required
          error={errors.phone}
          type="tel"
        />
        <FormField
          label="Email"
          name="email"
          required
          error={errors.email}
          type="email"
        />
        <FormField
          label="Password"
          name="password"
          required
          error={errors.password}
          type="password"
        />
        <FormField
          label="Confirm Password"
          name="confirmPassword"
          required
          error={errors.confirmPassword}
          type="password"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition"
        >
          Sign Up
        </button>

        {success && <p className="text-center text-green-600">{success}</p>}
        {errors.general && <p className="text-center text-red-600">{errors.general}</p>}
      </form>
    </div>
  );
}

function FormField({
  label,
  name,
  required,
  error,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}



// "use client";
// import { useState } from "react";
// import { signUpAction } from "@/app/actions";

// export default function SignUpPage() {
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [success, setSuccess] = useState("");

//   const validate = (formData: FormData) => {
//     const newErrors: Record<string, string> = {};
//     const email = formData.get("email")?.toString() || "";
//     const password = formData.get("password")?.toString() || "";
//     const confirm = formData.get("confirmPassword")?.toString() || "";
//     const phone = formData.get("phone")?.toString() || "";

//     if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
//       newErrors.email = "Invalid email";

//     if (password.length < 6)
//       newErrors.password = "Password must be at least 6 characters";

//     if (password !== confirm)
//       newErrors.confirmPassword = "Passwords do not match";

//     if (!phone.match(/^\d{9,10}$/))
//       newErrors.phone = "Phone must be 9–10 digits";

//     return newErrors;
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
//       <form
//         className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4"
//         action={async (formData) => {
//           const formErrors = validate(formData);
//           if (Object.keys(formErrors).length > 0) {
//             setErrors(formErrors);
//             return;
//           }

//           const res = await signUpAction(formData);
//           setErrors({});
//           setSuccess("Check your email to verify your account.");
//         }}
//       >
//         <h2 className="text-2xl font-bold text-center">Sign Up</h2>

//         <FormField
//           label="Full Name"
//           name="fullName"
//           required
//           error={errors.fullName}
//         />
//         <FormField
//           label="Phone"
//           name="phone"
//           required
//           error={errors.phone}
//           type="tel"
//         />
//         <FormField
//           label="Email"
//           name="email"
//           required
//           error={errors.email}
//           type="email"
//         />
//         <FormField
//           label="Password"
//           name="password"
//           required
//           error={errors.password}
//           type="password"
//         />
//         <FormField
//           label="Confirm Password"
//           name="confirmPassword"
//           required
//           error={errors.confirmPassword}
//           type="password"
//         />

//         <button
//           type="submit"
//           className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition"
//         >
//           Sign Up
//         </button>

//         {success && <p className="text-center text-green-600">{success}</p>}
//       </form>
//     </div>
//   );
// }

// function FormField({
//   label,
//   name,
//   required,
//   error,
//   type = "text",
// }: {
//   label: string;
//   name: string;
//   required?: boolean;
//   error?: string;
//   type?: string;
// }) {
//   return (
//     <div>
//       <label className="block text-sm font-medium mb-1 text-gray-700">
//         {label}
//         {required && <span className="text-red-500"> *</span>}
//       </label>
//       <input
//         name={name}
//         type={type}
//         required={required}
//         className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
//           error
//             ? "border-red-500 focus:ring-red-500"
//             : "border-gray-300 focus:ring-blue-500"
//         }`}
//       />
//       {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//     </div>
//   );
// }
