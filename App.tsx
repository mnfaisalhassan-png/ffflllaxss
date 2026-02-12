import React, { useState, useEffect } from 'react';
import { storageService } from './services/storage';
import { User, PageView } from './types';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { VotingStatus } from './pages/VotingStatus';
import { Layout } from './components/Layout';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Lock } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageView>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [targetVoterId, setTargetVoterId] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
        // Init storage/db connection if needed
        await storageService.init();

        // Check for existing session (local storage)
        const storedUser = storageService.getCurrentUser();
        if (storedUser) {
            setUser(storedUser);
            setCurrentPage('voting-status');
        }
        setIsLoading(false);
    };
    initApp();
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    storageService.setCurrentUser(loggedInUser);
    setCurrentPage('voting-status');
  };

  const handleLogout = () => {
    setUser(null);
    storageService.setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleUpdateProfile = async (newPassword: string, newName: string) => {
    if (!user) return;
    
    try {
        const updatedUser = { ...user, fullName: newName, password: newPassword };
        
        // Update in DB
        await storageService.updateUser(updatedUser);
        
        // Update local state
        setUser(updatedUser);
        storageService.setCurrentUser(updatedUser);
        
        alert("Profile updated successfully!");
    } catch (e) {
        alert("Failed to update profile: " + (e as Error).message);
    }
  };

  const handleVoterClick = (voterId: string) => {
      setTargetVoterId(voterId);
      setCurrentPage('dashboard');
  };

  // Simple Page Router
  const renderContent = () => {
    if (currentPage === 'dashboard') {
      return (
        <Dashboard 
            currentUser={user!} 
            initialVoterId={targetVoterId}
            onClearInitialVoter={() => setTargetVoterId(null)}
        />
      );
    }
    if (currentPage === 'voting-status') {
      return <VotingStatus onVoterClick={handleVoterClick} />;
    }
    if (currentPage === 'admin-panel') {
      if (user?.role !== 'admin') {
         // Redirect unauthorized
         return <div className="text-center p-10">Access Denied</div>;
      }
      return <AdminPanel />;
    }
    if (currentPage === 'profile') {
      return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
           <div className="text-center mb-6">
              <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                 <Lock className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
           </div>
           
           <ProfileForm 
             user={user!} 
             onUpdate={handleUpdateProfile} 
           />
        </div>
      );
    }
    return <div>Page not found</div>;
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || currentPage === 'login') {
    return (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          onForgotPassword={() => setCurrentPage('forgot-password')} 
        />
    );
  }

  if (currentPage === 'forgot-password') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow">
                <h2 className="text-center text-3xl font-extrabold text-gray-900">Forgot Password</h2>
                <p className="text-center text-gray-500">
                    Contact your system administrator (Admin Panel) to reset your password.
                </p>
                <Button onClick={() => setCurrentPage('login')} className="w-full">
                    Back to Login
                </Button>
            </div>
        </div>
    );
  }

  return (
    <Layout 
      user={user} 
      activePage={currentPage} 
      onNavigate={setCurrentPage} 
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

// Internal Profile Form Component
const ProfileForm = ({ user, onUpdate }: { user: User, onUpdate: (p: string, n: string) => void }) => {
    const [name, setName] = useState(user.fullName);
    const [pass, setPass] = useState(user.password || '');
    
    return (
        <div className="space-y-4">
            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="New Password" value={pass} onChange={e => setPass(e.target.value)} />
            <Button onClick={() => onUpdate(pass, name)} className="w-full">Update Profile</Button>
        </div>
    );
};

export default App;