

interface ModalProps {
  isOpen: boolean; // האם ה-modal פתוח
  onClose: () => void; // פונקציה לסגירה
  children: React.ReactNode; // תוכן בתוך ה-modal
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null; // אם ה-modal סגור, לא להציג כלום

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
  <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl">
    {/* כותרת */}
    <div className="flex justify-between items-center p-4 border-b">
      <h2 className="text-lg font-bold text-blue-600">לוח סילוקין</h2>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-800"
      >
        ✖
      </button>
    </div>
    {/* תוכן */}
    <div className="p-4 max-h-[75vh] overflow-y-auto">{children}</div>
  </div>
</div>
  );
};

