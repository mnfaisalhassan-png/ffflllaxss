import { createClient } from '@supabase/supabase-js';
import { STORAGE_KEYS, ISLANDS, DEFAULT_PARTIES, ADMIN_CREDENTIALS } from '../constants';
import { User, VoterRecord } from '../types';

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
      address: v.address,
      island: v.island,
      phoneNumber: v.phone_number,
      hasVoted: v.has_voted,
      registrarParty: v.registrar_party,
      sheema: v.sheema,
      sadiq: v.sadiq,
      createdAt: new Date(v.created_at).getTime(),
      updatedAt: v.updated_at ? new Date(v.updated_at).getTime() : Date.now()
    }));
  },

  createVoter: async (voter: VoterRecord) => {
    const { error } = await supabase.from('voters').insert([{
      id_card_number: voter.idCardNumber,
      full_name: voter.fullName,
      address: voter.address,
      island: voter.island,
      phone_number: voter.phoneNumber,
      has_voted: voter.hasVoted,
      registrar_party: voter.registrarParty,
      sheema: voter.sheema,
      sadiq: voter.sadiq,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  },

  updateVoter: async (voter: VoterRecord) => {
    const { error } = await supabase.from('voters').update({
      id_card_number: voter.idCardNumber,
      full_name: voter.fullName,
      address: voter.address,
      island: voter.island,
      phone_number: voter.phoneNumber,
      has_voted: voter.hasVoted,
      registrar_party: voter.registrarParty,
      sheema: voter.sheema,
      sadiq: voter.sadiq,
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
  }
};