import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { Fonts, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { api } from '@/api/client';

const DIVISIONS = ['EPL 17', 'EPL 16', 'EPL 15', 'EPL 14', 'EPL 13', 'EPL 12', 'Open'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuickCreateTeamSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const [name, setName] = useState('');
  const [division, setDivision] = useState('');
  const [gender, setGender] = useState<'Boys' | 'Girls'>('Boys');
  const [loading, setLoading] = useState(false);

  const reset = () => { setName(''); setDivision(''); setGender('Boys'); };

  const handleClose = () => { reset(); onClose(); };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a team name.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/director/teams', {
        name: name.trim(),
        division,
        gender,
      });
      Alert.alert('Team Created', `${name.trim()} has been added to your program.`);
      reset();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not create team. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={[s.backdrop, { backgroundColor: colors.modalBackdrop }]} onPress={handleClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={[s.title, { color: colors.textPrimary }]}>Create Team</Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>Add a new team to your program</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={[s.closeBtnText, { color: colors.textSecondary }]}>&#10005;</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Team name */}
            <Text style={[s.label, { color: colors.textMuted }]}>TEAM NAME</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. EHA Elite 17U"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Gender */}
            <Text style={[s.label, { color: colors.textMuted }]}>GENDER</Text>
            <View style={s.genderRow}>
              {(['Boys', 'Girls'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[
                    s.genderBtn,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    gender === g && { backgroundColor: colors.red, borderColor: colors.red },
                  ]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.genderBtnText, { color: colors.textSecondary }, gender === g && { color: '#fff' }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Division */}
            <Text style={[s.label, { color: colors.textMuted }]}>DIVISION <Text style={[s.optional, { color: colors.textMuted }]}>(optional)</Text></Text>
            <View style={s.pillRow}>
              {DIVISIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    s.pill,
                    { borderColor: colors.border },
                    division === d && { backgroundColor: colors.red, borderColor: colors.red },
                  ]}
                  onPress={() => setDivision(division === d ? '' : d)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.pillText, { color: colors.textSecondary }, division === d && { color: '#fff' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: colors.red }, (!name.trim() || loading) && { backgroundColor: colors.navyLight }]}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={[s.confirmBtnText, { color: '#fff' }]}>Create Team</Text>}
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.heading, fontSize: FontSize.xl },
  subtitle: { fontFamily: Fonts.body, fontSize: FontSize.sm, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md },
  label: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, marginBottom: Spacing.sm },
  optional: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0 },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontFamily: Fonts.body, fontSize: FontSize.md,
    marginBottom: Spacing.lg, borderWidth: 1,
  },
  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  genderBtn: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  genderBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  pill: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  pillText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm },
  confirmBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md,
  },
  confirmBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.md },
});
