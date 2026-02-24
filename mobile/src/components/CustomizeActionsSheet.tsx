import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { Colors, Fonts, Spacing, FontSize, BorderRadius } from '@/constants/colors';

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
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Customize Actions</Text>
              <Text style={s.subtitle}>
                {selected.length}/{MAX} selected
              </Text>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, selected.length === 0 && s.saveBtnOff]}
              onPress={() => { onSave(selected); onClose(); }}
              disabled={selected.length === 0}
              activeOpacity={0.8}
            >
              <Text style={s.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {availableActions.map((action) => {
              const isOn = selected.includes(action.id);
              const isDisabled = !isOn && selected.length >= MAX;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[s.row, isOn && s.rowActive, isDisabled && s.rowDisabled]}
                  onPress={() => toggle(action.id)}
                  activeOpacity={0.7}
                  disabled={isDisabled}
                >
                  <View style={s.rowContent}>
                    <Text style={[s.rowLabel, isDisabled && s.rowLabelDimmed]}>{action.label}</Text>
                    <Text style={[s.rowDesc, isDisabled && s.rowLabelDimmed]}>{action.description}</Text>
                  </View>
                  <View style={[s.checkbox, isOn && s.checkboxOn]}>
                    {isOn && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={s.hint}>Drag order reflects display order in the quick actions panel.</Text>
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
    maxHeight: '75%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.heading, fontSize: FontSize.xl, color: Colors.textPrimary },
  subtitle: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  saveBtn: {
    backgroundColor: Colors.red, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  saveBtnOff: { backgroundColor: Colors.navyLight },
  saveBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, color: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, marginBottom: 4,
    borderWidth: 1, borderColor: 'transparent',
  },
  rowActive: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' },
  rowDisabled: { opacity: 0.4 },
  rowContent: { flex: 1 },
  rowLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md, color: Colors.textPrimary },
  rowDesc: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowLabelDimmed: { color: Colors.textMuted },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.red, borderColor: Colors.red },
  checkmark: { fontSize: 12, color: '#fff', fontFamily: Fonts.bodyBold },
  hint: {
    fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.md,
  },
});
