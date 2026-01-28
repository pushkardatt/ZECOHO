export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`logo font-bold text-xl px-4 py-2 rounded-xl flex items-center ${className}`}>
      <span>ZECOH</span>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-[1em] h-[1em] ml-[0.02em]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    </div>
  );
}

export function LogoText({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center ${className}`}>
      <span>ZECOH</span>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-[1em] h-[1em] ml-[0.02em] inline-block"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}
