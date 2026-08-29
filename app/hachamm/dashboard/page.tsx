import React from 'react';
import { 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  CalendarDays, 
  TrendingUp, 
  Wallet,
  ArrowLeft,
  UserMinus,
  Target
} from 'lucide-react';

export default function SalesDashboard() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">בוקר טוב, תומר! 👋</h1>
        <p className="text-slate-500 mt-1">הנה סקירת הביצועים והמשימות שלך להיום.</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Revenue Card (Updated with Target) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Target className="w-3 h-3" />
              בדרך ליעד
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">סכום עסקאות (החודש)</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">₪142,500</h2>
          
          {/* Progress Bar Area */}
          <div className="mb-6 mt-auto">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-slate-500">יעד: ₪200,000</span>
              <span className="text-emerald-600">חסר ליעד: ₪57,500</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: '71%' }}></div>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
            צפה בכל העסקאות
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Deals Count Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">כמות עסקאות שנסגרו</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">24 <span className="text-lg font-normal text-slate-400">עסקאות</span></h2>
          <button className="w-full mt-auto flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
            פירוט עסקאות
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Active Leads Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">לידים בטיפולך</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">38 <span className="text-lg font-normal text-slate-400">פעילים</span></h2>
          <button className="w-full mt-auto flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
            נהל לידים
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tasks & Meetings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Tasks */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">משימות להיום</h3>
            </div>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-md">6 נותרו</span>
          </div>
          
          <div className="space-y-3 mb-6 flex-1">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">שיחת פולואפ עם חברת אלפא</span>
                <span className="text-xs text-slate-500 mt-0.5">14:00 • פוטנציאל גבוה</span>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">שליחת הצעת מחיר לדניאל</span>
                <span className="text-xs text-slate-500 mt-0.5">עד סוף היום</span>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
            </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">עדכון סטטוס מערכת</span>
                <span className="text-xs text-slate-500 mt-0.5">משימה פנימית</span>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
            </div>
          </div>
          
          <button className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 rounded-xl transition-colors mt-auto">
            צפה בכל המשימות
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Right Column Alerts & Meetings */}
        <div className="flex flex-col gap-6">
          
          {/* Overdue Tasks */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">משימות בפיגור</h3>
                  <p className="text-sm text-slate-500">דורש התייחסות מיידית</p>
                </div>
              </div>
              <h2 className="text-4xl font-black text-rose-500">3</h2>
            </div>
            <button className="mt-1 w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
              טפל במשימות שבפיגור
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* NEW: Leads without tasks */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
                  <UserMinus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">לידים בתהליך ללא משימה</h3>
                  <p className="text-sm text-slate-500">לידים שעלולים להתקרר</p>
                </div>
              </div>
              <h2 className="text-4xl font-black text-orange-500">12</h2>
            </div>
            <button className="mt-1 w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
              הקצה משימות ללידים
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">פגישות עתידיות</h3>
                  <p className="text-sm text-slate-500">לשבוע הקרוב</p>
                </div>
              </div>
              <h2 className="text-4xl font-black text-violet-600">8</h2>
            </div>
            <button className="mt-1 w-full flex items-center justify-center gap-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
              ללוח השנה
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}