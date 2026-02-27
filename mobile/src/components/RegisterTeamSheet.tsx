import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { api } from '@/api/client';
import type { Event } from '@/types';
import { DynamicSheet, SHEET_BODY_MAX } from './DynamicSheet';

// ── Types ─────────────────────────────────────────────────────
interface RosterPlayer {
  jerseyNumber: string | null;
  firstName: string;
  lastName: string;
}

interface ProgramTeam {
  id: string;
  name: string;
  division: string | null;
  coachName: string | null;
  rosterCount: number;
  roster: RosterPlayer[];
}

interface Program {
  id: string;
  name: string;
  teams: ProgramTeam[];
}

interface TimeConstraint {
  type: 'NOT_BEFORE' | 'NOT_AFTER' | 'NOT_BETWEEN';
  day: 'Friday' | 'Saturday' | 'Sunday';
  time: string;
  endTime?: string;
}

interface ScheduleRequest {
  coachConflict: boolean;
  maxGamesPerDay: number | null;
  constraints: TimeConstraint[];
  matchupRestrictions: string[];
}

type Step = 'teams' | 'rosters' | 'confirm' | 'success';

interface Props {
  visible: boolean;
  onClose: () => void;
  event: Event;
  userRole: string | undefined;
}

const CONSTRAINT_TYPES: { value: TimeConstraint['type']; label: string }[] = [
  { value: 'NOT_BEFORE', label: 'Not Before' },
  { value: 'NOT_AFTER',  label: 'Not After'  },
  { value: 'NOT_BETWEEN', label: 'Not Between' },
];
const DAYS: TimeConstraint['day'][] = ['Friday', 'Saturday', 'Sunday'];

// Body max for this sheet is a bit smaller to account for the progress bar
const REGISTER_BODY_MAX = Math.max(SHEET_BODY_MAX - 50, 280);

function defaultSchedule(): ScheduleRequest {
  return { coachConflict: false, maxGamesPerDay: null, constraints: [], matchupRestrictions: [] };
}

