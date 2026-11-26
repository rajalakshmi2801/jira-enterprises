const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];

  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }

  return parts.join(" ");
}

/** Indian numbering (Crore / Lakh / Thousand). */
function integerToWords(n: number): string {
  if (n === 0) return "Zero";

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));

  return parts.join(" ");
}

/** 17022.63 -> "Seventeen Thousand Twenty-Two Rupees and Sixty-Three Paise Only" */
export function amountInWords(amount: number) {
  const value = Math.max(0, Math.round((Number(amount) + Number.EPSILON) * 100));
  const rupees = Math.floor(value / 100);
  const paise = value % 100;

  let text = `${integerToWords(rupees)} Rupees`;

  if (paise > 0) {
    text += ` and ${integerToWords(paise)} Paise`;
  }

  return `${text} Only`;
}
