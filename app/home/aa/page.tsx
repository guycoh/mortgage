import LoanBarChart from './components/LoanBarChart';

const sampleData = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  principal: 1000 + Math.random() * 500,
  interest: 500 + Math.random() * 300,
}));

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-center text-sky-800">גרף תשלומים חודשי 📊</h1>
      <LoanBarChart data={sampleData} />
    </div>
  );
}
