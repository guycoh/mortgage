export function ScoreCard({ score }: { score: number }) {
  const color =
    score > 700 ? "text-green-600" :
    score > 600 ? "text-yellow-500" :
    "text-red-600";

  return (
    <div className="bg-white p-6 rounded-xl shadow text-center">
      <div className="text-gray-500 text-sm">ציון אשראי</div>
      <div className={`text-4xl font-bold ${color}`}>{score}</div>
    </div>
  );
}