import MaintainerSidebar from '@/components/layout/MaintainerSidebar'

export default function MaintainerLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#060611]">
      <MaintainerSidebar />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  )
}
