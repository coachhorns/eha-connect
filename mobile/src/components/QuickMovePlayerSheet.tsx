import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  FlatList, StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Fonts, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
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
  const colors = useColors();
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
        <TouchableOpacity style={[s.backdrop, { backgroundColor: colors.modalBackdrop }]} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={[s.title, { color: colors.textPrimary }]}>Move Player</Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                {step === 1
                  ? 'Select player to move'
                  : `Moving ${selectedPlayer?.firstName} ${selectedPlayer?.lastName}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={step === 1 ? onClose : () => { setStep(1); setSelectedTeam(null); }}
              style={s.backBtn}
            >
              <Text style={[s.backBtnText, { color: colors.textSecondary }]}>{step === 1 ? '✕' : '← Back'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.red} style={{ marginVertical: 32 }} />
          ) : step === 1 ? (
            /* --- Step 1: pick player --- */
            <>
              <TextInput
                style={[s.search, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Search players..."
                placeholderTextColor={colors.textMuted}
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
                    <View style={[s.avatar, { backgroundColor: colors.navyLight }]}>
                      <Text style={[s.avatarText, { color: colors.textPrimary }]}>{item.firstName[0]}{item.lastName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.playerName, { color: colors.textPrimary }]}>{item.firstName} {item.lastName}</Text>
                      <Text style={[s.playerTeam, { color: colors.textSecondary }]}>{item.teamName}</Text>
                    </View>
                    <Text style={[s.chevron, { color: colors.textMuted }]}>&#8250;</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: colors.border }]} />}
                ListEmptyComponent={
                  <Text style={[s.empty, { color: colors.textMuted }]}>No players found</Text>
                }
              />
            </>
          ) : (
            /* --- Step 2: pick destination team --- */
            <>
              {/* From -> To preview */}
              <View style={s.fromTo}>
                <View style={[s.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[s.badgeLabel, { color: colors.textMuted }]}>FROM</Text>
                  <Text style={[s.badgeName, { color: colors.textPrimary }]} numberOfLines={1}>{selectedPlayer?.teamName}</Text>
                </View>
                <Text style={[s.arrow, { color: colors.textSecondary }]}>&rarr;</Text>
                <View style={[s.badge, { backgroundColor: colors.background, borderColor: colors.border }, selectedTeam && { borderColor: colors.red }]}>
                  <Text style={[s.badgeLabel, { color: colors.textMuted }]}>TO</Text>
                  <Text style={[s.badgeName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedTeam?.name ?? 'Select below'}
                  </Text>
                </View>
              </View>

              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>SELECT DESTINATION TEAM</Text>
              <FlatList
                data={destTeams}
                keyExtractor={item => item.id}
                style={{ maxHeight: 200 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.teamRow, selectedTeam?.id === item.id && { backgroundColor: colors.redTint }]}
                    onPress={() => setSelectedTeam(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.teamRowName, { color: colors.textPrimary }]}>{item.name}</Text>
                    {item.division && <Text style={[s.teamRowDiv, { color: colors.textSecondary }]}>{item.division}</Text>}
                    {selectedTeam?.id === item.id && <Text style={[s.check, { color: colors.red }]}>&#10003;</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: colors.border }]} />}
              />

              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: colors.red }, (!selectedTeam || moving) && { backgroundColor: colors.navyLight }]}
                onPress={handleMove}
                disabled={!selectedTeam || moving}
                activeOpacity={0.8}
              >
                {moving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[s.confirmBtnText, { color: '#fff' }]}>Confirm Move</Text>}
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
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.heading, fontSize: FontSize.xl },
  subtitle: { fontFamily: Fonts.body, fontSize: FontSize.sm, marginTop: 2 },
  backBtn: { padding: 4 },
  backBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm },
  search: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontFamily: Fonts.body, fontSize: FontSize.md,
    marginBottom: Spacing.md, borderWidth: 1,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.headingSemiBold, fontSize: FontSize.sm },
  playerName: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md },
  playerTeam: { fontFamily: Fonts.body, fontSize: FontSize.xs, marginTop: 1 },
  chevron: { fontSize: 22 },
  sep: { height: 1 },
  empty: { fontFamily: Fonts.body, textAlign: 'center', paddingVertical: Spacing.xl },
  fromTo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  badge: {
    flex: 1, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1,
  },
  badgeLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
  badgeName: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, marginTop: 2 },
  arrow: { fontSize: 20 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, marginBottom: Spacing.sm },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md },
  teamRowName: { flex: 1, fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md },
  teamRowDiv: { fontFamily: Fonts.body, fontSize: FontSize.sm, marginRight: Spacing.sm },
  check: { fontSize: 16, fontFamily: Fonts.bodyBold },
  confirmBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg,
  },
  confirmBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.md },
});
