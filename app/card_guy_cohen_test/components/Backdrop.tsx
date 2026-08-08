/** The desk the card lies on: warm stock, a wash of gold light, paper fibre. */
export function Backdrop() {
  return (
    <div aria-hidden className="glc-desk glc-grain-desk pointer-events-none fixed inset-0">
      <div className="glc-desk-light absolute inset-0" />
      {/* vignette: keeps the eye on the card instead of the edges */}
      <div className="glc-vignette absolute inset-0" />
    </div>
  );
}
