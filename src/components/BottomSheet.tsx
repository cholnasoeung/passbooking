const BottomSheet = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className="fixed inset-x-0 bottom-0 z-[1200] flex justify-center px-4 pb-4 lg:px-0">
    <div
      className={`w-full max-w-6xl rounded-t-3xl bg-white/95 p-4 shadow-2xl backdrop-blur transition-transform duration-200 sm:p-6 ${className ?? ''}`}
      style={{ border: '1px solid rgba(15, 23, 42, 0.12)', minHeight: '60vh' }}
    >
      {children}
    </div>
  </div>
);

export default BottomSheet;
