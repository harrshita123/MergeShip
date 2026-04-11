import ContributorSidebar from '@/components/layout/ContributorSidebar'

export default function ContributorLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#060611]">
      <ContributorSidebar />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  )
}
