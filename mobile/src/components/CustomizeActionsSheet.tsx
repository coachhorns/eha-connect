import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { Fonts, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';

export interface ActionOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface Props {
  visible: boolean;
  currentIds: string[];
  availableActions: ActionOption[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}

const MAX = 4;

export function CustomizeActionsSheet({ visible, currentIds, availableActions, onSave, onClose }: Props) {
  const colors = useColors();
  const [selected, setSelected] = useState<string[]>(currentIds);

  useEffect(() => {
    if (visible) setSelected(currentIds);
  }, [visible, currentIds]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX) return prev; // cap at 4
      return [...prev, id];
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={[s.backdrop, { backgroundColor: colors.modalBackdrop }]} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={[s.title, { color: colors.textPrimary }]}>Customize Actions</Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                {selected.length}/{MAX} selected
              </Text>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.red }, selected.length === 0 && { backgroundColor: colors.navyLight }]}
              onPress={() => { onSave(selected); onClose(); }}
              disabled={selected.length === 0}
              activeOpacity={0.8}
            >
              <Text style={[s.saveBtnText, { color: '#fff' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {availableActions.map((action) => {
              const isOn = selected.includes(action.id);
              const isDisabled = !isOn && selected.length >= MAX;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    s.row,
                    { borderColor: 'transparent' },
                    isOn && { backgroundColor: colors.redTint, borderColor: 'rgba(239,68,68,0.25)' },
                    isDisabled && s.rowDisabled,
                  ]}
                  onPress={() => toggle(action.id)}
                  activeOpacity={0.7}
                  disabled={isDisabled}
                >
                  <View style={s.rowContent}>
                    <Text style={[s.rowLabel, { color: colors.textPrimary }, isDisabled && { color: colors.textMuted }]}>{action.label}</Text>
                    <Text style={[s.rowDesc, { color: colors.textSecondary }, isDisabled && { color: colors.textMuted }]}>{action.description}</Text>
                  </View>
                  <View style={[s.checkbox, { borderColor: colors.border }, isOn && { backgroundColor: colors.red, borderColor: colors.red }]}>
                    {isOn && <Text style={[s.checkmark, { color: '#fff' }]}>&#10003;</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[s.hint, { color: colors.textMuted }]}>Drag order reflects display order in the quick actions panel.</Text>
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
    maxHeight: '75%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.heading, fontSize: FontSize.xl },
  subtitle: { fontFamily: Fonts.body, fontSize: FontSize.sm, marginTop: 2 },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  saveBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.sm },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, marginBottom: 4,
    borderWidth: 1,
  },
  rowDisabled: { opacity: 0.4 },
  rowContent: { flex: 1 },
  rowLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md },
  rowDesc: { fontFamily: Fonts.body, fontSize: FontSize.xs, marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, fontFamily: Fonts.bodyBold },
  hint: {
    fontFamily: Fonts.body, fontSize: FontSize.xs,
    textAlign: 'center', marginTop: Spacing.md,
  },
});
