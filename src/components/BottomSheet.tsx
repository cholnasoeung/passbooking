interface BottomSheetProps {
  children: React.ReactNode;
  className?: string;
  /** Pixels from the bottom of the viewport (default 0). Use 68 when a bottom tab bar is present. */
  bottomOffset?: number;
}

const BottomSheet = ({ children, className, bottomOffset = 0 }: BottomSheetProps) => (
  <div
    className="fixed inset-x-0 z-[1200] flex justify-center px-3 lg:px-0"
    style={{ bottom: bottomOffset }}
  >
    <div
      className={`w-full max-w-2xl rounded-t-3xl bg-white/97 shadow-2xl backdrop-blur-sm sm:p-5 p-4 ${className ?? ''}`}
      style={{
        border: '1px solid rgba(15,23,42,0.07)',
        borderBottom: 'none',
        minHeight: '56vh',
      }}
    >
      {children}
    </div>
  </div>
);

export default BottomSheet;
