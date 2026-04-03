const promotions = [
  {
    id: 'promo-1',
    badge: 'Promotion',
    title: 'Get កក់ 5,000៛ back with every ride',
    description: 'Valid on Tuk Tuk and Moto bookings this weekend only',
    label: 'PassApp'
  },
  {
    id: 'promo-2',
    badge: 'Special Offer',
    title: '5% off R&F City Phnom Penh rides',
    description: 'Apply code RF5 and travel with comfort in Classic cars',
    label: 'R&F City Promo'
  }
];

const quickActions = [
  { label: 'Rormork', icon: '🛺' },
  { label: 'Rickshaw', icon: '🛞' },
  { label: 'Classic', icon: '🚘' },
  { label: 'SUV', icon: '🚙' }
];

const HomePromoPanel = () => (
  <div className="space-y-5">
    <div className="rounded-[40px] bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-[0_20px_60px_rgba(244,114,182,0.25)]">
      <p className="text-sm uppercase tracking-[0.4em] text-white/70">Simple to use App</p>
      <h2 className="mt-2 text-3xl font-semibold">And Enjoy More Promotion.</h2>
      <div className="mt-6 rounded-[18px] bg-white/20 p-4 shadow-inner shadow-black/10">
        <div className="rounded-2xl border border-white/30 bg-white/80 p-4 text-sm text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-600">PassApp</span>
            <span className="text-xs text-slate-600">Live</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-black">តម្លៃពិសេស 5000៛ បញ្ចុះគ្រប់ដំណើរខ្លះៗ</p>
          <p className="mt-1 text-xs text-slate-600">រយៈពេល 29 មីនា - 1 មេសា 2026</p>
        </div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      {promotions.map((promo) => (
        <div
          key={promo.id}
          className="rounded-3xl border border-slate-100 bg-white p-4 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
            {promo.badge}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{promo.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{promo.description}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {promo.label}
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Special Offer</p>
          <p className="text-sm text-slate-400">Book now and enjoy time-limited pricing</p>
        </div>
        <span className="text-xs font-semibold text-emerald-500">New</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <div
            key={action.label}
            className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-600 shadow-sm"
          >
            <span className="text-2xl">{action.icon}</span>
            {action.label}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default HomePromoPanel;