export function RegisterTeamSheet({ visible, onClose, event, userRole }: Props) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('teams');
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedRosterIds, setExpandedRosterIds] = useState<Set<string>>(new Set());
  const [expandedScheduleIds, setExpandedScheduleIds] = useState<Set<string>>(new Set());
  const [scheduleMap, setScheduleMap] = useState<Map<string, ScheduleRequest>>(new Map());
  const [rostersConfirmed, setRostersConfirmed] = useState(false);
  const [registeredTeams, setRegisteredTeams] = useState<ProgramTeam[]>([]);

  // Reset and load on open
  useEffect(() => {
    if (visible && userRole === 'PROGRAM_DIRECTOR') {
      setStep('teams'); setSelectedIds(new Set()); setExpandedRosterIds(new Set());
      setExpandedScheduleIds(new Set()); setScheduleMap(new Map());
      setRostersConfirmed(false); setError(''); setRegisteredTeams([]);
      loadProgram();
    }
  }, [visible]);

  const loadProgram = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ program: Program | null }>('/api/director/program');
      setProgram(data.program);
    } catch (e: any) {
      setError('Failed to load your program. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Team eligibility ───────────────────────────────────────
  const getEligibility = (team: ProgramTeam): { eligible: boolean; reason?: string } => {
    const alreadyRegistered = (event as any).teams?.some((et: any) => et.team?.id === team.id || et.teamId === team.id);
    if (alreadyRegistered) return { eligible: false, reason: 'Already registered' };
    if (event.divisions?.length > 0 && team.division && !event.divisions.includes(team.division)) {
      return { eligible: false, reason: `Division ${team.division} not accepted` };
    }
    return { eligible: true };
  };

  // ── Schedule helpers ───────────────────────────────────────
  const getSched = (id: string) => scheduleMap.get(id) ?? defaultSchedule();

  const updateSched = (id: string, updates: Partial<ScheduleRequest>) => {
    setScheduleMap(prev => {
      const map = new Map(prev);
      map.set(id, { ...getSched(id), ...updates });
      return map;
    });
  };

  const addConstraint = (id: string) => {
    const curr = getSched(id);
    updateSched(id, { constraints: [...curr.constraints, { type: 'NOT_BEFORE', day: 'Saturday', time: '08:00' }] });
  };

  const updateConstraint = (id: string, idx: number, patch: Partial<TimeConstraint>) => {
    const curr = getSched(id);
    const cons = [...curr.constraints];
    cons[idx] = { ...cons[idx], ...patch };
    updateSched(id, { constraints: cons });
  };

  const removeConstraint = (id: string, idx: number) => {
    const curr = getSched(id);
    updateSched(id, { constraints: curr.constraints.filter((_, i) => i !== idx) });
  };

  const toggleMatchup = (teamId: string, otherId: string) => {
    setScheduleMap(prev => {
      const map = new Map(prev);
      const curr = map.get(teamId) ?? defaultSchedule();
      const has = curr.matchupRestrictions.includes(otherId);
      const updated = has ? curr.matchupRestrictions.filter(i => i !== otherId) : [...curr.matchupRestrictions, otherId];
      map.set(teamId, { ...curr, matchupRestrictions: updated });
      // Reciprocal
      const other = map.get(otherId) ?? defaultSchedule();
      const otherHas = other.matchupRestrictions.includes(teamId);
      map.set(otherId, { ...other, matchupRestrictions: otherHas ? other.matchupRestrictions.filter(i => i !== teamId) : [...other.matchupRestrictions, teamId] });
      return map;
    });
  };

  // ── Toggle selection ───────────────────────────────────────
  const toggleTeam = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
        setScheduleMap(m => { const nm = new Map(m); nm.delete(id); return nm; });
        setExpandedScheduleIds(e => { const ne = new Set(e); ne.delete(id); return ne; });
      } else {
        s.add(id);
      }
      return s;
    });
  };

  const selectedTeams = program?.teams.filter(t => selectedIds.has(t.id)) ?? [];
  const isFree = !event.entryFee || Number(event.entryFee) === 0;
  const totalFee = isFree ? 0 : Number(event.entryFee) * selectedTeams.length;

  // ── Submit registration ────────────────────────────────────
  const handleRegister = async () => {
    setIsSubmitting(true); setError('');
    try {
      const payload: Record<string, ScheduleRequest> = {};
      for (const id of selectedIds) {
        const s = scheduleMap.get(id);
        if (s && (s.coachConflict || s.maxGamesPerDay !== null || s.constraints.length > 0 || s.matchupRestrictions.length > 0)) {
          payload[id] = s;
        }
      }
      await api.post(`/api/events/${event.id}/register-teams`, {
        teamIds: Array.from(selectedIds),
        ...(Object.keys(payload).length > 0 ? { scheduleRequests: payload } : {}),
      });
      setRegisteredTeams(selectedTeams);
      setStep('success');
    } catch (e: any) {
      setError(e.message || 'Failed to register teams. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────
  const renderNotDirector = () => (
    <View style={styles.centeredBox}>
      <Text style={[styles.centeredTitle, { color: colors.textPrimary }]}>Director Account Required</Text>
      <Text style={[styles.centeredDesc, { color: colors.textMuted }]}>
        Only Program Directors can register teams for events. Log in with a director account to access this feature.
      </Text>
    </View>
  );

  const renderTeams = () => (
    <>
      {!program || program.teams.length === 0 ? (
        <View style={styles.centeredBox}>
          <Text style={[styles.centeredTitle, { color: colors.textPrimary }]}>No Teams Found</Text>
          <Text style={[styles.centeredDesc, { color: colors.textMuted }]}>
            Create teams in your program before registering for events.
          </Text>
        </View>
      ) : (
        program.teams.map(team => {
          const { eligible, reason } = getEligibility(team);
          const isSelected = selectedIds.has(team.id);
          const alreadyIn = reason === 'Already registered';
          const schedExpanded = expandedScheduleIds.has(team.id);
          const sched = getSched(team.id);
          const schedCount = (sched.coachConflict ? 1 : 0) + (sched.maxGamesPerDay !== null ? 1 : 0) + sched.constraints.length + sched.matchupRestrictions.length;

          return (
            <View key={team.id} style={[
              styles.teamCard,
              { borderColor: colors.border, backgroundColor: colors.background },
              alreadyIn && styles.teamCardDisabled,
              !eligible && !alreadyIn && { borderColor: colors.warningBorder },
              isSelected && { borderColor: colors.textSecondary },
            ]}>
              <TouchableOpacity
                style={styles.teamCardRow}
                onPress={() => eligible && !alreadyIn && toggleTeam(team.id)}
                activeOpacity={eligible && !alreadyIn ? 0.7 : 1}
              >
                <View style={[
                  styles.teamCheckbox,
                  { borderColor: colors.border },
                  alreadyIn && { borderColor: colors.textMuted, backgroundColor: colors.surfaceLight },
                  isSelected && { borderColor: colors.textSecondary, backgroundColor: colors.surfaceLight },
                  !eligible && !alreadyIn && { borderColor: colors.warningBorder },
                ]}>
                  {(isSelected || alreadyIn) && <Text style={[styles.teamCheckTick, { color: colors.textPrimary }, alreadyIn && { color: colors.textMuted }]}>✓</Text>}
                </View>
                <View style={styles.teamInfo}>
                  <View style={styles.teamNameRow}>
                    <Text style={[styles.teamName, { color: colors.textPrimary }]}>{team.name}</Text>
                    {alreadyIn && <View style={[styles.registeredBadge, { backgroundColor: colors.surfaceLight }]}><Text style={[styles.registeredBadgeText, { color: colors.textMuted }]}>Registered</Text></View>}
                  </View>
                  <View style={styles.teamMeta}>
                    {team.division && <View style={[styles.divChip, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}><Text style={[styles.divChipText, { color: colors.textSecondary }]}>{team.division}</Text></View>}
                    <Text style={[styles.teamRoster, { color: colors.textMuted }]}>{team.rosterCount} players</Text>
                  </View>
                </View>
                <Text style={[styles.eligIcon, !eligible && !alreadyIn ? { color: colors.warning } : { color: colors.success }]}>
                  {alreadyIn ? '✓' : eligible ? '✓' : '⚠'}
                </Text>
              </TouchableOpacity>

              {!eligible && !alreadyIn && (
                <View style={styles.ineligibleRow}>
                  <Text style={[styles.ineligibleText, { color: colors.warning }]}>⚠ {reason}</Text>
                </View>
              )}

              {isSelected && (
                <View style={[styles.schedSection, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.schedToggle}
                    onPress={() => setExpandedScheduleIds(prev => {
                      const ne = new Set(prev);
                      ne.has(team.id) ? ne.delete(team.id) : ne.add(team.id);
                      return ne;
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.schedToggleLabel, { color: colors.textSecondary }]}>
                      Scheduling Restrictions{schedCount > 0 ? ` (${schedCount})` : ''}
                    </Text>
                    <Text style={[styles.schedToggleChevron, { color: colors.textMuted }]}>{schedExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {schedExpanded && (
                    <View style={styles.schedBody}>
                      {/* Coach conflict */}
                      <TouchableOpacity
                        style={styles.schedToggleRow}
                        onPress={() => updateSched(team.id, { coachConflict: !sched.coachConflict })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.smallCheck, { borderColor: colors.border }, sched.coachConflict && { borderColor: colors.textSecondary, backgroundColor: colors.surfaceLight }]}>
                          {sched.coachConflict && <Text style={[styles.smallCheckTick, { color: colors.textPrimary }]}>✓</Text>}
                        </View>
                        <View style={styles.schedOptionText}>
                          <Text style={[styles.schedOptionTitle, { color: colors.textPrimary }]}>Coach has another team in this event</Text>
                          <Text style={[styles.schedOptionDesc, { color: colors.textMuted }]}>Avoid scheduling conflicts with another coached team</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Max games per day */}
                      <View style={styles.schedRow}>
                        <Text style={[styles.schedRowLabel, { color: colors.textSecondary }]}>Max Games Per Day</Text>
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={[styles.stepBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                            onPress={() => updateSched(team.id, { maxGamesPerDay: Math.max(1, (sched.maxGamesPerDay ?? 1) - 1) })}
                          >
                            <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
                          </TouchableOpacity>
                          <Text style={[styles.stepValue, { color: colors.textPrimary }]}>
                            {sched.maxGamesPerDay ?? '—'}
                          </Text>
                          <TouchableOpacity
                            style={[styles.stepBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                            onPress={() => updateSched(team.id, { maxGamesPerDay: Math.min(10, (sched.maxGamesPerDay ?? 0) + 1) })}
                          >
                            <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
                          </TouchableOpacity>
                          {sched.maxGamesPerDay !== null && (
                            <TouchableOpacity onPress={() => updateSched(team.id, { maxGamesPerDay: null })}>
                              <Text style={[styles.clearStep, { color: colors.textMuted }]}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Time constraints */}
                      <View style={styles.schedRow}>
                        <Text style={[styles.schedRowLabel, { color: colors.textSecondary }]}>Date/Time Restrictions</Text>
                        <TouchableOpacity onPress={() => addConstraint(team.id)}>
                          <Text style={[styles.addConstraintBtn, { color: colors.textSecondary }]}>+ Add</Text>
                        </TouchableOpacity>
                      </View>
                      {sched.constraints.map((c, ci) => (
                        <View key={ci} style={[styles.constraintRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {CONSTRAINT_TYPES.map(ct => (
                              <TouchableOpacity
                                key={ct.value}
                                style={[styles.chipOption, { backgroundColor: colors.background, borderColor: colors.border }, c.type === ct.value && { backgroundColor: colors.surfaceLight, borderColor: colors.textSecondary }]}
                                onPress={() => updateConstraint(team.id, ci, { type: ct.value })}
                              >
                                <Text style={[styles.chipOptionText, { color: colors.textMuted }, c.type === ct.value && { color: colors.textPrimary }]}>{ct.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                            {DAYS.map(d => (
                              <TouchableOpacity
                                key={d}
                                style={[styles.chipOption, { backgroundColor: colors.background, borderColor: colors.border }, c.day === d && { backgroundColor: colors.surfaceLight, borderColor: colors.textSecondary }]}
                                onPress={() => updateConstraint(team.id, ci, { day: d })}
                              >
                                <Text style={[styles.chipOptionText, { color: colors.textMuted }, c.day === d && { color: colors.textPrimary }]}>{d}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <View style={styles.timesRow}>
                            <TextInput
                              style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                              value={c.time}
                              onChangeText={v => updateConstraint(team.id, ci, { time: v })}
                              placeholder="08:00"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numbers-and-punctuation"
                            />
                            {c.type === 'NOT_BETWEEN' && (
                              <>
                                <Text style={[styles.toText, { color: colors.textMuted }]}>to</Text>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                                  value={c.endTime ?? ''}
                                  onChangeText={v => updateConstraint(team.id, ci, { endTime: v })}
                                  placeholder="17:00"
                                  placeholderTextColor={colors.textMuted}
                                  keyboardType="numbers-and-punctuation"
                                />
                              </>
                            )}
                            <TouchableOpacity onPress={() => removeConstraint(team.id, ci)} style={[styles.removeBtn, { backgroundColor: colors.background }]}>
                              <Text style={[styles.removeBtnText, { color: colors.textMuted }]}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      {/* Matchup restrictions */}
                      {selectedTeams.filter(t => t.id !== team.id).length > 0 && (
                        <View>
                          <Text style={[styles.schedRowLabel, { color: colors.textSecondary }]}>Matchup Restrictions</Text>
                          <Text style={[styles.schedOptionDesc, { color: colors.textMuted }]}>Prevent this team from playing your other teams</Text>
                          {selectedTeams.filter(t => t.id !== team.id).map(other => {
                            const restricted = sched.matchupRestrictions.includes(other.id);
                            return (
                              <TouchableOpacity
                                key={other.id}
                                style={[styles.matchupRow, { backgroundColor: colors.background }]}
                                onPress={() => toggleMatchup(team.id, other.id)}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.smallCheck, { borderColor: colors.border }, restricted && { borderColor: colors.textSecondary, backgroundColor: colors.surfaceLight }]}>
                                  {restricted && <Text style={[styles.smallCheckTick, { color: colors.textPrimary }]}>✓</Text>}
                                </View>
                                <Text style={[styles.matchupName, { color: colors.textPrimary }]}>{other.name}</Text>
                                {other.division && <Text style={[styles.matchupDiv, { color: colors.textMuted }]}>{other.division}</Text>}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
      {!!error && <Text style={[styles.errorText, { color: colors.redLight, backgroundColor: colors.redTint, borderColor: colors.redTint }]}>{error}</Text>}
    </>
  );

  const renderRosters = () => (
    <>
      <Text style={[styles.stepDesc, { color: colors.textMuted }]}>Please verify that rosters for your selected teams are up to date.</Text>
      {selectedTeams.map(team => {
        const expanded = expandedRosterIds.has(team.id);
        const empty = team.rosterCount === 0;
        return (
          <View key={team.id} style={[styles.rosterCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.rosterCardHeader}
              onPress={() => setExpandedRosterIds(prev => {
                const s = new Set(prev); s.has(team.id) ? s.delete(team.id) : s.add(team.id); return s;
              })}
              activeOpacity={0.7}
            >
              <View style={[styles.rosterStatusIcon, empty ? { backgroundColor: colors.warningTint } : { backgroundColor: colors.successTint }]}>
                <Text style={styles.rosterStatusText}>{empty ? '⚠' : '✓'}</Text>
              </View>
              <View style={styles.rosterInfo}>
                <Text style={[styles.rosterTeamName, { color: colors.textPrimary }]}>{team.name}</Text>
                <Text style={[styles.rosterCount, { color: colors.textMuted }, empty && { color: colors.warning }]}>
                  {team.rosterCount} players{empty ? ' — Roster is empty!' : ''}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expanded && (
              <View style={[styles.rosterList, { borderTopColor: colors.border }]}>
                {empty ? (
                  <Text style={[styles.rosterEmpty, { color: colors.textMuted }]}>No players on this roster yet.</Text>
                ) : (
                  team.roster.map((p, i) => (
                    <View key={i} style={styles.rosterPlayerRow}>
                      <Text style={[styles.rosterJersey, { color: colors.textMuted }]}>{p.jerseyNumber ? `#${p.jerseyNumber}` : '—'}</Text>
                      <Text style={[styles.rosterPlayerName, { color: colors.textSecondary }]}>{p.firstName} {p.lastName}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.confirmRow, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => setRostersConfirmed(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, { borderColor: colors.border }, rostersConfirmed && { borderColor: colors.textSecondary, backgroundColor: colors.surfaceLight }]}>
          {rostersConfirmed && <Text style={[styles.checkboxTick, { color: colors.textPrimary }]}>✓</Text>}
        </View>
        <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
          I confirm that all rosters are up-to-date and accurate. I understand rosters may be verified before or during the event.
        </Text>
      </TouchableOpacity>
      {!!error && <Text style={[styles.errorText, { color: colors.redLight, backgroundColor: colors.redTint, borderColor: colors.redTint }]}>{error}</Text>}
    </>
  );

  const renderConfirm = () => (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAMS</Text>
      {selectedTeams.map(team => (
        <View key={team.id} style={[styles.summaryTeamRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.summaryTeamName, { color: colors.textPrimary }]}>{team.name}</Text>
            {team.division && <Text style={[styles.summaryTeamDiv, { color: colors.textMuted }]}>{team.division}</Text>}
          </View>
          {!isFree && <Text style={[styles.summaryFee, { color: colors.textPrimary }]}>${Number(event.entryFee).toFixed(0)}</Text>}
        </View>
      ))}

      {!isFree && (
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.totalAmount, { color: colors.textPrimary }]}>${totalFee.toFixed(0)}</Text>
        </View>
      )}

      {isFree && (
        <View style={[styles.freeNotice, { backgroundColor: colors.successTint, borderColor: colors.successBorder }]}>
          <Text style={[styles.freeNoticeText, { color: colors.success }]}>✓ This is a free event — no payment required</Text>
        </View>
      )}

      {!isFree && (
        <View style={[styles.paymentNotice, { backgroundColor: colors.warningTint, borderColor: colors.warningBorder }]}>
          <Text style={[styles.paymentNoticeText, { color: colors.warning }]}>
            ⚠ Payment integration coming soon. Registration will be confirmed without payment.
          </Text>
        </View>
      )}

      {!!error && <Text style={[styles.errorText, { color: colors.redLight, backgroundColor: colors.redTint, borderColor: colors.redTint }]}>{error}</Text>}
    </>
  );

  const renderSuccess = () => (
    <View style={styles.centeredBox}>
      <Text style={[styles.successIcon, { color: colors.success }]}>✓</Text>
      <Text style={[styles.centeredTitle, { color: colors.textPrimary }]}>Registration Complete!</Text>
      <Text style={[styles.centeredDesc, { color: colors.textMuted }]}>
        Your teams have been registered for {event.name}.
      </Text>
      <View style={styles.successTeams}>
        {registeredTeams.map(t => (
          <View key={t.id} style={[styles.successTeamRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.successTeamCheck, { color: colors.success }]}>✓</Text>
            <View>
              <Text style={[styles.successTeamName, { color: colors.textPrimary }]}>{t.name}</Text>
              {t.division && <Text style={[styles.successTeamDiv, { color: colors.textMuted }]}>{t.division}</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const stepTitle: Record<Step, string> = {
    teams: 'Select Teams',
    rosters: 'Verify Rosters',
    confirm: isFree ? 'Confirm Registration' : 'Payment Summary',
    success: 'Registered!',
  };

  return (
    <DynamicSheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Register Your Team</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{event.name}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {userRole === 'PROGRAM_DIRECTOR' && step !== 'success' && (
        <View style={[styles.progress, { borderBottomColor: colors.border }]}>
          {(['teams', 'rosters', 'confirm'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <View style={[styles.progressStep, (step === s || (i < ['teams','rosters','confirm'].indexOf(step))) && { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.progressStepNum, { backgroundColor: colors.border, color: colors.textPrimary }]}>{i + 1}</Text>
                <Text style={[styles.progressStepLabel, { color: colors.textSecondary }]}>{stepTitle[s]}</Text>
              </View>
              {i < 2 && <View style={[styles.progressLine, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Body */}
      <ScrollView
        style={[styles.body, { maxHeight: REGISTER_BODY_MAX }]}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {userRole !== 'PROGRAM_DIRECTOR'
          ? renderNotDirector()
          : isLoading
            ? <ActivityIndicator size="large" color={colors.textMuted} style={{ marginTop: 40 }} />
            : step === 'teams' ? renderTeams()
              : step === 'rosters' ? renderRosters()
                : step === 'confirm' ? renderConfirm()
                  : renderSuccess()
        }
      </ScrollView>

      {/* Footer navigation */}
      {userRole === 'PROGRAM_DIRECTOR' && !isLoading && step !== 'success' && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {step !== 'teams' ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === 'rosters') setStep('teams');
                else if (step === 'confirm') setStep('rosters');
              }}
            >
              <Text style={[styles.backBtnText, { color: colors.textMuted }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.surfaceLight, borderColor: colors.border },
              (isSubmitting || (step === 'teams' && selectedIds.size === 0) || (step === 'rosters' && !rostersConfirmed)) && styles.primaryBtnDisabled,
            ]}
            disabled={isSubmitting || (step === 'teams' && selectedIds.size === 0) || (step === 'rosters' && !rostersConfirmed)}
            onPress={() => {
              setError('');
              if (step === 'teams') setStep('rosters');
              else if (step === 'rosters') setStep('confirm');
              else handleRegister();
            }}
            activeOpacity={0.85}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color={colors.textPrimary} />
              : <Text style={[styles.primaryBtnText, { color: colors.textPrimary }]}>
                  {step === 'teams' ? 'Continue ›'
                    : step === 'rosters' ? 'Continue ›'
                      : 'Complete Registration'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {step === 'success' && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View />
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={[styles.primaryBtnText, { color: colors.textPrimary }]}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
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
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'transparent',
  },
  progressStepNum: {
    width: 18, height: 18, borderRadius: 9,
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    textAlign: 'center',
    lineHeight: 18,
  },
  progressStepLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
  },
  progressLine: {
    flex: 1,
    height: 1,
  },
  body: {},
  bodyContent: { padding: Spacing.lg, gap: Spacing.md },
  stepDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    marginBottom: Spacing.sm,
  },

  // Team cards
  teamCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  teamCardDisabled: { opacity: 0.5 },
  teamCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  teamCheckbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  teamCheckTick: { fontSize: 12, fontFamily: Fonts.bodyBold },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  teamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
  registeredBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  registeredBadgeText: { fontSize: 9, fontFamily: Fonts.bodyMedium, textTransform: 'uppercase', letterSpacing: 0.5 },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  divChip: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 1,
    borderWidth: 1,
  },
  divChipText: { fontSize: 10, fontFamily: Fonts.bodyMedium },
  teamRoster: { fontSize: FontSize.xs, fontFamily: Fonts.body },
  eligIcon: { fontSize: 14, fontFamily: Fonts.bodyBold },
  ineligibleRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  ineligibleText: { fontSize: FontSize.xs, fontFamily: Fonts.body },

  // Schedule
  schedSection: { borderTopWidth: 1 },
  schedToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  schedToggleLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium },
  schedToggleChevron: { fontSize: 10 },
  schedBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.md },
  schedToggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  schedOptionText: { flex: 1 },
  schedOptionTitle: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium },
  schedOptionDesc: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 1 },
  schedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  schedRowLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 28, height: 28, borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 16, lineHeight: 20 },
  stepValue: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, minWidth: 24, textAlign: 'center' },
  clearStep: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium },
  addConstraintBtn: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium },
  constraintRow: {
    borderRadius: BorderRadius.md,
    padding: Spacing.sm, gap: 4, borderWidth: 1,
  },
  chipOption: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1, marginRight: 4,
  },
  chipOptionText: { fontSize: 10, fontFamily: Fonts.bodyMedium },
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  timeInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4,
    fontSize: FontSize.xs, fontFamily: Fonts.body, width: 72,
  },
  toText: { fontSize: FontSize.xs, fontFamily: Fonts.body },
  removeBtn: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 10 },
  matchupRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, marginTop: 4,
  },
  matchupName: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, flex: 1 },
  matchupDiv: { fontSize: 10, fontFamily: Fonts.body },

  // Rosters
  rosterCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  rosterCardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rosterStatusIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rosterStatusText: { fontSize: 14 },
  rosterInfo: { flex: 1 },
  rosterTeamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
  rosterCount: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 1 },
  chevron: { fontSize: 10 },
  rosterList: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  rosterEmpty: { fontSize: FontSize.sm, fontFamily: Fonts.body, paddingVertical: Spacing.sm },
  rosterPlayerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: Spacing.md },
  rosterJersey: { width: 32, textAlign: 'right', fontSize: FontSize.xs, fontFamily: Fonts.body },
  rosterPlayerName: { fontSize: FontSize.sm, fontFamily: Fonts.body },
  confirmRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, padding: Spacing.md, marginTop: Spacing.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxTick: { fontSize: 12, fontFamily: Fonts.bodyBold },
  confirmText: { flex: 1, fontSize: FontSize.xs, fontFamily: Fonts.body, lineHeight: 18 },

  // Summary
  sectionLabel: {
    fontSize: 10, fontFamily: Fonts.bodyBold,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  summaryTeamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1,
  },
  summaryTeamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
  summaryTeamDiv: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 1 },
  summaryFee: { fontSize: FontSize.md, fontFamily: Fonts.bodyBold },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.md, borderTopWidth: 1, marginTop: Spacing.sm,
  },
  totalLabel: { fontSize: FontSize.md, fontFamily: Fonts.bodyMedium },
  totalAmount: { fontSize: 28, fontFamily: Fonts.headingBlack },
  freeNotice: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  freeNoticeText: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium },
  paymentNotice: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  paymentNoticeText: { fontSize: FontSize.xs, fontFamily: Fonts.body, lineHeight: 18 },

  // Success
  successIcon: { fontSize: 48, textAlign: 'center', marginBottom: Spacing.md },
  successTeams: { width: '100%', marginTop: Spacing.lg, gap: Spacing.sm },
  successTeamRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1,
  },
  successTeamCheck: { fontSize: 16 },
  successTeamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
  successTeamDiv: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 1 },

  // Centered states
  centeredBox: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  centeredTitle: {
    fontSize: FontSize.lg, fontFamily: Fonts.heading,
    marginBottom: Spacing.sm, textAlign: 'center',
  },
  centeredDesc: {
    fontSize: FontSize.sm, fontFamily: Fonts.body,
    textAlign: 'center', lineHeight: 20,
  },

  // Shared
  smallCheck: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  smallCheckTick: { fontSize: 10, fontFamily: Fonts.bodyBold },
  errorText: {
    fontSize: FontSize.sm, fontFamily: Fonts.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
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
  backBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium },
  primaryBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    alignItems: 'center', justifyContent: 'center', minWidth: 160,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
});
