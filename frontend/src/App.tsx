import { MessagesPage } from '@/pages/MessagesPage'

export function App() {
  if (window.location.pathname === '/messages') return <MessagesPage />

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f8f7] px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Homebound</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Find your new best friend.</h1>
      </div>
    </main>
  )
}
