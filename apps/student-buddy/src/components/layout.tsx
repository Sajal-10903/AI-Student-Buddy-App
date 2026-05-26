import { Link, useLocation } from "wouter";
import { LayoutDashboard, BrainCircuit, History, LogOut, Menu, X, Sparkles, BookOpenCheck, FolderOpen } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quiz/generate", label: "Generate Quiz", icon: Sparkles },
  { href: "/pdf/learning", label: "PDF Learning", icon: BookOpenCheck },
  { href: "/pdf/history", label: "PDF History", icon: FolderOpen },
  { href: "/profile", label: "History & Profile", icon: History },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const [location] = useLocation();
  const isActive = location === href || location.startsWith(href + "/");

  return (
    <Link href={href} className={cn(
      "flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
      isActive
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    )}>
      <Icon className={cn("w-5 h-5 mr-3 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-sidebar-foreground/50")} />
      {label}
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 flex items-center px-8 border-b border-sidebar-border">
          <BrainCircuit className="w-8 h-8 text-primary mr-3" />
          <span className="font-display font-bold text-2xl text-sidebar-foreground tracking-tight">AI Student Buddy</span>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-sidebar-accent/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground truncate">{user?.name || "Student"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-xl font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <BrainCircuit className="w-6 h-6 text-primary mr-2" />
            <span className="font-display font-bold text-xl">AI Student Buddy</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-[#f8fafc]">
          {children}
        </div>
      </main>
    </div>
  );
}
