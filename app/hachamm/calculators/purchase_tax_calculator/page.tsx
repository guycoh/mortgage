"use client";
import { useState } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { HmButton } from "../../components/HmButton";
import { HmFigure } from "../../components/HmFigure";
import { HmReveal } from "../../components/HmReveal";

const PurchaseTaxForm = () => {
  const [propertyPrice, setPropertyPrice] = useState<number | "">("");
  const [isSingleHome, setIsSingleHome] = useState<boolean>(true);
  const [taxBreakdown, setTaxBreakdown] = useState<
    { from: number; to: number; rate: number; amount: number }[]
  >([]);
  const [totalTax, setTotalTax] = useState<number | null>(null);

  const formatNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handlePropertyPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numericValue = Number(rawValue);
    if (!isNaN(numericValue)) {
      setPropertyPrice(numericValue);
    } else {
      setPropertyPrice("");
    }
  };

  const resetForm = () => {
    setPropertyPrice("");
    setIsSingleHome(true);
    setTaxBreakdown([]);
    setTotalTax(null);
  };

  const calculateTax = () => {
    if (!propertyPrice || propertyPrice <= 0) {
      setTotalTax(null);
      return;
    }
 
    let tax = 0;
    const breakdown = [];
 
    const brackets = isSingleHome
      ? [
          { limit: 1978745, rate: 0 },
          { limit: 2347040, rate: 0.035 },
          { limit: 6055070, rate: 0.05 },
          { limit: 20183565, rate: 0.08 },
          { limit: Infinity, rate: 0.1 },
        ]
      : [
          { limit: 5373000, rate: 0.08 },
          { limit: Infinity, rate: 0.1 },
        ];

    let remaining = propertyPrice;
    let prev = 0;

    for (let i = 0; i < brackets.length; i++) {
      const { limit, rate } = brackets[i];
      const range = Math.min(limit - prev, remaining);
      const amount = range * rate;
      tax += amount;
      breakdown.push({ from: prev + 1, to: prev + range, rate, amount });
      remaining -= range;
      prev = limit;
      if (remaining <= 0) break;
    }

    setTaxBreakdown(breakdown);
    setTotalTax(tax);
  };

  return (
 <div className="hm-page font-open-sans font-normal">
  <div className="relative w-full max-w-112.5">
    {/* גוף המחשבון */}
    <div className="hm-device p-5 sm:p-6">
      <div className="hm-device-gloss" />

      {/* תוכן המחשבון */}
      <div className="relative flex flex-col items-center justify-start h-full space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-center drop-shadow-lg mb-2">
          מחשבון מס רכישה
        </h2>

        {/* שדה מחיר */}
        <input
          type="text"
          inputMode="numeric"
          placeholder="מחיר הדירה (₪)"
          className="hm-field text-base"
          value={
            propertyPrice !== "" ? formatNumber(propertyPrice.toString()) : ""
          }
          onChange={handlePropertyPriceChange}
        />

        {/* דירה יחידה */}
        <div className="w-full flex flex-wrap items-center justify-start gap-x-6 gap-y-2 text-sm">
          <p>האם זאת דירה יחידה ?</p>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={isSingleHome}
              onChange={() => setIsSingleHome(true)}
            />
            כן
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!isSingleHome}
              onChange={() => setIsSingleHome(false)}
            />
            לא
          </label>
        </div>

        {/* כפתורים */}
        <div className="grid w-full grid-cols-2 gap-3">
          <HmButton onClick={calculateTax} fullWidth icon={<Calculator className="h-[18px] w-[18px]" />}>
            חשב מס
          </HmButton>
          <HmButton
            onClick={resetForm}
            variant="ghost"
            fullWidth
            icon={<RotateCcw className="h-[18px] w-[18px]" />}
          >
            נקה טופס
          </HmButton>
        </div>

        {/* תוצאה */}
        <HmReveal show={totalTax !== null}>
          <div className="hm-panel mt-3 p-4">
            {taxBreakdown.map((step, idx) => (
              <div
                key={idx}
                className="hm-row mb-3 grid grid-cols-2 items-center gap-x-3 gap-y-1 p-3 sm:grid-cols-4"
              >
                <span className="text-sm font-medium">
                  מ: ₪{step.from.toLocaleString()}
                </span>
                <span className="text-sm font-medium">
                  עד: ₪{step.to.toLocaleString()}
                </span>
                <span className="text-sm font-medium">
                  שיעור מס: {(step.rate * 100).toFixed(1)}%
                </span>
                <span className="text-sm font-bold">
                  תשלום: ₪{Math.round(step.amount).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="mt-4 flex flex-col items-center gap-1 border-t border-[var(--hm-gold-100)] pt-3">
              <span className="text-[12px] font-semibold tracking-[0.14em] text-[var(--hm-ink-faint)]">
                סך הכל מס רכישה
              </span>
              <span className="hm-figure text-2xl">
                <HmFigure value={totalTax ?? 0} />
              </span>
            </div>
          </div>
        </HmReveal>
      </div>

      <div className="hm-device-shade" />
    </div>

    {/* בסיס / שולחן */}
    <div className="hm-device-base absolute -bottom-4.5 left-1/2 -translate-x-1/2 w-full h-2.5 rounded-b-xl shadow-md"></div>

    {/* צל רך מתחת */}
    <div className="absolute -bottom-7.5 left-1/2 -translate-x-1/2 w-[85%] h-5 bg-black/20 blur-2xl rounded-full"></div>
  </div>
</div>




  );
};

export default PurchaseTaxForm;









