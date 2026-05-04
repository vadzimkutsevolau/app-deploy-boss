import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Compass, LayoutDashboard, LogOut, Ticket, User2 } from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
            G
          </div>
          <span className="font-display text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Gather
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/explore">
            <Button variant="ghost" size="sm" className="gap-2">
              <Compass className="size-4" />
              <span className="hidden sm:inline">Explore</span>
            </Button>
          </Link>
          {user ? (
            <>
              <Link to="/tickets">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Ticket className="size-4" />
                  <span className="hidden sm:inline">Tickets</span>
                </Button>
              </Link>
              <Link to="/my-events">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Calendar className="size-4" />
                  <span className="hidden sm:inline">My Events</span>
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="size-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User2 className="size-4" />
                    <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/host/new">Become a host</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="size-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ redirect: undefined }}>
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth" search={{ redirect: undefined, mode: "signup" }}>
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground flex items-center justify-between">
        <span>© Gather — community events, simplified.</span>
        <Link to="/explore" className="hover:text-foreground">Explore events</Link>
      </div>
    </footer>
  );
}