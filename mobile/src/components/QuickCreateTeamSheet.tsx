import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { Colors, Fonts, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { api } from '@/api/client';

const DIVISIONS = ['EPL 17', 'EPL 16', 'EPL 15', 'EPL 14', 'EPL 13', 'EPL 12', 'Open'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuickCreateTeamSheet({ visible, onClose }: Props) {
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
        <TouchableOpacity style={s.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Create Team</Text>
              <Text style={s.subtitle}>Add a new team to your program</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Team name */}
            <Text style={s.label}>TEAM NAME</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. EHA Elite 17U"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Gender */}
            <Text style={s.label}>GENDER</Text>
            <View style={s.genderRow}>
              {(['Boys', 'Girls'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, gender === g && s.genderBtnActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.genderBtnText, gender === g && s.genderBtnTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Division */}
            <Text style={s.label}>DIVISION <Text style={s.optional}>(optional)</Text></Text>
            <View style={s.pillRow}>
              {DIVISIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.pill, division === d && s.pillActive]}
                  onPress={() => setDivision(division === d ? '' : d)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.pillText, division === d && s.pillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, (!name.trim() || loading) && s.confirmBtnOff]}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmBtnText}>Create Team</Text>}
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.heading, fontSize: FontSize.xl, color: Colors.textPrimary },
  subtitle: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontFamily: Fonts.bodySemiBold, color: Colors.textSecondary, fontSize: FontSize.md },
  label: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: Spacing.sm },
  optional: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted, letterSpacing: 0 },
  input: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontFamily: Fonts.body, fontSize: FontSize.md, color: Colors.textPrimary,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  genderBtn: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  genderBtnActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  genderBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md, color: Colors.textSecondary },
  genderBtnTextActive: { color: '#fff' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  pill: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  pillText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },
  confirmBtn: {
    backgroundColor: Colors.red, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md,
  },
  confirmBtnOff: { backgroundColor: Colors.navyLight },
  confirmBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.md, color: '#fff' },
});
