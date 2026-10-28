/** AU mobile for display: "+61450088728" / "0450088728" → "0450 088 728". Unknown shapes pass through. */
export const formatPhone = (raw) => {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  return /^04\d{8}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : String(raw);
};
