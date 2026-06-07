export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Rings */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-purple-500 border-b-transparent animate-[spin_1.5s_linear_infinite_reverse]" />
        </div>
        
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
