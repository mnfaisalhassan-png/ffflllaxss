import React, { useEffect, useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { VoterRecord, User } from '../types';
import { 
  Users, CheckCircle, XCircle, PieChart, CheckSquare, ShieldCheck,
  Search, ArrowLeft, MapPin, Phone, Flag, Settings, Terminal, AlertTriangle,
  FileText, ClipboardCheck, Calendar, Activity, Download, FileSpreadsheet, Printer
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

interface VotingStatusProps {
    currentUser: User;
    onVoterClick?: (id: string) => void;
}

export const VotingStatus: React.FC<VotingStatusProps> = ({ currentUser, onVoterClick }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'sheema' | 'sadiq' | 'total' | 'voted' | 'pending' | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Election Config State
  const [electionConfig, setElectionConfig] = useState<{ start: number, end: number }>({ start: 0, end: 0 });
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  
  // Admin Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [dbError, setDbError] = useState(false);

  // Refs for scrolling
  const searchInputRef = useRef<HTMLInputElement>(null);
  const partySectionRef = useRef<HTMLDivElement>(null);

  // Image handling
  const [sheemaImgError, setSheemaImgError] = useState(false);

  const fetchData = async () => {
    try {
        const [votersData, settingsData] = await Promise.all([
            storageService.getVoters(),
            storageService.getElectionSettings()
        ]);
        setVoters(votersData);
        setElectionConfig({ start: settingsData.electionStart, end: settingsData.electionEnd });
        setDbError(false);
    } catch (e: any) {
        console.error("Error fetching data:", e);
        if (e.message && (e.message.includes('relation "settings" does not exist') || e.code === '42P01')) {
            setDbError(true);
        }
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Timer Logic
  useEffect(() => {
    if (electionConfig.start === 0) return;

    const calculateTimeLeft = () => {
        const now = new Date().getTime();
        // If election hasn't started, count down to start.
        // If started but not ended, count down to end.
        // If ended, show 0.
        let targetDate = electionConfig.start;
        
        if (now >= electionConfig.start && now < electionConfig.end) {
            targetDate = electionConfig.end;
        } else if (now >= electionConfig.end) {
            return { days: 0, hours: 0, minutes: 0 };
        }

        const distance = targetDate - now;
        if (distance < 0) return { days: 0, hours: 0, minutes: 0 };

        return {
            days: Math.floor(distance / (1000 * 60 * 60 * 24)),
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute is enough for this UI

    return () => clearInterval(timer);
  }, [electionConfig]);

  // General Stats
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const pendingCount = totalVoters - votedCount;
  const percentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  // Sheema Stats
  const sheemaVoters = voters.filter(v => v.sheema);
  const sheemaTotal = sheemaVoters.length;
  const sheemaVoted = sheemaVoters.filter(v => v.hasVoted).length;
  const sheemaPercentage = sheemaTotal > 0 ? Math.round((sheemaVoted / sheemaTotal) * 100) : 0;

  // Sadiq Stats
  const sadiqVoters = voters.filter(v => v.sadiq);
  const sadiqTotal = sadiqVoters.length;
  const sadiqVoted = sadiqVoters.filter(v => v.hasVoted).length;
  const sadiqPercentage = sadiqTotal > 0 ? Math.round((sadiqVoted / sadiqTotal) * 100) : 0;

  // Group by Island
  const islandStats = voters.reduce((acc, curr) => {
    if (!acc[curr.island]) {
      acc[curr.island] = { total: 0, voted: 0 };
    }
    acc[curr.island].total++;
    if (curr.hasVoted) acc[curr.island].voted++;
    return acc;
  }, {} as Record<string, { total: number; voted: number }>);

  // Group by Party
  const partyStats = voters.reduce((acc, curr) => {
    const party = curr.registrarParty || 'Unknown';
    if (!acc[party]) {
      acc[party] = { total: 0, voted: 0 };
    }
    acc[party].total++;
    if (curr.hasVoted) acc[party].voted++;
    return acc;
  }, {} as Record<string, { total: number; voted: number }>);

  // List View Filter Logic
  const filteredList = voters.filter(v => {
    // 1. Filter by Island (if selected)
    if (selectedIsland) {
        if (v.island !== selectedIsland) return false;
    }
    // 2. Filter by Party (if selected)
    else if (selectedParty) {
        const vParty = v.registrarParty || 'Unknown';
        if (vParty !== selectedParty) return false;
    }
    // 3. OR Filter by Category (if active) - mutually exclusive with Island/Party filter in this UI flow
    else if (activeFilter) {
        if (activeFilter === 'sheema' && !v.sheema) return false;
        if (activeFilter === 'sadiq' && !v.sadiq) return false;
        if (activeFilter === 'voted' && !v.hasVoted) return false;
        if (activeFilter === 'pending' && v.hasVoted) return false;
    }
    
    // 4. Search Filter (Always active)
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
            v.fullName.toLowerCase().includes(q) ||
            v.idCardNumber.toLowerCase().includes(q) ||
            v.island.toLowerCase().includes(q) ||
            (v.address && v.address.toLowerCase().includes(q))
        );
    }
    return true;
  }).sort((a, b) => {
      const addrA = a.address || '';
      const addrB = b.address || '';
      const addressComparison = addrA.localeCompare(addrB);
      
      if (addressComparison !== 0) {
          return addressComparison;
      }
      
      return a.fullName.localeCompare(b.fullName);
  });

  const getHeaderInfo = () => {
    if (selectedIsland) {
        return { title: `${selectedIsland} Voters`, icon: <MapPin className="mr-3 h-6 w-6 text-primary-600"/> };
    }
    if (selectedParty) {
        return { title: `${selectedParty} Members`, icon: <Flag className="mr-3 h-6 w-6 text-pink-600"/> };
    }

    switch(activeFilter) {
        case 'sheema': return { title: 'Sheema Voters List', icon: <CheckSquare className="mr-3 h-6 w-6 text-teal-600"/> };
        case 'sadiq': return { title: 'Sadiq Voters List', icon: <ShieldCheck className="mr-3 h-6 w-6 text-indigo-600"/> };
        case 'total': return { title: 'Total Registered Voters', icon: <Users className="mr-3 h-6 w-6 text-blue-600"/> };
        case 'voted': return { title: 'Votes Cast List', icon: <CheckCircle className="mr-3 h-6 w-6 text-green-600"/> };
        case 'pending': return { title: 'Pending Votes List', icon: <XCircle className="mr-3 h-6 w-6 text-orange-600"/> };
        default: return { title: 'Voters List', icon: <Users className="mr-3 h-6 w-6 text-gray-600"/> };
    }
  };

  // --- EXPORT HANDLERS ---
  const handleExportCSV = () => {
    const headers = ['ID Card', 'Full Name', 'Gender', 'Address', 'Island', 'Phone', 'Party', 'Status', 'Sheema', 'Sadiq', 'Communicated'];
    const csvContent = [
        headers.join(','),
        ...filteredList.map(v => [
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
            `"${v.communicated ? 'Yes' : 'No'}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const exportName = `export_${activeFilter || selectedIsland || selectedParty || 'list'}_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute('download', exportName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print the list.");
        return;
    }

    const tableRows = filteredList.map(v => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${v.idCardNumber}</td>
            <td style="padding: 8px;">${v.fullName}</td>
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

    const title = getHeaderInfo().title;

    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Election Export - ${title}</title>
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
            <h1>${title}</h1>
            <div class="meta">
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Records: ${filteredList.length}</p>
                ${searchQuery ? `<p>Filter applied: "${searchQuery}"</p>` : ''}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID Card</th>
                        <th>Full Name</th>
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
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  const handleFilterClick = (filter: 'sheema' | 'sadiq' | 'total' | 'voted' | 'pending') => {
      setSelectedIsland(null);
      setSelectedParty(null);
      setActiveFilter(filter);
      // Scroll to list
      setTimeout(() => {
          document.getElementById('voter-list')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handleIslandClick = (islandName: string) => {
      setActiveFilter(null);
      setSelectedParty(null);
      setSelectedIsland(islandName);
      setTimeout(() => {
          document.getElementById('voter-list')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handlePartyClick = (partyName: string) => {
      setActiveFilter(null);
      setSelectedIsland(null);
      setSelectedParty(partyName);
      setTimeout(() => {
          document.getElementById('voter-list')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handleBack = () => {
      setActiveFilter(null);
      setSelectedIsland(null);
      setSelectedParty(null);
      setSearchQuery('');
  };

  // Helper to format datetime for input
  const toLocalISOString = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '';
    try {
        const date = new Date(timestamp);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
  };

  const handleOpenConfig = () => {
      if (currentUser.role !== 'admin') return;
      
      const startTime = electionConfig.start > 0 ? electionConfig.start : Date.now();
      const endTime = electionConfig.end > 0 ? electionConfig.end : Date.now();
      
      setNewStartDate(toLocalISOString(startTime));
      setNewEndDate(toLocalISOString(endTime));
      setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
      if (currentUser.role !== 'admin') {
          alert("Only administrators can configure election dates.");
          return;
      }

      if (!newStartDate || !newEndDate) {
          alert("Please select valid start and end dates.");
          return;
      }

      const start = new Date(newStartDate).getTime();
      const end = new Date(newEndDate).getTime();
      
      if (isNaN(start) || isNaN(end)) {
          alert("Invalid date format.");
          return;
      }

      if (end <= start) {
          alert(`End date must be after the start date.`);
          return;
      }

      try {
          await storageService.updateElectionSettings(start, end);
          setElectionConfig({ start, end });
          setIsConfigModalOpen(false);
      } catch (e: any) {
          console.error(e);
          if (e.message && e.message.includes('relation "settings" does not exist')) {
              setDbError(true);
              setIsConfigModalOpen(false); // Close config modal to show error modal
          } else {
              alert("Failed to update settings: " + e.message);
          }
      }
  };

  const handleCheckRegistry = () => {
      window.open('https://pprvr.elections.gov.mv/statuscheck/vr', '_blank');
  };

  const handleCheckParty = () => {
      window.open('https://pprvr.elections.gov.mv/', '_blank');
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">Loading voting status...</div>;

  // Render List View if a filter, island, or party is active
  if (activeFilter || selectedIsland || selectedParty) {
      const headerInfo = getHeaderInfo();
      
      return (
        <div id="voter-list" className="space-y-6 max-w-7xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <button 
                        onClick={handleBack}
                        className="mr-6 flex items-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                    >
                        <ArrowLeft className="h-6 w-6 mr-2" />
                        Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            {headerInfo.icon}
                            {headerInfo.title}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Showing {filteredList.length} records
                        </p>
                    </div>
                </div>

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
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-black">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input 
                        ref={searchInputRef}
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Search by name, ID card, island, or address..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm rounded-lg border border-black overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voter</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Island</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                                        No voters found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((voter) => (
                                    <tr 
                                        key={voter.id} 
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => onVoterClick && onVoterClick(voter.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{voter.fullName}</div>
                                                <div className="text-sm text-gray-500 font-mono">{voter.idCardNumber}</div>
                                                {voter.address && (
                                                    <div className="flex items-center text-xs text-gray-400 mt-1">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {voter.address}
                                                    </div>
                                                )}
                                                {voter.phoneNumber && (
                                                    <div className="flex items-center text-xs text-gray-400 mt-1 md:hidden">
                                                        <Phone className="h-3 w-3 mr-1" />
                                                        {voter.phoneNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-700">
                                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                                {voter.island}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-700">
                                                <Flag className="h-3 w-3 mr-1.5 text-gray-400" />
                                                {voter.registrarParty || 'Independent'}
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  }

  // Standard Overview Render (Dashboard)
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Title & Admin Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 hidden sm:block">Election Dashboard</h1>
        {currentUser.role === 'admin' && (
            <button 
                onClick={handleOpenConfig}
                className="ml-auto flex items-center text-sm text-gray-600 hover:text-purple-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-colors"
            >
                <Settings className="h-4 w-4 mr-1.5" />
                Configure Election Date
            </button>
        )}
      </div>

      {/* NEW HERO SECTION - COMBINED LIGHT PINK CARD */}
      <div className="w-full">
          <div className="bg-pink-100 rounded-2xl p-8 text-pink-900 shadow-lg relative overflow-hidden border border-pink-200">
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="text-center md:text-left">
                     <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
                        Local Council & Women's Development<br className="hidden md:block"/> Committee Election 2026
                     </h2>
                     {electionConfig.start > 0 && (
                        <div className="inline-flex items-center bg-white/60 rounded-full px-4 py-1.5 text-sm text-pink-800 border border-pink-200 backdrop-blur-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            {new Date(electionConfig.start).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                     )}
                 </div>
                 
                 <div className="flex items-center space-x-2 sm:space-x-4 bg-white/40 p-4 sm:p-6 rounded-2xl backdrop-blur-md border border-white/50 shadow-sm">
                    <div className="flex flex-col items-center">
                        <span className="text-3xl sm:text-5xl font-bold font-mono text-pink-900">{String(timeLeft.days).padStart(2, '0')}</span>
                        <span className="text-xs text-pink-700 uppercase tracking-wider mt-1">Days</span>
                    </div>
                    <div className="text-2xl sm:text-4xl font-light text-pink-400 pb-4">:</div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl sm:text-5xl font-bold font-mono text-pink-900">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="text-xs text-pink-700 uppercase tracking-wider mt-1">Hrs</span>
                    </div>
                    <div className="text-2xl sm:text-4xl font-light text-pink-400 pb-4">:</div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl sm:text-5xl font-bold font-mono text-pink-900">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="text-xs text-pink-700 uppercase tracking-wider mt-1">Min</span>
                    </div>
                 </div>
             </div>
             
             {/* Decorative Circle */}
             <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-300 opacity-30 rounded-full blur-3xl"></div>
             <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-200 opacity-30 rounded-full blur-3xl"></div>
          </div>
      </div>

      {/* ACTION BUTTONS (White Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            onClick={handleCheckParty}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center cursor-pointer hover:shadow-md transition-shadow group"
          >
              <div className="h-12 w-12 rounded-xl bg-[#F3E8FF] flex items-center justify-center mr-4 group-hover:bg-[#E9D5FF] transition-colors">
                  <Flag className="h-6 w-6 text-[#5D2E86]" />
              </div>
              <span className="text-lg font-medium text-gray-800 group-hover:text-[#5D2E86] transition-colors">Check your registered party</span>
          </div>

          <div 
            onClick={handleCheckRegistry}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center cursor-pointer hover:shadow-md transition-shadow group"
          >
              <div className="h-12 w-12 rounded-xl bg-[#F3E8FF] flex items-center justify-center mr-4 group-hover:bg-[#E9D5FF] transition-colors">
                  <ClipboardCheck className="h-6 w-6 text-[#5D2E86]" />
              </div>
              <span className="text-lg font-medium text-gray-800 group-hover:text-[#5D2E86] transition-colors">Check your voter registry</span>
          </div>
      </div>

      {/* NEW: Voting Progress Bar Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-2">
            <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-primary-600" />
                    Overall Election Progress
                </h3>
                <p className="text-sm text-gray-500 mt-1">Real-time tracking of votes cast vs registered voters</p>
            </div>
            <div className="flex items-baseline text-primary-700">
                <span className="text-4xl font-extrabold tracking-tight">{percentage}%</span>
                <span className="ml-1 text-sm font-medium text-gray-500">completed</span>
            </div>
        </div>
        
        {/* Bar Track */}
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
            {/* Animated Bar */}
            <div 
                className="h-full bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 rounded-full relative transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
            >
                {/* Shine Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 bg-[length:10px_10px] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]"></div>
            </div>
        </div>

        <div className="mt-3 flex justify-between text-xs font-medium text-gray-400">
            <div>0</div>
            <div>
                <span className="text-gray-900 font-bold">{votedCount}</span> Voted
            </div>
            <div>{totalVoters} Total</div>
        </div>
      </div>

      {/* Hidden search input reference for "Check Registry" action */}
      <div className="opacity-0 h-0 overflow-hidden">
        <input ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* SECTION DIVIDER */}
      <div className="border-t border-gray-200 my-8"></div>

      {/* Summary Cards (Existing Functionality) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Total Registered Card */}
        <div 
            onClick={() => handleFilterClick('total')}
            className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200 cursor-pointer transition-all hover:shadow-md hover:border-blue-400 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600 group-hover:underline">Total Registered</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalVoters}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Votes Cast Card */}
        <div 
            onClick={() => handleFilterClick('voted')}
            className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200 cursor-pointer transition-all hover:shadow-md hover:border-green-400 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-green-600 group-hover:underline">Votes Cast</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{votedCount}</p>
              <p className="text-sm text-gray-500 mt-1">{percentage}% Turnout</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending Votes Card */}
        <div 
            onClick={() => handleFilterClick('pending')}
            className="bg-orange-50 p-6 rounded-xl shadow-sm border border-orange-200 cursor-pointer transition-all hover:shadow-md hover:border-orange-400 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-orange-600 group-hover:underline">Pending Votes</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{pendingCount}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <XCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        
        {/* Sheema Card */}
        <div 
            onClick={() => handleFilterClick('sheema')}
            className="bg-teal-50 p-6 rounded-xl shadow-sm border border-teal-200 cursor-pointer transition-all hover:shadow-md hover:border-teal-400 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-800 group-hover:underline">Sheema Status</p>
              <p className="text-3xl font-bold text-teal-900 mt-1">
                {sheemaVoted}
                <span className="text-lg text-teal-500 font-normal"> / {sheemaTotal}</span>
              </p>
              <p className="text-sm text-teal-600 mt-1">{sheemaPercentage}% Turnout</p>
            </div>
            <div className="h-16 w-16 rounded-full border-4 border-white shadow-sm overflow-hidden bg-teal-100 flex-shrink-0 relative">
               <img 
                 src={sheemaImgError ? "https://placehold.co/200x200/4FD1C5/ffffff?text=Sheema" : "./sheema.png"} 
                 alt="Sheema Candidate" 
                 className="h-full w-full object-cover"
                 onError={() => setSheemaImgError(true)}
               />
            </div>
          </div>
        </div>

        {/* Sadiq Card */}
        <div 
            onClick={() => handleFilterClick('sadiq')}
            className="bg-indigo-50 p-6 rounded-xl shadow-sm border border-indigo-200 cursor-pointer transition-all hover:shadow-md hover:border-indigo-400 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-800 group-hover:underline">Sadiq Status</p>
              <p className="text-3xl font-bold text-indigo-900 mt-1">
                {sadiqVoted}
                <span className="text-lg text-indigo-400 font-normal"> / {sadiqTotal}</span>
              </p>
              <p className="text-sm text-indigo-600 mt-1">{sadiqPercentage}% Turnout</p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Island Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-black overflow-hidden">
          <div className="px-6 py-4 border-b border-black bg-gray-50">
            <h3 className="font-semibold text-gray-900">Turnout by Island</h3>
          </div>
          <div className="p-6">
             {Object.keys(islandStats).length === 0 ? (
                 <p className="text-gray-500 text-sm text-center py-4">No data available</p>
             ) : (
                 <div className="space-y-4">
                   {Object.entries(islandStats).map(([island, stats]: [string, { total: number; voted: number }]) => {
                     const pct = stats.total > 0 ? Math.round((stats.voted / stats.total) * 100) : 0;
                     return (
                       <div 
                        key={island} 
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group"
                        onClick={() => handleIslandClick(island)}
                       >
                         <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-gray-700 group-hover:text-primary-700 underline-offset-2 group-hover:underline">{island}</span>
                           <span className="text-gray-500">{stats.voted}/{stats.total} ({pct}%)</span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-2.5">
                           <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
             )}
          </div>
        </div>

        {/* Party Stats */}
        <div ref={partySectionRef} className="bg-white rounded-xl shadow-sm border border-black overflow-hidden">
          <div className="px-6 py-4 border-b border-black bg-gray-50">
            <h3 className="font-semibold text-gray-900">Registrar Party Distribution</h3>
          </div>
          <div className="p-6">
             {Object.keys(partyStats).length === 0 ? (
                 <p className="text-gray-500 text-sm text-center py-4">No data available</p>
             ) : (
                 <div className="space-y-4">
                   {Object.entries(partyStats).map(([party, stats]: [string, { total: number; voted: number }]) => {
                     const sharePct = totalVoters > 0 ? (stats.total / totalVoters) * 100 : 0;
                     return (
                       <div 
                        key={party} 
                        className="p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors group"
                        onClick={() => handlePartyClick(party)}
                       >
                         <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-gray-700 group-hover:text-primary-700 underline-offset-2 group-hover:underline">{party}</span>
                           <span className="text-gray-500">{stats.total} Registered</span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-2.5">
                           <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${sharePct}%` }}></div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* Admin Election Config Modal */}
      {currentUser.role === 'admin' && (
        <Modal 
            isOpen={isConfigModalOpen} 
            onClose={() => setIsConfigModalOpen(false)}
            title="Configure Election Schedule"
            footer={
                <>
                    <Button variant="secondary" onClick={() => setIsConfigModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveConfig}>Save Schedule</Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Update the election timeline.
                </p>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Election Start Date & Time</label>
                    <input 
                        type="datetime-local"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={newStartDate}
                        onChange={e => setNewStartDate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Countdown timer counts down to this date.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Election Ending Date & Time</label>
                    <input 
                        type="datetime-local"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={newEndDate}
                        onChange={e => setNewEndDate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Voting ends at this time.</p>
                </div>
            </div>
        </Modal>
      )}

      {/* DB Setup Error Modal */}
      <Modal
        isOpen={dbError}
        onClose={() => setDbError(false)}
        title="Database Setup Required"
        footer={
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
        }
      >
          <div className="flex flex-col items-center justify-center p-2">
            <div className="bg-orange-100 p-3 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Settings Table Missing</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
                To save election dates, a <code>settings</code> table is required.
            </p>
            
            <div className="bg-gray-800 rounded-md p-4 w-full relative group">
                <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center">
                    <Terminal className="w-3 h-3 mr-1" /> SQL
                </div>
                <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`create table if not exists settings (
  key text primary key,
  value text not null
);

alter table settings enable row level security;
create policy "Public Access Settings" on settings for all using (true) with check (true);`}
                </code>
            </div>
          </div>
      </Modal>
    </div>
  );
};