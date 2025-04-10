import React, { useEffect, useState, useRef } from 'react';
import { Auth } from './components/Auth';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import { LogOut, Plus, Trash2, UserPlus, Users, Pencil, X, Check, Download, Upload } from 'lucide-react';
import { Team, Player, Position } from './types/database';
import * as Papa from 'papaparse';

const POSITIONS: { value: Position; label: string }[] = [
  { value: 1, label: 'Position nicht gewählt' },
  { value: 2, label: 'Stürmer*in' },
  { value: 3, label: 'Center*in' },
  { value: 4, label: 'Verteidiger*in' },
  { value: 5, label: 'Goali' },
] as const;

// Helper function to map position labels or numbers to values
const getPositionValue = (position: string | number): Position => {
  // If it's already a number between 1-5, use it
  const numPosition = Number(position);
  if (!isNaN(numPosition) && numPosition >= 1 && numPosition <= 5) {
    return numPosition as Position;
  }

  // If it's a string, try to map it
  if (typeof position === 'string') {
    const normalizedLabel = position.trim().toLowerCase();
    switch (normalizedLabel) {
      case 'stürmer':
      case 'stürmer*in':
      case 'stuermer':
      case 'stuermer*in':
        return 2;
      case 'center':
      case 'center*in':
        return 3;
      case 'verteidiger':
      case 'verteidiger*in':
        return 4;
      case 'goali':
      case 'goalie':
      case 'torwart':
      case 'torwart*in':
        return 5;
    }
  }

  return 1; // Default to "Position nicht gewählt"
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editingPlayerData, setEditingPlayerData] = useState({
    first_name: '',
    last_name: '',
    position: 1 as Position,
    jersey_number: '',
  });
  const [newPlayer, setNewPlayer] = useState({
    first_name: '',
    last_name: '',
    position: 1 as Position,
    jersey_number: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'team' | 'player';
    id: string;
    name: string;
    hasPlayers?: boolean;
  }>({
    isOpen: false,
    type: 'team',
    id: '',
    name: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers(selectedTeam);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching teams:', error);
      return;
    }

    setTeams(data);
    if (data.length > 0 && !selectedTeam) {
      setSelectedTeam(data[0].id);
    }
  };

  const fetchPlayers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('jersey_number', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      return;
    }

    setPlayers(data);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newTeamName.trim()) return;

    const teamId = newTeamName.toLowerCase().replace(/\s+/g, '-');
    const { error } = await supabase.from('teams').insert({
      id: teamId,
      name: newTeamName,
      user_id: user?.id,
    });

    if (error) {
      if (error.code === '23505') {
        setError('Ein Team mit diesem Namen existiert bereits.');
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
      return;
    }

    setNewTeamName('');
    setError(null);
    fetchTeams();
  };

  const handleUpdateTeam = async (teamId: string) => {
    if (!editingTeamName.trim()) return;

    const { error } = await supabase
      .from('teams')
      .update({ name: editingTeamName })
      .eq('id', teamId);

    if (error) {
      if (error.code === '23505') {
        setError('Ein Team mit diesem Namen existiert bereits.');
        return;
      }
      console.error('Error updating team:', error);
      return;
    }

    setEditingTeam(null);
    setEditingTeamName('');
    fetchTeams();
  };

  const handleStartEditingTeam = (team: Team) => {
    setEditingTeam(team.id);
    setEditingTeamName(team.name);
  };

  const handleStartEditingPlayer = (player: Player) => {
    setEditingPlayer(player.id);
    setEditingPlayerData({
      first_name: player.first_name,
      last_name: player.last_name,
      position: player.position || 1,
      jersey_number: player.jersey_number?.toString() || '',
    });
  };

  const handleUpdatePlayer = async (playerId: string) => {
    if (!editingPlayerData.first_name.trim() || !editingPlayerData.last_name.trim()) {
      setError('Vor- und Nachname sind erforderlich.');
      return;
    }

    const { error } = await supabase
      .from('players')
      .update({
        first_name: editingPlayerData.first_name.trim(),
        last_name: editingPlayerData.last_name.trim(),
        position: editingPlayerData.position,
        jersey_number: editingPlayerData.jersey_number ? parseInt(editingPlayerData.jersey_number) : null,
      })
      .eq('id', playerId);

    if (error) {
      console.error('Error updating player:', error);
      return;
    }

    setEditingPlayer(null);
    setEditingPlayerData({
      first_name: '',
      last_name: '',
      position: 1,
      jersey_number: '',
    });
    if (selectedTeam) {
      fetchPlayers(selectedTeam);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    if (!newPlayer.first_name.trim() || !newPlayer.last_name.trim()) {
      setError('Vor- und Nachname sind erforderlich.');
      return;
    }

    const { error } = await supabase.from('players').insert({
      team_id: selectedTeam,
      first_name: newPlayer.first_name.trim(),
      last_name: newPlayer.last_name.trim(),
      position: newPlayer.position,
      jersey_number: newPlayer.jersey_number ? parseInt(newPlayer.jersey_number) : null,
    });

    if (error) {
      console.error('Error creating player:', error);
      return;
    }

    setNewPlayer({
      first_name: '',
      last_name: '',
      position: 1,
      jersey_number: '',
    });
    fetchPlayers(selectedTeam);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation.type === 'team') {
      const { error } = await supabase.from('teams').delete().eq('id', deleteConfirmation.id);

      if (error) {
        console.error('Error deleting team:', error);
        return;
      }

      fetchTeams();
      if (selectedTeam === deleteConfirmation.id) {
        setSelectedTeam(null);
        setPlayers([]);
      }
    } else {
      const { error } = await supabase.from('players').delete().eq('id', deleteConfirmation.id);

      if (error) {
        console.error('Error deleting player:', error);
        return;
      }

      if (selectedTeam) {
        fetchPlayers(selectedTeam);
      }
    }

    setDeleteConfirmation({ isOpen: false, type: 'team', id: '', name: '' });
  };

  const handleInitiateTeamDelete = async (teamId: string, teamName: string) => {
    const { data: teamPlayers, error } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', teamId);

    if (error) {
      console.error('Error checking team players:', error);
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      type: 'team',
      id: teamId,
      name: teamName,
      hasPlayers: teamPlayers.length > 0,
    });
  };

  const handleInitiatePlayerDelete = (playerId: string, playerName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'player',
      id: playerId,
      name: playerName,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleExportCSV = () => {
    if (!players.length || !selectedTeam) return;

    const selectedTeamName = teams.find(team => team.id === selectedTeam)?.name || '';
    const csvData = players.map(player => ({
      Team: selectedTeamName,
      Vorname: player.first_name,
      Nachname: player.last_name,
      Position: POSITIONS.find(pos => pos.value === player.position)?.label || POSITIONS[0].label,
      Trikotnummer: player.jersey_number || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `spieler_${selectedTeamName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllTeamsCSV = async () => {
    const { data: allPlayers, error } = await supabase
      .from('players')
      .select('*, teams(name)')
      .order('team_id', { ascending: true });

    if (error) {
      console.error('Error fetching all players:', error);
      setError('Fehler beim Exportieren aller Spieler.');
      return;
    }

    if (!allPlayers.length) {
      setError('Keine Spieler zum Exportieren gefunden.');
      return;
    }

    const csvData = allPlayers.map(player => ({
      Team: player.teams?.name || '',
      Vorname: player.first_name,
      Nachname: player.last_name,
      Position: POSITIONS.find(pos => pos.value === player.position)?.label || POSITIONS[0].label,
      Trikotnummer: player.jersey_number || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alle_spieler_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTeam) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const validPlayers = results.data
          .filter((row: any) => row.Vorname?.trim() && row.Nachname?.trim())
          .map((row: any) => {
            const teamName = row.Team?.trim();
            const team = teams.find(t => t.name.toLowerCase() === teamName?.toLowerCase());
            const teamId = team?.id || selectedTeam;
            
            // Use the updated helper function to get the correct position value
            const position = getPositionValue(row.Position || 1);

            return {
              team_id: teamId,
              first_name: row.Vorname.trim(),
              last_name: row.Nachname.trim(),
              position,
              jersey_number: row.Trikotnummer ? parseInt(row.Trikotnummer) : null,
            };
          });

        if (validPlayers.length === 0) {
          setError('Keine gültigen Spielerdaten in der CSV-Datei gefunden.');
          return;
        }

        const { error } = await supabase.from('players').insert(validPlayers);

        if (error) {
          console.error('Error importing players:', error);
          setError('Fehler beim Importieren der Spieler.');
          return;
        }

        fetchPlayers(selectedTeam);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Auth />
      </div>
    );
  }

  const getPositionLabel = (positionValue: Position | null) => {
    return POSITIONS.find(pos => pos.value === positionValue)?.label || POSITIONS[0].label;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DeleteConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title={`${deleteConfirmation.type === 'team' ? 'Team' : 'Spieler*in'} löschen`}
        message={
          deleteConfirmation.type === 'team'
            ? deleteConfirmation.hasPlayers
              ? `Möchten Sie das Team "${deleteConfirmation.name}" wirklich löschen? Alle Spieler*innen in diesem Team werden ebenfalls gelöscht.`
              : `Möchten Sie das Team "${deleteConfirmation.name}" wirklich löschen?`
            : `Möchten Sie ${deleteConfirmation.name} wirklich aus dem Team entfernen?`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, type: 'team', id: '', name: '' })}
      />

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">WWSB Team Manager</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportAllTeamsCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Alle Teams exportieren
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Teams Section */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Teams
                </h2>
              </div>

              <form onSubmit={handleCreateTeam} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Neuer Teamname"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </form>

              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      selectedTeam === team.id ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    {editingTeam === team.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={(e) => setEditingTeamName(e.target.value)}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          onClick={() => handleUpdateTeam(team.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingTeam(null);
                            setEditingTeamName('');
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="font-medium cursor-pointer flex-1"
                          onClick={() => setSelectedTeam(team.id)}
                        >
                          {team.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditingTeam(team)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleInitiateTeamDelete(team.id, team.name)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Players Section */}
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Spieler*innen
                </h2>
                {selectedTeam && (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      CSV importieren
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV exportieren
                    </button>
                  </div>
                )}
              </div>

              {selectedTeam ? (
                <>
                  <form onSubmit={handleCreatePlayer} className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      value={newPlayer.first_name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })}
                      placeholder="Vorname"
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={newPlayer.last_name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, last_name: e.target.value })}
                      placeholder="Nachname"
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <select
                      value={newPlayer.position}
                      onChange={(e) => setNewPlayer({ ...newPlayer, position: parseInt(e.target.value) as Position })}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {POSITIONS.map(pos => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newPlayer.jersey_number}
                        onChange={(e) => setNewPlayer({ ...newPlayer, jersey_number: e.target.value })}
                        placeholder="Nr."
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <button
                        type="submit"
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nr.
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Position
                          </th>
                          <th className="px-6 py-3 bg-gray-50"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {players.map((player) => (
                          <tr key={player.id}>
                            {editingPlayer === player.id ? (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="number"
                                    value={editingPlayerData.jersey_number}
                                    onChange={(e) => setEditingPlayerData({
                                      ...editingPlayerData,
                                      jersey_number: e.target.value
                                    })}
                                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingPlayerData.first_name}
                                      onChange={(e) => setEditingPlayerData({
                                        ...editingPlayerData,
                                        first_name: e.target.value
                                      })}
                                      className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={editingPlayerData.last_name}
                                      onChange={(e) => setEditingPlayerData({
                                        ...editingPlayerData,
                                        last_name: e.target.value
                                      })}
                                      className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <select
                                    value={editingPlayerData.position}
                                    onChange={(e) => setEditingPlayerData({
                                      ...editingPlayerData,
                                      position: parseInt(e.target.value) as Position
                                    })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  >
                                    {POSITIONS.map(pos => (
                                      <option key={pos.value} value={pos.value}>
                                        {pos.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      onClick={() => handleUpdatePlayer(player.id)}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingPlayer(null);
                                        setEditingPlayerData({
                                          first_name: '',
                                          last_name: '',
                                          position: 1,
                                          jersey_number: '',
                                        });
                                      }}
                                      className="text-gray-600 hover:text-gray-800"
                                    >
                                      <X className="h-4 w-4" />
                
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {player.jersey_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {player.first_name} {player.last_name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {getPositionLabel(player.position)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      onClick={() => handleStartEditingPlayer(player)}
                                      className="text-gray-600 hover:text-gray-800"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleInitiatePlayerDelete(player.id, `${player.first_name} ${player.last_name}`)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">Wählen Sie ein Team aus, um Spieler*innen zu verwalten</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;