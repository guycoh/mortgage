

export default function Hachamm() {
  return (
    // מעטפת חיצונית כדי לתת קצת ריווח מהקצוות של המסך
    <header className="w-full p-2">
      
     
        
        {/* אזור ימני (למשל: לוגו או כותרת) */}
        <div className="flex items-center">
          {/* ניתן להכניס לכאן את הלוגו או טקסט */}
          <span className="text-gray-400 text-sm">כאן ייכנס הלוגו...</span>
        </div>

        {/* אזור מרכזי / שמאלי (למשל: כפתורים, תפריט ניווט, פרטי משתמש) */}
        <div className="flex items-center gap-4">
          {/* ניתן להכניס לכאן את הכפתורים */}
          <span className="text-gray-400 text-sm">כאן ייכנסו הכפתורים...</span>
        </div>

    
      
    </header>
  );
}