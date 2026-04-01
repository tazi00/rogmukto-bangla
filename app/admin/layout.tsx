import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <AdminSidebar />
      <div className="main-content">{children}</div>
    </div>
  )
}
