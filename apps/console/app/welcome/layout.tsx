import { SidebarProvider, SidebarTrigger } from "@standardproject/ui/components/sidebar"
import { AppSidebar } from "./app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        
        {children}
      </main>
    </SidebarProvider>
  )
}
