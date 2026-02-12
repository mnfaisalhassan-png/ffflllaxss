import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { VoterRecord } from '../types';
import { 
  Users, CheckCircle, XCircle, PieChart, CheckSquare, ShieldCheck,
  Search, ArrowLeft, MapPin, Phone, Flag
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface VotingStatusProps {
    onVoterClick?: (id: string) => void;
}

export const VotingStatus: React.FC<VotingStatusProps> = ({ onVoterClick }) => {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'sheema' | 'sadiq' | 'total' | 'voted' | 'pending' | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    storageService.getVoters().then(data => {
        setVoters(data);
        setIsLoading(false);
    });
  }, []);

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
            v.island.toLowerCase().includes(q)
        );
    }
    return true;
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

  const handleFilterClick = (filter: 'sheema' | 'sadiq' | 'total' | 'voted' | 'pending') => {
      setSelectedIsland(null);
      setSelectedParty(null);
      setActiveFilter(filter);
  };

  const handleIslandClick = (islandName: string) => {
      setActiveFilter(null);
      setSelectedParty(null);
      setSelectedIsland(islandName);
  };

  const handlePartyClick = (partyName: string) => {
      setActiveFilter(null);
      setSelectedIsland(null);
      setSelectedParty(partyName);
  };

  const handleBack = () => {
      setActiveFilter(null);
      setSelectedIsland(null);
      setSelectedParty(null);
      setSearchQuery('');
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">Loading voting status...</div>;

  // Render List View if a filter, island, or party is active
  if (activeFilter || selectedIsland || selectedParty) {
      const headerInfo = getHeaderInfo();
      
      return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <Button 
                        variant="secondary" 
                        onClick={handleBack}
                        className="mr-4 rounded-full w-10 h-10 p-0 flex items-center justify-center"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
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
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input 
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Search by name, ID card, or island..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
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

  // Standard Overview Render
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center">
        <PieChart className="mr-3 h-6 w-6 text-primary-600"/>
        N.Kudafari Council Election Overview
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Total Registered Card */}
        <div 
            onClick={() => handleFilterClick('total')}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 group"
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
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-green-300 group"
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
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-orange-300 group"
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
            className="bg-white p-6 rounded-xl shadow-sm border border-teal-200 bg-teal-50/30 cursor-pointer transition-all hover:shadow-md hover:border-teal-300 group"
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
            <div className="h-16 w-16 rounded-full border-4 border-white shadow-sm overflow-hidden bg-teal-100 flex-shrink-0">
               {/* 
                  PLACEHOLDER IMAGE: 
                  Replace the src below with your actual image path, e.g., src="/sheema.png"
                  if you have uploaded the file to your public folder.
               */}
               <img 
                 src="https://placehold.co/200x200/4FD1C5/ffffff?text=Sheema" 
                 alt="Sheema Candidate" 
                 className="h-full w-full object-cover" 
               />
            </div>
          </div>
        </div>

        {/* Sadiq Card */}
        <div 
            onClick={() => handleFilterClick('sadiq')}
            className="bg-white p-6 rounded-xl shadow-sm border border-indigo-200 bg-indigo-50/30 cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 group"
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
    </div>
  );
};