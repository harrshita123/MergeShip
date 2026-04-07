export default function Topbar({ title, subtitle, right = null }) {
  return (
    <div className="sticky top-0 z-30 backdrop-blur-md bg-[rgba(6,6,17,0.7)] border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between px-8 py-5">
        <div>
          <h1
            className="text-2xl md:text-[28px] font-bold text-[#F8F8FF] tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[14px] text-[#A0A0C0] mt-1">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="flex items-center gap-3">{right}</div> : null}
      </div>
    </div>
  )
}
