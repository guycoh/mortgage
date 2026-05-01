// /app/private/crm/leads/import/hooks/useLeadsImport.ts

"use client";

import { useState } from "react";
import { parseFile } from "../utils/parseFile";
import { mapRows } from "../utils/mapRows";

export function useLeadsImport() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[]>([]);

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");

  const handleFile = async (file: File) => {
    const { headers, rows } = await parseFile(file);
    setHeaders(headers);
    setRows(rows);
  };

  const generatePreview = () => {
    const mapped = mapRows(headers, rows, mapping);
    setPreview(mapped);
  };

  const uploadLeads = async () => {
    try {
      setStatus("uploading");
      setProgress(10);

      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leads: preview }),
      });

      setProgress(80);

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setProgress(100);
        console.error(data);
        return;
      }

      setStatus("done");
      setProgress(100);

      console.log(data);

      // 👇 reset פשוט ובטוח (בלי refs)
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
      }, 2000);

    } catch (err) {
      console.error(err);
      setStatus("error");
      setProgress(100);
    }
  };

  return {
    headers,
    rows,
    mapping,
    setMapping,
    preview,
    handleFile,
    generatePreview,
    uploadLeads,
    progress,
    status,
  };
}

























// "use client"



// import { useState } from "react";
// import { parseFile } from "../utils/parseFile";
// import { mapRows } from "../utils/mapRows";

// export function useLeadsImport() {
//   const [headers, setHeaders] = useState<string[]>([]);
//   const [rows, setRows] = useState<any[]>([]);
//   const [mapping, setMapping] = useState<Record<string, string>>({});
//   const [preview, setPreview] = useState<any[]>([]);

// const [progress, setProgress] = useState(0);
// const [status, setStatus] = useState<
//   "idle" | "uploading" | "done" | "error"
// >("idle");

// const reset = () => {
//   setProgress(0);
//   setStatus("idle");
// };


//   const handleFile = async (file: File) => {
//     const { headers, rows } = await parseFile(file);
//     setHeaders(headers);
//     setRows(rows);
//   };

//   const generatePreview = () => {
//     const mapped = mapRows(headers, rows, mapping);
//     setPreview(mapped);
//   };


// const uploadLeads = async () => {
//   try {
//     setStatus("uploading");
//     setProgress(10);

//     const res = await fetch("/api/leads/import", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ leads: preview }),
//     });

//     setProgress(80);

//     const data = await res.json();

//     if (!res.ok) {
//       setStatus("error");
//       setProgress(100);
//       return;
//     }

//     setStatus("done");
//     setProgress(100);

//     console.log(data);

//     // ✅ פה בלבד
//     setTimeout(() => {
//       setStatus("idle");
//       setProgress(0);
//     }, 2000);

//   } catch (err) {
//     setStatus("error");
//     setProgress(100);
//   }
// };



//   return {
//     headers,
//     rows,
//     mapping,
//     setMapping,
//     preview,
//     handleFile,
//     generatePreview,
//     uploadLeads,
//     progress,
//      status,


//   };
// }