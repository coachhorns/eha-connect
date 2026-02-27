import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { recruitingApi } from '@/api/recruiting';
import type { College, CollegeCoach } from '@/types';

type Step = 'search' | 'coaches' | 'compose';

export default function RecruitingScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ playerSlugs: string; playerName: string }>();
  const playerSlugs = params.playerSlugs?.split(',') ?? [];
  const playerName = params.playerName ?? 'Player';

  const [step, setStep] = useState<Step>('search');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // College / Coach state
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(false);

  // Compose state
  const [selectedCoach, setSelectedCoach] = useState<CollegeCoach | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await recruitingApi.getFilters();
        setDivisions(data.divisions ?? []);
        setStates(data.states ?? []);
        setFiltersLoaded(true);
      } catch (e) {
        console.error('Failed to load filters:', e);
        setFiltersLoaded(true);
      }
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      if (!selectedDivision && !selectedState) setColleges([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await recruitingApi.searchColleges(searchQuery);
        setColleges(data.colleges ?? []);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter by division/state
  const applyFilters = useCallback(async () => {
    if (!selectedDivision && !selectedState) return;
    setIsLoading(true);
    try {
      const data = await recruitingApi.filterColleges({
        division: selectedDivision || undefined,
        state: selectedState || undefined,
      });
      setColleges(data.colleges ?? []);
    } catch (e) {
      console.error('Filter failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDivision, selectedState]);

  useEffect(() => {
    if (selectedDivision || selectedState) {
      applyFilters();
    }
  }, [selectedDivision, selectedState, applyFilters]);

  // Select a college → load coaches
  const handleSelectCollege = async (college: College) => {
    setIsLoadingCoaches(true);
    setSelectedCollege(college);
    setStep('coaches');
    try {
      const data = await recruitingApi.getCollegeWithCoaches(college.id);
      setSelectedCollege(data.college);
    } catch (e) {
      console.error('Failed to load coaches:', e);
      Alert.alert('Error', 'Failed to load coaches for this college.');
    } finally {
      setIsLoadingCoaches(false);
    }
  };

  // Select a coach → go to compose
  const handleSelectCoach = (coach: CollegeCoach) => {
    setSelectedCoach(coach);
    setEmailSubject(`Recruiting Interest: ${playerName}`);
    setEmailBody(
      `Dear Coach ${coach.lastName},\n\nI am writing to express my interest in your basketball program at ${selectedCollege?.name}. I would love the opportunity to discuss how I could contribute to your team.\n\nPlease find a link to my player profile included in this email.\n\nThank you for your time and consideration.\n\nBest regards,\n${playerName}`
    );
    setStep('compose');
  };

  // Send email
  const handleSend = async () => {
    if (!selectedCoach?.email || !emailSubject.trim() || !emailBody.trim()) return;
    setIsSending(true);
    try {
      await recruitingApi.sendEmail({
        coachEmail: selectedCoach.email,
        coachName: `${selectedCoach.firstName} ${selectedCoach.lastName}`,
        coachId: selectedCoach.id,
        collegeId: selectedCollege?.id,
        collegeName: selectedCollege?.name ?? '',
        playerSlugs,
        subject: emailSubject,
        message: emailBody,
      });
      Alert.alert('Sent!', `Email sent to Coach ${selectedCoach.lastName} at ${selectedCollege?.name}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Back handler per step
  const handleBack = () => {
    if (step === 'compose') {
      setStep('coaches');
      setSelectedCoach(null);
    } else if (step === 'coaches') {
      setStep('search');
      setSelectedCollege(null);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>{'\u2039'} Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {step === 'search' ? 'Find College' : step === 'coaches' ? selectedCollege?.name ?? 'Coaches' : 'Compose Email'}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      {/* ── STEP 1: SEARCH / FILTER ─────────────────────── */}
      {step === 'search' && (
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* Search input */}
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Search by school name..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />

          {/* Filter pills */}
          {filtersLoaded && (
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {/* Division pills */}
                {divisions.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.filterPill,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedDivision === d && { backgroundColor: colors.red, borderColor: colors.red },
                    ]}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedDivision(selectedDivision === d ? '' : d);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.filterPillText,
                      { color: colors.textSecondary },
                      selectedDivision === d && { color: '#fff' },
                    ]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Results */}
          {isLoading ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: Spacing.xxl }} />
          ) : (
            <View style={styles.results}>
              {colleges.map((college) => (
                <TouchableOpacity
                  key={college.id}
                  style={[styles.collegeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleSelectCollege(college)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.collegeIcon, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.collegeIconText, { color: colors.textSecondary }]}>
                      {college.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.collegeInfo}>
                    <Text style={[styles.collegeName, { color: colors.textPrimary }]}>{college.name}</Text>
                    <Text style={[styles.collegeMeta, { color: colors.textMuted }]}>
                      {[college.city, college.state, college.conference, college.division]
                        .filter(Boolean)
                        .join(' \u00B7 ')}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>{'\u203A'}</Text>
                </TouchableOpacity>
              ))}
              {colleges.length === 0 && !isLoading && (searchQuery.length >= 2 || selectedDivision || selectedState) && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No colleges found</Text>
              )}
              {colleges.length === 0 && !isLoading && searchQuery.length < 2 && !selectedDivision && !selectedState && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Search or filter to find colleges</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── STEP 2: COACHES LIST ────────────────────────── */}
      {step === 'coaches' && (
        <ScrollView style={styles.body}>
          {/* College header */}
          <View style={[styles.collegeHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.collegeHeaderName, { color: colors.textPrimary }]}>{selectedCollege?.name}</Text>
            <Text style={[styles.collegeHeaderMeta, { color: colors.textMuted }]}>
              {[selectedCollege?.division, selectedCollege?.conference, selectedCollege?.state]
                .filter(Boolean)
                .join(' \u00B7 ')}
            </Text>
          </View>

          {isLoadingCoaches ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: Spacing.xxl }} />
          ) : (
            <View style={styles.coachList}>
              {(selectedCollege?.coaches ?? []).map((coach) => (
                <View key={coach.id} style={[styles.coachRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.coachAvatar, { backgroundColor: colors.red + '25' }]}>
                    <Text style={[styles.coachAvatarText, { color: colors.red }]}>
                      {coach.firstName[0]}{coach.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.coachInfo}>
                    <Text style={[styles.coachName, { color: colors.textPrimary }]}>
                      {coach.firstName} {coach.lastName}
                    </Text>
                    {coach.title && (
                      <Text style={[styles.coachTitle, { color: colors.textMuted }]}>{coach.title}</Text>
                    )}
                  </View>
                  {coach.email ? (
                    <TouchableOpacity
                      style={[styles.emailCoachBtn, { backgroundColor: colors.red }]}
                      onPress={() => handleSelectCoach(coach)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emailCoachBtnText}>Email</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.noEmailText, { color: colors.textMuted }]}>No email</Text>
                  )}
                </View>
              ))}
              {(selectedCollege?.coaches ?? []).length === 0 && !isLoadingCoaches && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No coaches found for this college</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── STEP 3: COMPOSE EMAIL ───────────────────────── */}
      {step === 'compose' && (
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* To field */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>To</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>
              {selectedCoach?.firstName} {selectedCoach?.lastName} ({selectedCoach?.email})
            </Text>
          </View>

          {/* Subject */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Subject</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={emailSubject}
            onChangeText={setEmailSubject}
            placeholderTextColor={colors.textMuted}
          />

          {/* Message */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Message</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={emailBody}
            onChangeText={setEmailBody}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            A link to the player profile will be included automatically.
          </Text>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.red }, (isSending || !emailSubject.trim() || !emailBody.trim()) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  backText: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.bodyMedium,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    textAlign: 'center',
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  // Search
  searchInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    marginBottom: Spacing.md,
  },

  // Filters
  filterRow: {
    marginBottom: Spacing.lg,
  },
  filterScroll: {
    gap: Spacing.sm,
  },
  filterPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },

  // Results
  results: {
    gap: Spacing.xs,
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  collegeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  collegeIconText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
  },
  collegeInfo: {
    flex: 1,
  },
  collegeName: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
  collegeMeta: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  chevron: {
    fontSize: FontSize.xxl,
    fontWeight: '300',
  },

  // College header (coaches step)
  collegeHeader: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  collegeHeaderName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
  },
  collegeHeaderMeta: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    marginTop: 4,
  },

  // Coach list
  coachList: {
    gap: Spacing.sm,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  coachAvatarText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.heading,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
  coachTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  emailCoachBtn: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emailCoachBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: '#fff',
  },
  noEmailText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },

  // Compose
  fieldLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  readOnlyField: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  readOnlyText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
  },
  textArea: {
    minHeight: 180,
    paddingTop: Spacing.md,
  },
  helperText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: Spacing.sm,
  },
  sendBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: 40,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    color: '#fff',
  },

  // Empty
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
