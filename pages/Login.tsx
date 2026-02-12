import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, User as UserIcon, AlertCircle, Database, Shield } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onForgotPassword }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(true);
  
  // Setup States
  const [setupRequired, setSetupRequired] = useState<'none' | 'create-admin' | 'db-error'>('none');
  const [dbErrorMessage, setDbErrorMessage] = useState('');
  
  // Create Admin Form State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
      setIsCheckingSystem(true);
      try {
          const hasUsers = await storageService.hasUsers();
          if (!hasUsers) {
              setSetupRequired('create-admin');
          } else {
              setSetupRequired('none');
          }
      } catch (e: any) {
          console.error("System Check Error:", e);
          if (e.message && (e.message.includes('relation') || e.message.includes('does not exist'))) {
             setSetupRequired('db-error');
             setDbErrorMessage("Database tables not found. Please run the setup SQL.");
          } else {
             // If other error, just show login but it might fail
             setSetupRequired('none');
          }
      } finally {
          setIsCheckingSystem(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const users = await storageService.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            onLoginSuccess(user);
        } else {
            setError('Invalid username or password. Please try again.');
        }
    } catch (e) {
        setError('Login failed. Unable to connect to server.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newAdminUser || !newAdminPass || !newAdminName) return;
      
      setIsLoading(true);
      try {
          const adminUser: User = {
              id: '', // DB generates this
              username: newAdminUser,
              password: newAdminPass,
              fullName: newAdminName,
              role: 'admin'
          };
          
          await storageService.createUser(adminUser);
          
          // Auto login after creation
          const users = await storageService.getUsers();
          const created = users.find(u => u.username === newAdminUser);
          if (created) {
              onLoginSuccess(created);
          } else {
              // Fallback to login screen
              setSetupRequired('none');
              setUsername(newAdminUser);
              setError("Admin created. Please sign in.");
          }
      } catch (e: any) {
          setError("Failed to create admin: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  if (isCheckingSystem) {
      return <div className="min-h-screen flex items-center justify-center bg-blue-50 text-gray-500">Checking System Status...</div>;
  }

  // --- DATABASE ERROR / SETUP VIEW ---
  if (setupRequired === 'db-error') {
      return (
        <div className="min-h-screen bg-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-red-200">
                    <div className="flex items-center justify-center mb-4">
                        <Database className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">Database Setup Required</h2>
                    <p className="text-center text-gray-600 mb-6">
                        The required tables were not found in your Supabase project.
                    </p>
                    
                    <div className="bg-gray-800 rounded-md p-4 overflow-x-auto mb-6">
                        <code className="text-sm text-green-400 whitespace-pre">
{`-- Run this SQL in your Supabase SQL Editor

create table users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  full_name text,
  role text check (role in ('admin', 'user', 'mamdhoob'))
);

create table voters (
  id uuid default gen_random_uuid() primary key,
  id_card_number text unique,
  full_name text,
  address text,
  island text,
  phone_number text,
  has_voted boolean default false,
  registrar_party text,
  sheema boolean default false,
  sadiq boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table islands (
  id uuid default gen_random_uuid() primary key,
  name text unique not null
);

create table parties (
  id uuid default gen_random_uuid() primary key,
  name text unique not null
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  user_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Basic Policies (Adjust for production)
alter table users enable row level security;
alter table voters enable row level security;
alter table islands enable row level security;
alter table parties enable row level security;
alter table messages enable row level security;

create policy "Public Access" on users for all using (true) with check (true);
create policy "Public Access" on voters for all using (true) with check (true);
create policy "Public Access" on islands for all using (true) with check (true);
create policy "Public Access" on parties for all using (true) with check (true);
create policy "Public Access" on messages for all using (true) with check (true);`}
                        </code>
                    </div>
                    <div className="text-center">
                        <Button onClick={() => window.location.reload()}>I've ran the SQL, Retry Connection</Button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- CREATE ADMIN VIEW ---
  if (setupRequired === 'create-admin') {
    return (
        <div className="min-h-screen bg-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Welcome to N.Kudafari
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    System initialized. Please create your admin account.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleCreateAdmin}>
                         {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="text-sm text-red-700">{error}</div>
                            </div>
                         )}
                        <Input 
                            label="Full Name"
                            value={newAdminName}
                            onChange={e => setNewAdminName(e.target.value)}
                            placeholder="System Administrator"
                            required
                        />
                        <Input 
                            label="Username"
                            value={newAdminUser}
                            onChange={e => setNewAdminUser(e.target.value)}
                            placeholder="admin"
                            required
                        />
                        <Input 
                            label="Password"
                            type="password"
                            value={newAdminPass}
                            onChange={e => setNewAdminPass(e.target.value)}
                            placeholder="Secure password"
                            required
                        />
                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Create Admin Account
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
  }

  // --- NORMAL LOGIN VIEW ---
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          N.Kudafari Council Election 2026
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    {/* Fallback link in case setup check missed something or user wants to register */}
                    <button 
                        type="button"
                        onClick={() => setSetupRequired('create-admin')}
                        className="text-xs text-red-600 underline mt-1 hover:text-red-800"
                    >
                        Create Admin Account?
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Input
                label="Username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                icon={<UserIcon className="h-5 w-5 text-gray-400" />}
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </div>
          </form>
        </div>
        
        <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 font-medium">Create By ffflllaxss</p>
        </div>
      </div>
    </div>
  );
};