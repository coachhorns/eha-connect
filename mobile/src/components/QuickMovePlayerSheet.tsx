import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  FlatList, StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Colors, Fonts, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { api } from '@/api/client';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  teamName: string;
}

interface Team {
  id: string;
  name: string;
  division?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuickMovePlayerSheet({ visible, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    } else {
      setStep(1);
      setSelectedPlayer(null);
      setSelectedTeam(null);
      setSearch('');
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const teamsRes = await api.get<{ teams: Team[] }>('/api/director/teams');
      const teamList = teamsRes.teams ?? [];
      setTeams(teamList);

      const allPlayers: Player[] = [];
      await Promise.all(
        teamList.map(async (team) => {
          const rosterRes = await api.get<{ roster: any[] }>(`/api/director/teams/${team.id}/roster`);
          (rosterRes.roster ?? []).forEach((r: any) => {
            const p = r.player ?? r;
            allPlayers.push({
              id: p.id,
              firstName: p.firstName ?? '',
              lastName: p.lastName ?? '',
              teamId: team.id,
              teamName: team.name,
            });
          });
        })
      );
      setPlayers(allPlayers);
    } catch {
      Alert.alert('Error', 'Could not load roster. Please try again.');
    }
    setLoading(false);
  };

  const handleMove = async () => {
    if (!selectedPlayer || !selectedTeam) return;
    setMoving(true);
    try {
      await api.post('/api/director/roster-manager/move', {
        playerId: selectedPlayer.id,
        fromTeamId: selectedPlayer.teamId,
        toTeamId: selectedTeam.id,
      });
      Alert.alert('Done', `${selectedPlayer.firstName} ${selectedPlayer.lastName} moved to ${selectedTeam.name}.`);
      onClose();
    } catch {
      Alert.alert('Error', 'Could not move player. Please try again.');
    }
    setMoving(false);
  };

  const filtered = players.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );
  const destTeams = teams.filter(t => t.id !== selectedPlayer?.teamId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Move Player</Text>
              <Text style={s.subtitle}>
                {step === 1
                  ? 'Select player to move'
                  : `Moving ${selectedPlayer?.firstName} ${selectedPlayer?.lastName}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={step === 1 ? onClose : () => { setStep(1); setSelectedTeam(null); }}
              style={s.backBtn}
            >
              <Text style={s.backBtnText}>{step === 1 ? '✕' : '← Back'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.red} style={{ marginVertical: 32 }} />
          ) : step === 1 ? (
            /* ─── Step 1: pick player ─── */
            <>
              <TextInput
                style={s.search}
                placeholder="Search players..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 340 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.playerRow}
                    onPress={() => { setSelectedPlayer(item); setStep(2); }}
                    activeOpacity={0.7}
                  >
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.playerName}>{item.firstName} {item.lastName}</Text>
                      <Text style={s.playerTeam}>{item.teamName}</Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                ListEmptyComponent={
                  <Text style={s.empty}>No players found</Text>
                }
              />
            </>
          ) : (
            /* ─── Step 2: pick destination team ─── */
            <>
              {/* From → To preview */}
              <View style={s.fromTo}>
                <View style={s.badge}>
                  <Text style={s.badgeLabel}>FROM</Text>
                  <Text style={s.badgeName} numberOfLines={1}>{selectedPlayer?.teamName}</Text>
                </View>
                <Text style={s.arrow}>→</Text>
                <View style={[s.badge, selectedTeam && s.badgeHighlight]}>
                  <Text style={s.badgeLabel}>TO</Text>
                  <Text style={s.badgeName} numberOfLines={1}>
                    {selectedTeam?.name ?? 'Select below'}
                  </Text>
                </View>
              </View>

              <Text style={s.sectionLabel}>SELECT DESTINATION TEAM</Text>
              <FlatList
                data={destTeams}
                keyExtractor={item => item.id}
                style={{ maxHeight: 200 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.teamRow, selectedTeam?.id === item.id && s.teamRowActive]}
                    onPress={() => setSelectedTeam(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.teamRowName}>{item.name}</Text>
                    {item.division && <Text style={s.teamRowDiv}>{item.division}</Text>}
                    {selectedTeam?.id === item.id && <Text style={s.check}>✓</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={s.sep} />}
              />

              <TouchableOpacity
                style={[s.confirmBtn, (!selectedTeam || moving) && s.confirmBtnOff]}
                onPress={handleMove}
                disabled={!selectedTeam || moving}
                activeOpacity={0.8}
              >
                {moving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.confirmBtnText}>Confirm Move</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.heading, fontSize: FontSize.xl, color: Colors.textPrimary },
  subtitle: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  backBtn: { padding: 4 },
  backBtnText: { fontFamily: Fonts.bodySemiBold, color: Colors.textSecondary, fontSize: FontSize.sm },
  search: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontFamily: Fonts.body, fontSize: FontSize.md, color: Colors.textPrimary,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.navyLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.headingSemiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  playerName: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md, color: Colors.textPrimary },
  playerTeam: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  chevron: { fontSize: 22, color: Colors.textMuted },
  sep: { height: 1, backgroundColor: Colors.border },
  empty: { fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  fromTo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  badge: {
    flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  badgeHighlight: { borderColor: Colors.red },
  badgeLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  badgeName: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.textSecondary },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: Spacing.sm },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md },
  teamRowActive: { backgroundColor: 'rgba(239,68,68,0.12)' },
  teamRowName: { flex: 1, fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md, color: Colors.textPrimary },
  teamRowDiv: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.textSecondary, marginRight: Spacing.sm },
  check: { fontSize: 16, color: Colors.red, fontFamily: Fonts.bodyBold },
  confirmBtn: {
    backgroundColor: Colors.red, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg,
  },
  confirmBtnOff: { backgroundColor: Colors.navyLight },
  confirmBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.md, color: '#fff' },
});
