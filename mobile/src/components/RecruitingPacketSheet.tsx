import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { api } from '@/api/client';
import { DynamicSheet, SHEET_BODY_MAX } from './DynamicSheet';

// ── Price map (mirrors src/lib/constants.ts) ──────────────────
const PRICE_MAP: Record<string, number> = {
  'ncaa d1': 525,  'ncaa di': 525,
  'ncaa d2': 250,  'ncaa dii': 250,
  'ncaa d3': 100,  'ncaa diii': 100,
  'naia': 200,
  'jc': 50, 'jc-cccaa': 50, 'jc-d1': 50, 'jc-d2': 50, 'jc-d3': 50, 'jc-nwac': 50,
};
function getPrice(division: string): number {
  return PRICE_MAP[division.trim().toLowerCase()] ?? 100;
}

interface CoachResult {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  college: {
    id: string;
    name: string;
    division: string;
    conference: string | null;
    state: string | null;
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

type Step = 'form' | 'summary';

export function RecruitingPacketSheet({ visible, onClose, eventId, eventName }: Props) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('');
  const [collegeCoachId, setCollegeCoachId] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [wantsPhysicalCopy, setWantsPhysicalCopy] = useState(false);
  const [confirmedCoach, setConfirmedCoach] = useState<CoachResult | null>(null);
  const [suggestions, setSuggestions] = useState<CoachResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('form');
      setFirstName(''); setLastName(''); setSchool(''); setEmail('');
      setDivision(''); setCollegeCoachId(null); setCollegeId(null);
      setWantsPhysicalCopy(false); setConfirmedCoach(null);
      setSuggestions([]); setError('');
    }
  }, [visible]);

  const searchCoaches = useCallback(async () => {
    if (confirmedCoach) return;
    if (firstName.length < 2 && lastName.length < 2) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const params: Record<string, string> = {};
      if (firstName) params.firstName = firstName;
      if (lastName) params.lastName = lastName;
      if (school) params.school = school;
      const data = await api.get<{ coaches: CoachResult[] }>('/api/recruiting-packet/search-coach', params);
      setSuggestions(data.coaches);
    } catch { /* silently fail */ } finally {
      setIsSearching(false);
    }
  }, [firstName, lastName, school, confirmedCoach]);

  useEffect(() => {
    const t = setTimeout(searchCoaches, 300);
    return () => clearTimeout(t);
  }, [searchCoaches]);

  const selectCoach = (coach: CoachResult) => {
    setConfirmedCoach(coach);
    setFirstName(coach.firstName); setLastName(coach.lastName);
    setSchool(coach.college.name); setEmail(coach.email || '');
    setDivision(coach.college.division);
    setCollegeCoachId(coach.id); setCollegeId(coach.college.id);
    setSuggestions([]);
  };

  const clearCoach = () => {
    setConfirmedCoach(null); setCollegeCoachId(null);
    setCollegeId(null); setDivision('');
  };

  const validateAndNext = () => {
    if (!firstName.trim() || !lastName.trim() || !school.trim() || !email.trim()) {
      setError('All fields are required'); return;
    }
    if (!email.split('@')[1]?.toLowerCase().endsWith('.edu')) {
      setError('A valid .edu email address is required'); return;
    }
    if (!division) {
      setError('Please select your profile from the suggestions to confirm your division.'); return;
    }
    setError(''); setStep('summary');
  };

  const handleCheckout = async () => {
    setIsSubmitting(true); setError('');
    try {
      const data = await api.post<{ url: string }>('/api/recruiting-packet/register', {
        eventId,
        firstName: firstName.trim(), lastName: lastName.trim(),
        school: school.trim(), email: email.trim().toLowerCase(),
        division, collegeCoachId, collegeId, wantsPhysicalCopy,
      });
      if (data.url) {
        onClose();
        await WebBrowser.openBrowserAsync(data.url);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create checkout session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const price = getPrice(division);
  const showSuggestions = suggestions.length > 0 && !confirmedCoach;

  return (
    <DynamicSheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {step === 'form' ? 'College Recruiting Packet' : 'Packet Summary'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{eventName}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView
        style={[styles.body, { maxHeight: SHEET_BODY_MAX }]}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Form ── */}
        {step === 'form' && (
          <>
            {confirmedCoach ? (
              <View style={[styles.confirmedBanner, { backgroundColor: colors.successTint, borderColor: colors.successBorder }]}>
                <View style={[styles.checkCircle, { backgroundColor: colors.successBorder }]}>
                  <Text style={[styles.checkMark, { color: colors.success }]}>✓</Text>
                </View>
                <View style={styles.confirmedInfo}>
                  <Text style={[styles.confirmedName, { color: colors.textPrimary }]}>
                    {confirmedCoach.firstName} {confirmedCoach.lastName}
                  </Text>
                  <Text style={[styles.confirmedSub, { color: colors.textMuted }]}>
                    {confirmedCoach.title ? `${confirmedCoach.title} · ` : ''}
                    {confirmedCoach.college.name}
                  </Text>
                  <Text style={[styles.confirmedDiv, { color: colors.textMuted }]}>
                    {confirmedCoach.college.division}
                    {confirmedCoach.college.conference ? ` · ${confirmedCoach.college.conference}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearCoach}>
                  <Text style={[styles.changeText, { color: colors.textMuted }]}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.nameRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>First Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }, confirmedCoach && styles.inputDisabled]}
                  value={firstName}
                  onChangeText={v => { setFirstName(v); if (confirmedCoach) clearCoach(); }}
                  placeholder="John"
                  placeholderTextColor={colors.textMuted}
                  editable={!confirmedCoach}
                />
              </View>
              <View style={{ width: Spacing.sm }} />
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Last Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }, confirmedCoach && styles.inputDisabled]}
                  value={lastName}
                  onChangeText={v => { setLastName(v); if (confirmedCoach) clearCoach(); }}
                  placeholder="Smith"
                  placeholderTextColor={colors.textMuted}
                  editable={!confirmedCoach}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>School</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }, confirmedCoach && styles.inputDisabled]}
                value={school}
                onChangeText={v => { setSchool(v); if (confirmedCoach) clearCoach(); }}
                placeholder="University of..."
                placeholderTextColor={colors.textMuted}
                editable={!confirmedCoach}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>School Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }, confirmedCoach && styles.inputDisabled]}
                value={email}
                onChangeText={setEmail}
                placeholder="coach@university.edu"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!confirmedCoach}
              />
              <Text style={[styles.helperText, { color: colors.textMuted }]}>Must be a .edu email address</Text>
            </View>

            {showSuggestions && (
              <View style={[styles.suggestions, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.suggestionsLabel, { color: colors.gold, borderBottomColor: colors.border }]}>IS THIS YOU?</Text>
                {suggestions.map(coach => (
                  <TouchableOpacity
                    key={coach.id}
                    style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                    onPress={() => selectCoach(coach)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestionName, { color: colors.textPrimary }]}>
                      {coach.firstName} {coach.lastName}
                    </Text>
                    <Text style={[styles.suggestionSub, { color: colors.textMuted }]}>
                      {coach.title ? `${coach.title} · ` : ''}{coach.college.name}
                    </Text>
                    <Text style={[styles.suggestionDiv, { color: colors.textMuted }]}>
                      {coach.college.division}
                      {coach.college.state ? ` · ${coach.college.state}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {isSearching && (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={[styles.searchingText, { color: colors.textMuted }]}>Searching coaches...</Text>
              </View>
            )}

            {!!error && <Text style={[styles.errorText, { color: colors.redLight, backgroundColor: colors.redTint, borderColor: colors.redTint }]}>{error}</Text>}
          </>
        )}

        {/* ── STEP 2: Summary ── */}
        {step === 'summary' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WHAT'S INCLUDED</Text>
            {[
              'Up-to-date rosters for all participating teams',
              'Player information and email contacts',
              'Coach and director emails for all programs',
              'Live stats throughout the event',
            ].map((item, i) => (
              <View key={i} style={styles.includeRow}>
                <Text style={[styles.includeDot, { color: colors.textMuted }]}>·</Text>
                <Text style={[styles.includeText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}

            <View style={[styles.priceCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceMeta, { color: colors.textMuted }]}>Division</Text>
                <View style={[styles.divBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                  <Text style={[styles.divBadgeText, { color: colors.textSecondary }]}>{division}</Text>
                </View>
              </View>
              <View style={[styles.priceRow, { marginTop: Spacing.sm }]}>
                <Text style={[styles.priceMeta, { color: colors.textMuted }]}>Total</Text>
                <Text style={[styles.priceAmount, { color: colors.textPrimary }]}>${price.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.physicalRow, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setWantsPhysicalCopy(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, { borderColor: colors.border }, wantsPhysicalCopy && { backgroundColor: colors.surfaceLight, borderColor: colors.textSecondary }]}>
                {wantsPhysicalCopy && <Text style={[styles.checkboxTick, { color: colors.textPrimary }]}>✓</Text>}
              </View>
              <View style={styles.physicalInfo}>
                <Text style={[styles.physicalTitle, { color: colors.textPrimary }]}>Request a physical printed copy</Text>
                <Text style={[styles.physicalDesc, { color: colors.textMuted }]}>
                  A printed packet will be available at check-in when you arrive to the event.
                </Text>
              </View>
            </TouchableOpacity>

            {!!error && <Text style={[styles.errorText, { color: colors.redLight, backgroundColor: colors.redTint, borderColor: colors.redTint }]}>{error}</Text>}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {step === 'summary' ? (
          <TouchableOpacity
            onPress={() => { setStep('form'); setError(''); }}
            style={styles.backBtn}
          >
            <Text style={[styles.backBtnText, { color: colors.textMuted }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }, isSubmitting && styles.primaryBtnDisabled]}
          onPress={step === 'form' ? validateAndNext : handleCheckout}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[styles.primaryBtnText, { color: colors.textPrimary }]}>
                {step === 'form' ? 'Continue ›' : 'Proceed to Payment ›'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </DynamicSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1, marginRight: Spacing.md },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
  },
  headerSub: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  body: {},
  bodyContent: { padding: Spacing.lg, gap: Spacing.md },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkMark: { fontSize: 12, fontFamily: Fonts.bodyBold },
  confirmedInfo: { flex: 1 },
  confirmedName: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },
  confirmedSub: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 1 },
  confirmedDiv: { fontSize: FontSize.xs, fontFamily: Fonts.body },
  changeText: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium },
  nameRow: { flexDirection: 'row' },
  field: { gap: 4 },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
  },
  inputDisabled: { opacity: 0.5 },
  helperText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  suggestionsLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  suggestionRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  suggestionName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  suggestionSub: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  suggestionDiv: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchingText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  includeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  includeDot: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  includeText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    lineHeight: 20,
  },
  priceCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceMeta: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
  },
  divBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  divBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
  },
  priceAmount: {
    fontSize: 24,
    fontFamily: Fonts.headingBlack,
  },
  physicalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxTick: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
  },
  physicalInfo: { flex: 1 },
  physicalTitle: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  physicalDesc: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
  },
  backBtn: { paddingVertical: Spacing.sm },
  backBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },
  primaryBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
});
