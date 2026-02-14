import { createClient } from '@supabase/supabase-js';
import { STORAGE_KEYS, ISLANDS, DEFAULT_PARTIES, ADMIN_CREDENTIALS } from '../constants';
import { User, VoterRecord, ChatMessage, Task } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://hrvljfayyfmvoywiklgk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pHHH2IhQUDUwVwmV7D4Ujw_Q6_O-dd6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const storageService = {
  // --- SESSION MANAGEMENT (Local Storage) ---
  
  init: async () => {
    console.log("Supabase Service Initialized");
    // We defer setup checks to the Login component to provide UI feedback
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  // --- SYSTEM CHECKS ---

  hasUsers: async (): Promise<boolean> => {
    // Check if users table exists and has data
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error; // Will throw if table missing
    return (count || 0) > 0;
  },

  // --- USERS (Supabase) ---

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data.map((u: any) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      fullName: u.full_name,
      role: u.role,
      email: u.email
    }));
  },

  createUser: async (user: User) => {
    const { error } = await supabase.from('users').insert([{
      username: user.username,
      password: user.password,
      full_name: user.fullName,
      role: user.role
    }]);
    if (error) throw error;
  },

  updateUser: async (user: User) => {
    const { error } = await supabase.from('users').update({
      username: user.username,
      password: user.password,
      full_name: user.fullName,
      role: user.role
    }).eq('id', user.id);
    if (error) throw error;
  },

  deleteUser: async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // --- VOTERS (Supabase) ---

  getVoters: async (): Promise<VoterRecord[]> => {
    const { data, error } = await supabase.from('voters').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching voters:', error);
      return [];
    }
    return data.map((v: any) => ({
      id: v.id,
      idCardNumber: v.id_card_number,
      fullName: v.full_name,
      gender: v.gender,
      address: v.address,
      island: v.island,
      phoneNumber: v.phone_number,
      hasVoted: v.has_voted,
      registrarParty: v.registrar_party,
      sheema: v.sheema,
      sadiq: v.sadiq,
      communicated: v.communicated,
      notes: v.notes,
      createdAt: new Date(v.created_at).getTime(),
      updatedAt: v.updated_at ? new Date(v.updated_at).getTime() : Date.now()
    }));
  },

  createVoter: async (voter: VoterRecord) => {
    const { error } = await supabase.from('voters').insert([{
      id_card_number: voter.idCardNumber,
      full_name: voter.fullName,
      gender: voter.gender,
      address: voter.address,
      island: voter.island,
      phone_number: voter.phoneNumber,
      has_voted: voter.hasVoted,
      registrar_party: voter.registrarParty,
      sheema: voter.sheema,
      sadiq: voter.sadiq,
      communicated: voter.communicated,
      notes: voter.notes,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  },

  updateVoter: async (voter: VoterRecord) => {
    const { error } = await supabase.from('voters').update({
      id_card_number: voter.idCardNumber,
      full_name: voter.fullName,
      gender: voter.gender,
      address: voter.address,
      island: voter.island,
      phone_number: voter.phoneNumber,
      has_voted: voter.hasVoted,
      registrar_party: voter.registrarParty,
      sheema: voter.sheema,
      sadiq: voter.sadiq,
      communicated: voter.communicated,
      notes: voter.notes,
      updated_at: new Date().toISOString()
    }).eq('id', voter.id);
    if (error) throw error;
  },

  deleteVoter: async (id: string) => {
    const { error } = await supabase.from('voters').delete().eq('id', id);
    if (error) throw error;
  },

  // --- SETTINGS: ISLANDS & PARTIES (Supabase) ---

  getIslands: async (): Promise<string[]> => {
    const { data, error } = await supabase.from('islands').select('name').order('name');
    if (error || !data) return ISLANDS;
    if (data.length === 0) return ISLANDS;
    return data.map((i: any) => i.name);
  },

  addIsland: async (name: string) => {
    const { error } = await supabase.from('islands').insert([{ name }]);
    if (error) throw error;
  },

  deleteIsland: async (name: string) => {
    const { error } = await supabase.from('islands').delete().eq('name', name);
    if (error) throw error;
  },

  getParties: async (): Promise<string[]> => {
    const { data, error } = await supabase.from('parties').select('name').order('name');
    if (error || !data) return DEFAULT_PARTIES;
    if (data.length === 0) return DEFAULT_PARTIES;
    return data.map((p: any) => p.name);
  },

  addParty: async (name: string) => {
    const { error } = await supabase.from('parties').insert([{ name }]);
    if (error) throw error;
  },

  deleteParty: async (name: string) => {
    const { error } = await supabase.from('parties').delete().eq('name', name);
    if (error) throw error;
  },

  // --- SETTINGS: ELECTION CONFIG ---

  getElectionSettings: async (): Promise<{ electionStart: number, electionEnd: number }> => {
    const { data, error } = await supabase.from('settings').select('*');
    
    // Default: April 4th, 2026, 8:00 AM - 4:00 PM
    const defaults = {
        electionStart: new Date('2026-04-04T08:00:00').getTime(),
        electionEnd: new Date('2026-04-04T16:00:00').getTime()
    };

    if (error || !data) return defaults;

    const startRow = data.find((r: any) => r.key === 'election_start');
    const endRow = data.find((r: any) => r.key === 'election_end');

    return {
        electionStart: startRow ? parseInt(startRow.value) : defaults.electionStart,
        electionEnd: endRow ? parseInt(endRow.value) : defaults.electionEnd
    };
  },

  updateElectionSettings: async (start: number, end: number) => {
    const { error } = await supabase.from('settings').upsert([
        { key: 'election_start', value: start.toString() },
        { key: 'election_end', value: end.toString() }
    ], { onConflict: 'key' });
    
    if (error) throw error;
  },

  // --- CHAT MESSAGES (Supabase) ---
  
  getMessages: async (limit = 50): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    if (!data) return [];

    return data.reverse().map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      userName: m.user_name,
      content: m.content,
      createdAt: new Date(m.created_at).getTime()
    }));
  },

  sendMessage: async (userId: string, userName: string, content: string) => {
    const { error } = await supabase.from('messages').insert([{
      user_id: userId,
      user_name: userName,
      content: content,
      created_at: new Date().toISOString()
    }]);
    
    if (error) throw error;
  },

  deleteMessage: async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
  },

  // --- TASKS (Supabase) ---

  getTasks: async (): Promise<Task[]> => {
    // We join with users to get the assigned_to name easily
    // Note: Supabase automatically handles foreign key joins if relationships are set up, 
    // but here we might just fetch raw and map IDs if we don't want to complexify the join query.
    // For simplicity, we fetch tasks and rely on manual mapping or a simple join if column names match.
    
    // Using a simple fetch and we will map user names in the component or via a simple join syntax:
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(full_name),
        assigned_by_user:users!tasks_assigned_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedToUserId: t.assigned_to,
      assignedByUserId: t.assigned_by,
      status: t.status,
      createdAt: new Date(t.created_at).getTime(),
      assignedToName: t.assigned_to_user?.full_name,
      assignedByName: t.assigned_by_user?.full_name
    }));
  },

  createTask: async (task: Partial<Task>) => {
    const { error } = await supabase.from('tasks').insert([{
      title: task.title,
      description: task.description,
      assigned_to: task.assignedToUserId,
      assigned_by: task.assignedByUserId,
      status: 'pending',
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  },

  updateTaskStatus: async (taskId: string, status: 'pending' | 'completed') => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (error) throw error;
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  }
};