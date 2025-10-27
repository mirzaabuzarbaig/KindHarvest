import { NavLink } from "react-router-dom";
import { LayoutGrid, MessageSquare, Settings, ClipboardList } from "lucide-react";

export default function DashboardSidebar() {
  const linkBase =
    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors hover:bg-muted/60";
  const active = "bg-primary/10 text-primary";

  return (
    <aside className="hidden lg:flex lg:w-64 shrink-0 p-4">
      <div className="w-full rounded-2xl border bg-card/60 backdrop-blur-sm p-3">
        <nav className="space-y-1">
          <NavLink to="/dashboard" className={({isActive})=>`${linkBase} ${isActive?active:''}`}>
            <LayoutGrid className="w-4 h-4"/> Dashboard
          </NavLink>
          <NavLink to="/messages" className={({isActive})=>`${linkBase} ${isActive?active:''}`}>
            <MessageSquare className="w-4 h-4"/> Messages
          </NavLink>
          <NavLink to="/requests" className={({isActive})=>`${linkBase} ${isActive?active:''}`}>
            <ClipboardList className="w-4 h-4"/> Requests
          </NavLink>
          <NavLink to="/settings" className={({isActive})=>`${linkBase} ${isActive?active:''}`}>
            <Settings className="w-4 h-4"/> Settings
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
