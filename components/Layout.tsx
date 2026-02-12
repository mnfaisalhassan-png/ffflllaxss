import React from 'react';
import { 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  ShieldCheck, 
  FileText,
  User as UserIcon,
  BarChart3
} from 'lucide-react';
import { User, PageView } from '../types';

interface LayoutProps {
  user: User;
  activePage: PageView;
  onNavigate: (page: PageView) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  user, 
  activePage, 
  onNavigate, 
  onLogout, 
  children 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ page, icon: Icon, label }: { page: PageView; icon: any; label: string }) => {
    const isActive = activePage === page;
    return (
      <button
        onClick={() => {
            onNavigate(page);
            setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors rounded-md mb-1
          ${isActive 
            ? 'bg-primary-50 text-primary-700' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
      >
        <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 bg-white">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
             <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <FileText className="h-5 w-5 text-white" />
             </div>
             <span className="text-xl font-bold text-gray-900">VoteFlow</span>
          </div>
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <NavItem page="dashboard" icon={Users} label="Voting Registration" />
            <NavItem page="voting-status" icon={BarChart3} label="Voting Status" />
            <NavItem page="profile" icon={UserIcon} label="My Profile" />
            {user.role === 'admin' && (
              <NavItem page="admin-panel" icon={ShieldCheck} label="Admin Panel" />
            )}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center w-full">
            <div className="flex-shrink-0">
               <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                 {user.username.charAt(0).toUpperCase()}
               </div>
            </div>
            <div className="ml-3 w-full">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {user.fullName}
              </p>
              <button 
                onClick={onLogout}
                className="text-xs font-medium text-gray-500 hover:text-red-600 flex items-center mt-1"
              >
                <LogOut className="h-3 w-3 mr-1" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
        <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2">
                <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">VoteFlow</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="pt-5 pb-4 px-4">
              <div className="flex-shrink-0 flex items-center mb-6">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">VoteFlow</span>
              </div>
              <nav className="space-y-1">
                <NavItem page="dashboard" icon={Users} label="Voting Registration" />
                <NavItem page="voting-status" icon={BarChart3} label="Voting Status" />
                <NavItem page="profile" icon={UserIcon} label="My Profile" />
                {user.role === 'admin' && (
                  <NavItem page="admin-panel" icon={ShieldCheck} label="Admin Panel" />
                )}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md mt-4"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign out
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:pl-64 w-full">
         <div className="md:hidden h-16 w-full flex-shrink-0"></div> {/* Spacer for mobile header */}
         <main className="flex-1 py-6 px-4 sm:px-8 overflow-y-auto">
            {children}
         </main>
      </div>
    </div>
  );
};