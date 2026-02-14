import React, { useState, useEffect, useMemo } from 'react';
import { User, VoterRecord } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { 
  Search, Plus, Save, Trash2, Edit2, 
  CheckCircle, XCircle, MapPin, Filter, 
  User as UserIcon, AlertTriangle, Flag, 
  CheckSquare, Info, Settings, X, ArrowLeft, ChevronRight,
  ShieldCheck, Eye, Terminal, Database, MessageCircle,
  Download, FileSpreadsheet, Printer
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  initialVoterId?: string | null;
  onClearInitialVoter?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, initialVoterId, onClearInitialVoter }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [islands, setIslands] = useState<string[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'eligible' | 'voted'>('all');
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Form State
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedVoterId, setSelectedVoterId] = useState<string | null>(null);
  
  // Form Fields
  const [idCardNumber, setIdCardNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [island, setIsland] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  
  // New Fields
  const [registrarParty, setRegistrarParty] = useState('');
  const [sheema, setSheema] = useState(false);
  const [sadiq, setSadiq] = useState(false);
  const [communicated, setCommunicated] = useState(false);
  const [notes, setNotes] = useState('');

  // Validation & Modals
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [voterToDeleteId, setVoterToDeleteId] = useState<string | null>(null);

  // Add Island Modal State
  const [isAddIslandModalOpen, setIsAddIslandModalOpen] = useState(false);
  const [newIslandName, setNewIslandName] = useState('');

  // Add Party Modal State
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');

  // Manage List State (Admin Only)
  const [manageTarget, setManageTarget] = useState<'island' | 'party' | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemValue, setEditingItemValue] = useState('');

  // Database Column Error State
  const [showColumnError, setShowColumnError] = useState(false);

  // --- PERMISSIONS LOGIC ---
  const isAdmin = currentUser.role === 'admin';
  const isMamdhoob = currentUser.role === 'mamdhoob';
  const isNormalUser = currentUser.role === 'user';

  // Create: Admin only
  const canCreate = isAdmin;
  
  // Delete: Admin only
  const canDelete = isAdmin;

  // Edit fields: 
  // Details (Name, ID, etc): Admin only
  // Voted Checkbox: Admin OR Mamdhoob
  const canEditDetails = isAdmin;
  const canEditVoted = isAdmin || isMamdhoob;
  const isReadOnlyMode = isNormalUser; // Users can't save anything

  // Load Data
  const refreshData = async () => {
    setIsLoading(true);
    try {
        const [v, i, p] = await Promise.all([
            storageService.getVoters(),
            storageService.getIslands(),
            storageService.getParties()
        ]);
        setVoters(v);
        setIslands(i);
        setParties(p);
        
        // Set defaults if lists are empty but we have data
        if (i.length > 0 && !island) setIsland(i[0]);
        if (p.length > 0 && !registrarParty) setRegistrarParty(p[0]);
        
    } catch (e) {
        console.error(e);
        setNotification({ msg: 'Failed to load data from server.', type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Handle Initial Voter Deep Link
  useEffect(() => {
    if (initialVoterId && voters.length > 0) {
        const targetVoter = voters.find(v => v.id === initialVoterId);
        if (targetVoter) {
            handleSelectVoter(targetVoter);
            if (onClearInitialVoter) onClearInitialVoter();
        }
    }
  }, [initialVoterId, voters]);

  // Filtered List
  const filteredVoters = useMemo(() => {
    return voters.filter(v => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        v.fullName.toLowerCase().includes(query) || 
        v.idCardNumber.toLowerCase().includes(query) ||
        v.island.toLowerCase().includes(query) ||
        (v.address && v.address.toLowerCase().includes(query));
      
      const matchesFilter = 
        filterStatus === 'all' ? true :
        filterStatus === 'voted' ? v.hasVoted :
        !v.hasVoted;

      return matchesSearch && matchesFilter;
    });
  }, [voters, searchQuery, filterStatus]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['ID Card', 'Full Name', 'Gender', 'Address', 'Island', 'Phone', 'Party', 'Status', 'Sheema', 'Sadiq', 'Communicated', 'Notes'];
    const csvContent = [
        headers.join(','),
        ...filteredVoters.map(v => [
            `"${v.idCardNumber}"`,
            `"${v.fullName}"`,
            `"${v.gender || ''}"`,
            `"${v.address}"`,
            `"${v.island}"`,
            `"${v.phoneNumber || ''}"`,
            `"${v.registrarParty || ''}"`,
            `"${v.hasVoted ? 'Voted' : 'Eligible'}"`,
            `"${v.sheema ? 'Yes' : 'No'}"`,
            `"${v.sadiq ? 'Yes' : 'No'}"`,
            `"${v.communicated ? 'Yes' : 'No'}"`,
            `"${(v.notes || '').replace(/"/g, '""')}"` // Escape quotes
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `voters_list_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Export PDF/Print Handler
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print the list.");
        return;
    }

    const tableRows = filteredVoters.map(v => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${v.idCardNumber}</td>
            <td style="padding: 8px;">${v.fullName}</td>
            <td style="padding: 8px;">${v.gender || '-'}</td>
            <td style="padding: 8px;">${v.island}</td>
            <td style="padding: 8px;">${v.address}</td>
            <td style="padding: 8px;">${v.phoneNumber || '-'}</td>
            <td style="padding: 8px;">${v.registrarParty || '-'}</td>
            <td style="padding: 8px;">
                <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background-color: ${v.hasVoted ? '#dcfce7' : '#fef9c3'}; color: ${v.hasVoted ? '#166534' : '#854d0e'};">
                    ${v.hasVoted ? 'Voted' : 'Eligible'}
                </span>
            </td>
        </tr>
    `).join('');

    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Voters List - Election 2026</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; }
                h1 { margin-bottom: 10px; color: #111; }
                .meta { margin-bottom: 20px; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { text-align: left; padding: 8px; background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
                td { color: #1f2937; }
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h1>Voters Directory - N.Kudafari</h1>
            <div class="meta">
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Records: ${filteredVoters.length}</p>
                ${searchQuery ? `<p>Filter applied: "${searchQuery}"</p>` : ''}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID Card</th>
                        <th>Full Name</th>
                        <th>Gender</th>
                        <th>Island</th>
                        <th>Address</th>
                        <th>Phone</th>
                        <th>Party</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <script>
                // Auto print and close
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  // Form Reset
  const resetForm = () => {
    setFormMode('create');
    setSelectedVoterId(null);
    setIdCardNumber('');
    setFullName('');
    setGender('');
    setAddress('');
    setIsland(islands[0] || '');
    setPhoneNumber('');
    setHasVoted(false);
    setRegistrarParty(parties[0] || '');
    setSheema(false);
    setSadiq(false);
    setCommunicated(false);
    setNotes('');
    setErrors({});
  };

  const handleSelectVoter = (voter: VoterRecord) => {
    setFormMode('edit');
    setSelectedVoterId(voter.id);
    setIdCardNumber(voter.idCardNumber);
    setFullName(voter.fullName);
    setGender(voter.gender || '');
    setAddress(voter.address);
    setIsland(voter.island);
    setPhoneNumber(voter.phoneNumber || '');
    setHasVoted(voter.hasVoted);
    setRegistrarParty(voter.registrarParty || parties[0] || '');
    setSheema(voter.sheema || false);
    setSadiq(voter.sadiq || false);
    setCommunicated(voter.communicated || false);
    setNotes(voter.notes || '');
    setErrors({});
    setViewMode('form'); // Switch to form view
  };

  const handleCreateNew = () => {
    if (!canCreate) return;
    resetForm();
    setViewMode('form'); // Switch to form view
  };

  const handleBackToList = () => {
      setViewMode('list');
      resetForm();
  };

  const handleSaveClick = () => {
    if (isReadOnlyMode) return;
    if (validate()) {
      setShowSaveConfirm(true);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // If not admin, we don't really need to validate these fields as they can't change them
    // But good to keep sanity check
    if (canEditDetails) {
        if (!idCardNumber.startsWith('A')) {
            newErrors.idCardNumber = 'ID Card Number must start with "A"';
        } else if (idCardNumber.length < 3) {
            newErrors.idCardNumber = 'ID Card Number is too short';
        }

        if (!fullName.trim()) {
            newErrors.fullName = 'Full Name cannot be empty';
        }

        if (!gender) {
            newErrors.gender = 'Gender is required';
        }

        if (!address.trim()) {
            newErrors.address = 'Address is required';
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSave = async () => {
    try {
        const commonData = {
            idCardNumber,
            fullName,
            gender: (gender as 'Male' | 'Female') || undefined,
            address,
            island,
            phoneNumber,
            hasVoted,
            registrarParty,
            sheema,
            sadiq,
            communicated,
            notes,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (formMode === 'create' && canCreate) {
            await storageService.createVoter({
                id: 'tmp', 
                ...commonData
            });
            setNotification({ msg: 'Record created successfully!', type: 'success' });
        } else if (formMode === 'edit') {
             if (selectedVoterId) {
                 await storageService.updateVoter({
                    id: selectedVoterId,
                    ...commonData
                 });
                 setNotification({ msg: 'Record updated successfully!', type: 'success' });
             }
        }
        
        await refreshData();
        setShowSaveConfirm(false);
        setViewMode('list');
        resetForm();

    } catch (error: any) {
        console.error(error);
        // Error code 42703 is undefined_column in Postgres
        const errMsg = error.message || '';
        if (error.code === '42703' || errMsg.includes('notes') || errMsg.includes('communicated') || errMsg.includes('gender')) {
            setShowColumnError(true);
            setShowSaveConfirm(false);
        } else {
            setNotification({ msg: 'Error saving record', type: 'error' });
        }
    }
    
    if (!showColumnError) {
        setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteClick = (idToDelete?: string) => {
      if (!canDelete) {
          setNotification({ msg: 'Access Denied: Only Admins can delete records.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
          return;
      }
      
      const targetId = typeof idToDelete === 'string' ? idToDelete : selectedVoterId;
      if (!targetId) return;

      setVoterToDeleteId(targetId);
      setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
      if (!voterToDeleteId) return;

      try {
          await storageService.deleteVoter(voterToDeleteId);
          await refreshData();
          
          if (viewMode === 'form' && selectedVoterId === voterToDeleteId) {
            resetForm();
            setViewMode('list');
          }
          
          setNotification({ msg: 'Record deleted.', type: 'success' });
      } catch (e) {
          console.error(e);
          setNotification({ msg: 'Failed to delete record.', type: 'error' });
      }

      setShowDeleteConfirm(false);
      setVoterToDeleteId(null);
      setTimeout(() => setNotification(null), 3000);
  };

  // --- List Management Handlers ---

  const handleAddIsland = async () => {
      if (!canEditDetails) return;
      if (!newIslandName.trim()) return;
      try {
        await storageService.addIsland(newIslandName.trim());
        await refreshData();
        setIsland(newIslandName.trim());
        setNewIslandName('');
        setIsAddIslandModalOpen(false);
        setNotification({ msg: 'Island added successfully!', type: 'success' });
      } catch (e) {
        setNotification({ msg: 'Failed to add island', type: 'error' });
      }
      setTimeout(() => setNotification(null), 3000);
    };

  const handleAddParty = async () => {
      if (!canEditDetails) return;
      if (!newPartyName.trim()) return;
      try {
        await storageService.addParty(newPartyName.trim());
        await refreshData();
        setRegistrarParty(newPartyName.trim());
        setNewPartyName('');
        setIsAddPartyModalOpen(false);
        setNotification({ msg: 'Party added successfully!', type: 'success' });
      } catch(e) {
        setNotification({ msg: 'Failed to add party', type: 'error' });
      }
      setTimeout(() => setNotification(null), 3000);
    };

  const saveManagedItem = async (index: number) => {
      alert("Renaming items is disabled in this version.");
      setEditingItemIndex(null);
  }

  const deleteManagedItem = async (index: number) => {
    if (!canDelete) return;
    if(!window.confirm("Are you sure you want to delete this item?")) return;
    
    try {
        if (manageTarget === 'island') {
            const itemToDelete = islands[index];
            await storageService.deleteIsland(itemToDelete);
            if (island === itemToDelete) setIsland(islands[0] || '');
        } else {
            const itemToDelete = parties[index];
            await storageService.deleteParty(itemToDelete);
            if (registrarParty === itemToDelete) setRegistrarParty(parties[0] || '');
        }
        await refreshData();
        setNotification({ msg: 'Item deleted from list', type: 'success' });
    } catch (e) {
        setNotification({ msg: 'Failed to delete item', type: 'error' });
    }
    setTimeout(() => setNotification(null), 3000);
  }

  // --- PROGRESS BAR CALCULATION FOR DIRECTORY VIEW ---
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const progressPct = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Top Notification Area */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2"/> : <AlertTriangle className="h-4 w-4 mr-2"/>}
            <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {/* VIEW MODE: LIST */}
      {viewMode === 'list' && (
          <div className="flex flex-col bg-white shadow-sm rounded-lg border border-gray-200">
             
             {/* Header & Actions */}
             <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <UserIcon className="h-6 w-6 mr-2 text-primary-600"/>
                            Voters Directory
                        </h2>
                        
                        {/* Compact Progress Bar */}
                        <div className="mt-2 mb-1 max-w-md">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-600">Voting Progress: <span className="text-primary-600">{progressPct}%</span></span>
                                <span className="text-gray-400">{votedCount}/{totalVoters} Voted</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Export Menu */}
                        <div className="relative">
                            <Button 
                                variant="secondary" 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="whitespace-nowrap"
                            >
                                <Download className="h-4 w-4 mr-2" /> Download Voters List
                            </Button>
                            {isExportMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200 py-1">
                                        <button 
                                            onClick={handleExportCSV} 
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600"/> Excel (CSV)
                                        </button>
                                        <button 
                                            onClick={handleExportPDF} 
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                            <Printer className="h-4 w-4 mr-2 text-gray-600"/> Print / PDF
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {canCreate && (
                            <Button onClick={handleCreateNew}>
                                <Plus className="h-5 w-5 mr-2" /> New Registration
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            placeholder="Search by name, ID, island, or address..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                        {(['all', 'eligible', 'voted'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                                    filterStatus === status 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
             </div>

             {/* Table View */}
             <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voter Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Island</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                             <tr><td colSpan={5} className="px-6 py-10 text-center">Loading data...</td></tr>
                        ) : filteredVoters.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                    No voters found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredVoters.map((voter) => (
                                <tr 
                                    key={voter.id} 
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleSelectVoter(voter)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{voter.fullName}</div>
                                                <div className="text-sm text-gray-500 font-mono flex items-center gap-2">
                                                    {voter.idCardNumber}
                                                    {voter.gender && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                                            voter.gender === 'Male' 
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                            : 'bg-pink-50 text-pink-700 border-pink-200'
                                                        }`}>
                                                            {voter.gender}
                                                        </span>
                                                    )}
                                                </div>
                                                {voter.address && (
                                                    <div className="text-xs text-gray-400 mt-1 md:hidden">
                                                        <MapPin className="h-3 w-3 inline mr-1" />
                                                        {voter.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col text-sm text-gray-700">
                                            <div className="flex items-center">
                                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                                {voter.island}
                                            </div>
                                            {voter.address && (
                                                <span className="text-xs text-gray-500 ml-5 truncate max-w-[150px]" title={voter.address}>
                                                    {voter.address}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {voter.hasVoted ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Voted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Eligible
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex space-x-2">
                                            {voter.sheema && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                    Sheema
                                                </span>
                                            )}
                                            {voter.sadiq && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    Sadiq
                                                </span>
                                            )}
                                            {voter.communicated && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                                                    Communicated
                                                </span>
                                            )}
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                                                {voter.registrarParty || 'Independent'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            {canDelete && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(voter.id);
                                                    }}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            )}
                                            <div className="text-primary-600 hover:text-primary-900">
                                                {isReadOnlyMode ? <Eye className="h-5 w-5 ml-auto" /> : <ChevronRight className="h-5 w-5 ml-auto" />}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                 </table>
             </div>
             <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
                 <div>
                     {filteredVoters.length === voters.length ? (
                         <span>Total Registered Voters: <strong>{voters.length}</strong></span>
                     ) : (
                         <span>
                             Showing <strong>{filteredVoters.length}</strong> results 
                             <span className="text-gray-400 mx-1">/</span> 
                             {voters.length} Total
                         </span>
                     )}
                 </div>
             </div>
          </div>
      )}

      {/* VIEW MODE: FORM */}
      {viewMode === 'form' && (
        <div className="flex flex-1 flex-col bg-gray-50 overflow-hidden relative rounded-lg border border-gray-200">
            
            {/* Form Header */}
            <div className="px-8 py-5 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
                <div className="flex items-center">
                    <button 
                        onClick={handleBackToList}
                        className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center">
                            {formMode === 'create' ? 'New Registration' : (
                                isReadOnlyMode ? 'Voter Details' : 'Edit Voter Details'
                            )}
                        </h1>
                    </div>
                </div>
                {formMode === 'edit' && (
                    <div className="flex space-x-2">
                        {sheema && (
                             <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                Sheema
                             </span>
                        )}
                        {sadiq && (
                             <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Sadiq
                             </span>
                        )}
                         {communicated && (
                             <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                Communicated
                             </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${hasVoted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {hasVoted ? 'Voted' : 'Eligible'}
                        </span>
                    </div>
                )}
            </div>

            {/* Form Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 space-y-4">
                        {isMamdhoob && (
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-2">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <Info className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs text-blue-700">
                                            <strong>Mamdhoob Mode:</strong> You can only update the voting status.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input 
                                label="ID Card Number" 
                                placeholder="AXXXXXX" 
                                value={idCardNumber} 
                                onChange={e => setIdCardNumber(e.target.value)}
                                error={errors.idCardNumber}
                                icon={<div className="text-gray-400 text-xs font-bold pt-0.5">ID</div>}
                                disabled={!canEditDetails}
                            />
                            
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                <select 
                                    className={`block w-full border-2 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm ${
                                        errors.gender 
                                        ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
                                        : 'border-black focus:ring-primary-500 focus:border-primary-500'
                                    } ${!canEditDetails ? 'opacity-60 bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                                    value={gender}
                                    onChange={e => {
                                        setGender(e.target.value);
                                        if (errors.gender) {
                                            const newErrs = {...errors};
                                            delete newErrs.gender;
                                            setErrors(newErrs);
                                        }
                                    }}
                                    disabled={!canEditDetails}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
                            </div>

                            <div className="sm:col-span-2">
                                <Input 
                                    label="Full Name" 
                                    placeholder="Enter full name" 
                                    value={fullName} 
                                    onChange={e => setFullName(e.target.value)}
                                    error={errors.fullName}
                                    icon={<UserIcon className="h-4 w-4 text-gray-400" />}
                                    disabled={!canEditDetails}
                                />
                            </div>
                            
                            <div className="sm:col-span-2">
                                <Input 
                                    label="Permanent Address" 
                                    placeholder="House name / address" 
                                    value={address} 
                                    onChange={e => setAddress(e.target.value)}
                                    error={errors.address}
                                    icon={<MapPin className="h-4 w-4 text-gray-400" />}
                                    disabled={!canEditDetails}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Island / Constituency</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <select 
                                            className={`block w-full pl-10 pr-10 py-2 text-base border-2 border-black bg-white text-black focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md ${!canEditDetails ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                                            value={island}
                                            onChange={e => setIsland(e.target.value)}
                                            disabled={!canEditDetails}
                                        >
                                            {islands.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                                        </select>
                                    </div>
                                    {isAdmin && (
                                        <Button 
                                            type="button" 
                                            variant="secondary"
                                            onClick={() => { setManageTarget('island'); setEditingItemIndex(null); }}
                                            className="px-3"
                                            title="Manage Islands"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button 
                                        type="button" 
                                        variant="secondary"
                                        onClick={() => setIsAddIslandModalOpen(true)}
                                        className="whitespace-nowrap"
                                        disabled={!canEditDetails}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registrar Party</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Flag className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <select 
                                            className={`block w-full pl-10 pr-10 py-2 text-base border-2 border-black bg-white text-black focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md ${!canEditDetails ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                                            value={registrarParty}
                                            onChange={e => setRegistrarParty(e.target.value)}
                                            disabled={!canEditDetails}
                                        >
                                            {parties.map(party => <option key={party} value={party}>{party}</option>)}
                                        </select>
                                    </div>
                                    {isAdmin && (
                                        <Button 
                                            type="button" 
                                            variant="secondary"
                                            onClick={() => { setManageTarget('party'); setEditingItemIndex(null); }}
                                            className="px-3"
                                            title="Manage Parties"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button 
                                        type="button" 
                                        variant="secondary"
                                        onClick={() => setIsAddPartyModalOpen(true)}
                                        className="whitespace-nowrap"
                                        disabled={!canEditDetails}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <Input 
                                    label="Phone Number (Optional)" 
                                    placeholder="Mobile number" 
                                    value={phoneNumber} 
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    disabled={!canEditDetails}
                                />
                            </div>

                            <div className="sm:col-span-2 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${!canEditDetails ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        id="sheema" 
                                        checked={sheema} 
                                        onChange={e => setSheema(e.target.checked)}
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                        disabled={!canEditDetails}
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">Sheema</span>
                                    </div>
                                </label>

                                <label className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${!canEditDetails ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        id="sadiq" 
                                        checked={sadiq} 
                                        onChange={e => setSadiq(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={!canEditDetails}
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">Sadiq</span>
                                    </div>
                                </label>

                                <label className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${!canEditDetails ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        id="communicated" 
                                        checked={communicated} 
                                        onChange={e => setCommunicated(e.target.checked)}
                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                        disabled={!canEditDetails}
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">Communicated</span>
                                    </div>
                                </label>

                                <label className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${!canEditVoted ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        id="hasVoted" 
                                        checked={hasVoted} 
                                        onChange={e => setHasVoted(e.target.checked)}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        disabled={!canEditVoted}
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 block">Voted</span>
                                    </div>
                                </label>
                            </div>

                            <div className="sm:col-span-2">
                                <TextArea
                                    label="Notes & Observations"
                                    placeholder="Enter any additional details about the voter..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    disabled={!canEditDetails}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Actions (Fixed Bottom of Panel) */}
            <div className="px-8 py-4 bg-white border-t border-gray-200 flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div>
                   {formMode === 'edit' && canDelete && (
                       <Button variant="danger" onClick={() => handleDeleteClick()} className="mr-2">
                           <Trash2 className="h-4 w-4 mr-2" /> Delete
                       </Button>
                   )}
                </div>
                <div className="flex space-x-3">
                   <Button variant="secondary" onClick={handleBackToList}>
                       {isReadOnlyMode ? 'Back' : 'Cancel'}
                   </Button>
                   {!isReadOnlyMode && (
                        <Button onClick={handleSaveClick}>
                            <Save className="h-4 w-4 mr-2" />
                            {formMode === 'create' ? 'Register Voter' : 'Update Record'}
                        </Button>
                   )}
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal 
        isOpen={showSaveConfirm} 
        onClose={() => setShowSaveConfirm(false)}
        title="Confirm Save"
        footer={
            <>
                <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>No, Go Back</Button>
                <Button onClick={confirmSave}>Yes, Save Record</Button>
            </>
        }
      >
          <div className="flex items-start">
             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <Save className="h-6 w-6 text-blue-600" />
             </div>
             <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <p className="text-sm text-gray-500">
                    You are about to save this voter record. Please confirm that all details are correct.
                </p>
                <div className="mt-2 text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-500">Name:</span> {fullName}</div>
                        <div><span className="text-gray-500">ID:</span> {idCardNumber}</div>
                        <div><span className="text-gray-500">Gender:</span> {gender || '-'}</div>
                        <div><span className="text-gray-500">Party:</span> {registrarParty}</div>
                        <div><span className="text-gray-500">Sheema:</span> {sheema ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Sadiq:</span> {sadiq ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Communicated:</span> {communicated ? 'Yes' : 'No'}</div>
                        {notes && (
                            <div className="col-span-2 text-gray-500 italic mt-1 border-t pt-1">
                                Note: {notes.length > 50 ? notes.substring(0, 50) + '...' : notes}
                            </div>
                        )}
                        <div className="col-span-2 text-center mt-2 border-t pt-2 font-semibold">
                            Status: <span className={hasVoted ? 'text-green-600' : 'text-yellow-600'}>{hasVoted ? 'Voted' : 'Eligible'}</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
        footer={
            <>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" onClick={executeDelete}>Delete Record</Button>
            </>
        }
      >
          <div className="flex items-start">
             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <Trash2 className="h-6 w-6 text-red-600" />
             </div>
             <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Do you want to delete this record?
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    This action cannot be undone. This will permanently remove the voter from the database.
                  </p>
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                     <div className="flex">
                        <ShieldCheck className="h-5 w-5 text-yellow-500 mr-2" />
                        <span className="text-xs text-yellow-800 font-medium pt-0.5">
                            Only administrators have the right to delete records.
                        </span>
                     </div>
                  </div>
                </div>
             </div>
          </div>
      </Modal>

      {/* Add Island Modal */}
      <Modal
        isOpen={isAddIslandModalOpen}
        onClose={() => setIsAddIslandModalOpen(false)}
        title="Add New Island"
        footer={
            <>
                <Button variant="secondary" onClick={() => setIsAddIslandModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddIsland}>Add Island</Button>
            </>
        }
      >
          <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter the name of the new island to add it to the system list.</p>
              <Input 
                  label="Island Name"
                  value={newIslandName}
                  onChange={e => setNewIslandName(e.target.value)}
                  placeholder="e.g. Dhidhdhoo"
                  icon={<MapPin className="h-5 w-5 text-gray-400" />}
              />
          </div>
      </Modal>

      {/* Add Party Modal */}
      <Modal
        isOpen={isAddPartyModalOpen}
        onClose={() => setIsAddPartyModalOpen(false)}
        title="Add New Party"
        footer={
            <>
                <Button variant="secondary" onClick={() => setIsAddPartyModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddParty}>Add Party</Button>
            </>
        }
      >
          <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter the name of the new political party to add it to the list.</p>
              <Input 
                  label="Party Name"
                  value={newPartyName}
                  onChange={e => setNewPartyName(e.target.value)}
                  placeholder="e.g. New Democratic Front"
                  icon={<Flag className="h-5 w-5 text-gray-400" />}
              />
          </div>
      </Modal>

      {/* List Management Modal */}
      <Modal
            isOpen={!!manageTarget}
            onClose={() => {
                setManageTarget(null);
                setEditingItemIndex(null);
            }}
            title={manageTarget === 'island' ? 'Manage Islands' : 'Manage Parties'}
            footer={
                <Button variant="secondary" onClick={() => setManageTarget(null)}>Close</Button>
            }
        >
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 pr-1">
                {(manageTarget === 'island' ? islands : parties).map((item, index) => (
                    <div key={index} className="py-3 flex items-center justify-between group">
                        {editingItemIndex === index ? (
                            <div className="flex-1 flex items-center space-x-2">
                                <Input 
                                    value={editingItemValue}
                                    onChange={(e) => setEditingItemValue(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                />
                                <button onClick={() => saveManagedItem(index)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="h-4 w-4"/></button>
                                <button onClick={() => setEditingItemIndex(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="h-4 w-4"/></button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm text-gray-700 font-medium">{item}</span>
                                <div className="flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setEditingItemIndex(index);
                                            setEditingItemValue(item);
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit"
                                        disabled
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button 
                                        onClick={() => deleteManagedItem(index)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {(manageTarget === 'island' ? islands : parties).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No items found.</p>}
            </div>
      </Modal>

      {/* Database Column Error Modal */}
      <Modal
        isOpen={showColumnError}
        onClose={() => setShowColumnError(false)}
        title="Database Update Required"
        footer={
            <Button onClick={() => setShowColumnError(false)}>Close</Button>
        }
      >
          <div className="flex flex-col items-center justify-center p-2">
            <div className="bg-orange-100 p-3 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Missing Database Columns</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
                The database is missing required columns (e.g., 'gender', 'communicated' or 'notes'). <br/>
                Please run the following command in your Supabase SQL Editor to enable this feature.
            </p>
            
            <div className="bg-gray-800 rounded-md p-4 w-full relative group">
                <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center">
                    <Terminal className="w-3 h-3 mr-1" /> SQL
                </div>
                <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`ALTER TABLE voters ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS communicated boolean default false;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS gender text;`}
                </code>
            </div>
          </div>
      </Modal>
    </div>
  );
};