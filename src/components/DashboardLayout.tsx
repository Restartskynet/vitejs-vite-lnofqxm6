export function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Restart Risk
          </h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {children}
      </main>
    </div>
  );
}