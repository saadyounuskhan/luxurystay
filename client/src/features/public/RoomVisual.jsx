// Placeholder room art (CSS only). Replace with real photos later: <img src={type.images[0].url} />
const PALETTE = {
  standard: ['#EFE6D2', '#D9C9A3'],
  deluxe: ['#E6DCC6', '#C9A24D'],
  executive: ['#DCD6CA', '#8A6A1F'],
  presidential: ['#1B2440', '#C9A24D'],
};

export default function RoomVisual({ slug, tall = false }) {
  const [bg, accent] = PALETTE[slug] || PALETTE.standard;
  const dark = slug === 'presidential';
  return (
    <div className={`relative ${tall ? 'h-80' : 'h-44'} overflow-hidden`} style={{ background: bg }} aria-hidden="true">
      <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: dark ? '#141B2D' : '#F7F3EA', opacity: 0.6 }} />
      <div className="absolute bottom-[22%] left-[18%] h-[26%] w-[64%] rounded-t-xl" style={{ background: dark ? '#2A3350' : '#FFFFFF' }} />
      <div className="absolute bottom-[44%] left-[22%] h-[10%] w-[24%] rounded-md" style={{ background: accent, opacity: 0.8 }} />
      <div className="absolute bottom-[44%] right-[22%] h-[10%] w-[24%] rounded-md" style={{ background: accent, opacity: 0.8 }} />
      <div className="absolute right-[8%] top-[12%] h-[34%] w-[20%] rounded-md border-4" style={{ borderColor: accent, background: dark ? '#0F1524' : '#DCE6F0' }} />
      <div className="absolute left-[8%] top-[10%] h-3 w-16 rounded-full" style={{ background: accent }} />
    </div>
  );
}
