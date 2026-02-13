import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { 
  ClipboardList, Plus, CheckCircle, Circle, 
  Trash2, User as UserIcon, Calendar, 
  Database, Terminal, AlertTriangle, Shield
} from 'lucide-react';

interface TasksPageProps {
  currentUser: User;
}

export const TasksPage: React.FC<TasksPageProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Error / Setup State
  const [dbError, setDbError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentUser.role === 'admin';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const tasksData = await storageService.getTasks();
      
      // Filter logic: Admins see all, Users see assigned to them
      if (isAdmin) {
          setTasks(tasksData);
      } else {
          setTasks(tasksData.filter(t => t.assignedToUserId === currentUser.id));
      }
      setDbError(false);
    } catch (e: any) {
      console.error("Fetch Tasks Error:", e);
      // Detection for missing table (code 42P01 is Postgres 'undefined_table')
      // Also catch PostgREST schema cache errors
      if (
        e.code === '42P01' || 
        (e.message && (
            e.message.includes('relation "tasks" does not exist') || 
            e.message.includes('Could not find the table') || 
            e.message.includes('schema cache')
        ))
      ) {
          setDbError(true);
      } else {
          setErrorMsg("Failed to load tasks.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Fetch users specifically when opening the modal to ensure dropdown is populated
  useEffect(() => {
    if (isModalOpen && isAdmin) {
      const fetchUsers = async () => {
        try {
          const usersData = await storageService.getUsers();
          setUsers(usersData);
        } catch (error) {
          console.error("Failed to load users for dropdown:", error);
        }
      };
      fetchUsers();
    }
  }, [isModalOpen, isAdmin]);

  const handleCreateTask = async () => {
    // Validation
    setFormError(null);
    if (!newTaskTitle.trim()) {
        setFormError("Task title is required.");
        return;
    }
    if (!assignedUserId) {
        setFormError("Please select a user to assign the task to.");
        return;
    }

    // Safety Check: Ensure current user (creator) exists in the fetched users list
    // This prevents foreign key errors if the local session is stale (DB was reset)
    if (isAdmin && users.length > 0) {
        const me = users.find(u => u.id === currentUser.id);
        if (!me) {
            setFormError("Session Error: Your account ID mismatch. Please Sign Out and Log In again.");
            return;
        }
    }

    try {
      await storageService.createTask({
        title: newTaskTitle,
        description: newTaskDesc || '',
        assignedToUserId: assignedUserId,
        assignedByUserId: currentUser.id
      });
      handleCloseModal();
      fetchData();
    } catch (e: any) {
      console.error("Create Task Error:", e);
      // Show the actual database error if available for better debugging
      const msg = e.message || "Failed to save task.";
      
      // If table is missing or schema issue, trigger db setup view
      if (
        msg.includes('Could not find the table') || 
        msg.includes('schema cache') || 
        msg.includes('relation "tasks" does not exist')
      ) {
          setDbError(true);
          setIsModalOpen(false);
          return;
      }
      
      if (msg.includes('foreign key constraint')) {
         setFormError("Database Error: User ID not found. Try signing out and back in.");
      } else {
         setFormError(msg);
      }
    }
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setFormError(null);
      setAssignedUserId(''); 
  };

  const handleToggleStatus = async (task: Task) => {
    // Only the assigned user can toggle status
    if (task.assignedToUserId !== currentUser.id) return;

    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await storageService.updateTaskStatus(task.id, newStatus);
      
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
      fetchData(); // Revert on error
    }
  };

  const initiateDeleteTask = (taskId: string) => {
    if (!isAdmin) return;
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete || !isAdmin) return;

    try {
      await storageService.deleteTask(taskToDelete);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (e) {
      alert("Failed to delete task");
    }
  };

  // --- ERROR STATE RENDER ---
  if (dbError) {
      return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto p-4 items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-md border border-red-200 max-w-2xl w-full text-center">
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Database className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Task System Unavailable</h2>
                <p className="text-gray-600 mb-6">
                    The <code>tasks</code> table was not found in the database. <br/>
                    Please run the SQL below in your Supabase SQL Editor to initialize it.
                </p>
                
                <div className="bg-gray-800 rounded-md p-4 w-full relative group text-left mb-6">
                    <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center">
                        <Terminal className="w-3 h-3 mr-1" /> SQL
                    </div>
                    <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assigned_to uuid references users(id),
  assigned_by uuid references users(id),
  status text default 'pending',
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Public Access Tasks" on tasks for all using (true) with check (true);

-- If you still see the error, try reloading the Supabase schema cache
-- by going to Project Settings > API > Reload Schema.`}
                    </code>
                </div>
                
                <Button onClick={() => fetchData()}>
                    I've ran the SQL, Retry Connection
                </Button>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-3 h-6 w-6 text-primary-600"/>
            Task Management
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? "Assign and track tasks for election staff." : "View and complete your assigned tasks."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                    <ClipboardList className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
                <p className="text-gray-500 mt-1">
                    {isAdmin ? "Get started by creating a new task." : "You have no pending tasks."}
                </p>
            </div>
        ) : (
            <div className="divide-y divide-gray-200">
                {tasks.map(task => {
                    const isAssignedToMe = task.assignedToUserId === currentUser.id;
                    return (
                        <div key={task.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group">
                            <div className="flex items-start space-x-4 flex-1">
                                <button 
                                    onClick={() => handleToggleStatus(task)}
                                    disabled={!isAssignedToMe}
                                    title={!isAssignedToMe ? "Only the assigned member can complete this task" : "Toggle status"}
                                    className={`flex-shrink-0 mt-1 transition-colors ${
                                        !isAssignedToMe ? 'opacity-40 cursor-not-allowed' : 'hover:text-primary-500'
                                    } ${
                                        task.status === 'completed' 
                                        ? 'text-green-500 hover:text-green-600' 
                                        : 'text-gray-300'
                                    }`}
                                >
                                    {task.status === 'completed' ? (
                                        <CheckCircle className="h-6 w-6" />
                                    ) : (
                                        <Circle className="h-6 w-6" />
                                    )}
                                </button>
                                <div>
                                    <h3 className={`text-lg font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                        {task.title}
                                    </h3>
                                    {task.description && (
                                        <p className="text-gray-500 text-sm mt-1">{task.description}</p>
                                    )}
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                        <span className="flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </span>
                                        {isAdmin && (
                                            <span className="flex items-center bg-gray-100 px-2 py-0.5 rounded-full">
                                                <UserIcon className="h-3 w-3 mr-1" />
                                                Assigned to: <span className="font-medium ml-1 text-gray-600">{task.assignedToName || 'Unknown'}</span>
                                            </span>
                                        )}
                                        {!isAdmin && task.assignedByName && (
                                             <span className="flex items-center">
                                                By: {task.assignedByName}
                                             </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pl-10 sm:pl-0">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                    task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {task.status}
                                </span>
                                {isAdmin && (
                                    <button 
                                        onClick={() => initiateDeleteTask(task.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Task"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Task"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleCreateTask}>Assign Task</Button>
          </>
        }
      >
        <div className="space-y-4">
            {formError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{formError}</p>
                        </div>
                    </div>
                </div>
            )}
            <Input 
                label="Task Title"
                placeholder="e.g. Verify ID cards for Block A"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                autoFocus
                error={formError && !newTaskTitle ? "Title is required" : undefined}
            />
            <TextArea 
                label="Description"
                placeholder="Add specific instructions..."
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select 
                    className={`block w-full border-2 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm bg-white text-gray-900 ${
                        !assignedUserId && formError 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-black focus:ring-primary-500 focus:border-primary-500'
                    }`}
                    value={assignedUserId}
                    onChange={e => {
                        setAssignedUserId(e.target.value);
                        if(e.target.value) setFormError(null);
                    }}
                >
                    <option value="">Select a team member...</option>
                    {users.length === 0 ? (
                        <option disabled>Loading users or no users found...</option>
                    ) : (
                        users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.fullName} ({u.role})
                            </option>
                        ))
                    )}
                </select>
                {!assignedUserId && formError && <p className="mt-1 text-sm text-red-600">Please select a user</p>}
            </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
            <>
                <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDeleteTask}>Delete Task</Button>
            </>
        }
      >
          <div className="flex items-start">
             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <Trash2 className="h-6 w-6 text-red-600" />
             </div>
             <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Delete this task?
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this task? This action cannot be undone.
                  </p>
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                     <div className="flex">
                        <Shield className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                        <span className="text-xs text-yellow-800 font-medium pt-0.5">
                            Only administrators have the right to delete tasks.
                        </span>
                     </div>
                  </div>
                </div>
             </div>
          </div>
      </Modal>
    </div>
  );
};