
import { Link, useNavigate } from 'react-router-dom';
import { removeAuthToken } from '../api';
import { Button } from './Button';

export function TopNav() {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-canvas border-b border-hairline flex items-center justify-center">
      <div className="w-full max-w-[1200px] px-lg flex items-center justify-between">
        <div className="flex items-center gap-xl">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
              C
            </div>
            <span className="text-display-sm text-ink text-xl">Cal.com</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-lg">
            <Link to="/dashboard" className="text-nav-link text-ink hover:text-muted">Dashboard</Link>
            <span className="text-nav-link text-muted cursor-not-allowed">Events</span>
            <span className="text-nav-link text-muted cursor-not-allowed">Members</span>
          </nav>
        </div>

        <div className="flex items-center gap-md">
          <div className="w-9 h-9 rounded-full bg-badge-orange flex items-center justify-center text-white font-medium text-sm">
            U
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
