// /app/private/crm/leads/import/page.tsx

import UploadBox from "./components/UploadBox";


export default function ImportPage() {
  return (
    <div className="p-10 space-y-6">
      <h1 className="text-3xl font-bold">ייבוא לידים</h1>
      <UploadBox />
    </div>
  );
}