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
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
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
      <Text style={styles.centeredTitle}>Director Account Required</Text>
      <Text style={styles.centeredDesc}>
        Only Program Directors can register teams for events. Log in with a director account to access this feature.
      </Text>
    </View>
  );

  const renderTeams = () => (
    <>
      {!program || program.teams.length === 0 ? (
        <View style={styles.centeredBox}>
          <Text style={styles.centeredTitle}>No Teams Found</Text>
          <Text style={styles.centeredDesc}>
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
              alreadyIn && styles.teamCardDisabled,
              !eligible && !alreadyIn && styles.teamCardWarning,
              isSelected && styles.teamCardSelected,
            ]}>
              <TouchableOpacity
                style={styles.teamCardRow}
                onPress={() => eligible && !alreadyIn && toggleTeam(team.id)}
                activeOpacity={eligible && !alreadyIn ? 0.7 : 1}
              >
                <View style={[
                  styles.teamCheckbox,
                  alreadyIn && styles.teamCheckboxGray,
                  isSelected && styles.teamCheckboxChecked,
                  !eligible && !alreadyIn && styles.teamCheckboxWarning,
                ]}>
                  {(isSelected || alreadyIn) && <Text style={[styles.teamCheckTick, alreadyIn && styles.teamCheckGray]}>✓</Text>}
                </View>
                <View style={styles.teamInfo}>
                  <View style={styles.teamNameRow}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {alreadyIn && <View style={styles.registeredBadge}><Text style={styles.registeredBadgeText}>Registered</Text></View>}
                  </View>
                  <View style={styles.teamMeta}>
                    {team.division && <View style={styles.divChip}><Text style={styles.divChipText}>{team.division}</Text></View>}
                    <Text style={styles.teamRoster}>{team.rosterCount} players</Text>
                  </View>
                </View>
                <Text style={[styles.eligIcon, !eligible && !alreadyIn ? styles.eligWarn : styles.eligOk]}>
                  {alreadyIn ? '✓' : eligible ? '✓' : '⚠'}
                </Text>
              </TouchableOpacity>

              {!eligible && !alreadyIn && (
                <View style={styles.ineligibleRow}>
                  <Text style={styles.ineligibleText}>⚠ {reason}</Text>
                </View>
              )}

              {isSelected && (
                <View style={styles.schedSection}>
                  <TouchableOpacity
                    style={styles.schedToggle}
                    onPress={() => setExpandedScheduleIds(prev => {
                      const ne = new Set(prev);
                      ne.has(team.id) ? ne.delete(team.id) : ne.add(team.id);
                      return ne;
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.schedToggleLabel}>
                      Scheduling Restrictions{schedCount > 0 ? ` (${schedCount})` : ''}
                    </Text>
                    <Text style={styles.schedToggleChevron}>{schedExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {schedExpanded && (
                    <View style={styles.schedBody}>
                      {/* Coach conflict */}
                      <TouchableOpacity
                        style={styles.schedToggleRow}
                        onPress={() => updateSched(team.id, { coachConflict: !sched.coachConflict })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.smallCheck, sched.coachConflict && styles.smallCheckOn]}>
                          {sched.coachConflict && <Text style={styles.smallCheckTick}>✓</Text>}
                        </View>
                        <View style={styles.schedOptionText}>
                          <Text style={styles.schedOptionTitle}>Coach has another team in this event</Text>
                          <Text style={styles.schedOptionDesc}>Avoid scheduling conflicts with another coached team</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Max games per day */}
                      <View style={styles.schedRow}>
                        <Text style={styles.schedRowLabel}>Max Games Per Day</Text>
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateSched(team.id, { maxGamesPerDay: Math.max(1, (sched.maxGamesPerDay ?? 1) - 1) })}
                          >
                            <Text style={styles.stepBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.stepValue}>
                            {sched.maxGamesPerDay ?? '—'}
                          </Text>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateSched(team.id, { maxGamesPerDay: Math.min(10, (sched.maxGamesPerDay ?? 0) + 1) })}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                          {sched.maxGamesPerDay !== null && (
                            <TouchableOpacity onPress={() => updateSched(team.id, { maxGamesPerDay: null })}>
                              <Text style={styles.clearStep}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Time constraints */}
                      <View style={styles.schedRow}>
                        <Text style={styles.schedRowLabel}>Date/Time Restrictions</Text>
                        <TouchableOpacity onPress={() => addConstraint(team.id)}>
                          <Text style={styles.addConstraintBtn}>+ Add</Text>
                        </TouchableOpacity>
                      </View>
                      {sched.constraints.map((c, ci) => (
                        <View key={ci} style={styles.constraintRow}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {CONSTRAINT_TYPES.map(ct => (
                              <TouchableOpacity
                                key={ct.value}
                                style={[styles.chipOption, c.type === ct.value && styles.chipOptionActive]}
                                onPress={() => updateConstraint(team.id, ci, { type: ct.value })}
                              >
                                <Text style={[styles.chipOptionText, c.type === ct.value && styles.chipOptionTextActive]}>{ct.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                            {DAYS.map(d => (
                              <TouchableOpacity
                                key={d}
                                style={[styles.chipOption, c.day === d && styles.chipOptionActive]}
                                onPress={() => updateConstraint(team.id, ci, { day: d })}
                              >
                                <Text style={[styles.chipOptionText, c.day === d && styles.chipOptionTextActive]}>{d}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <View style={styles.timesRow}>
                            <TextInput
                              style={styles.timeInput}
                              value={c.time}
                              onChangeText={v => updateConstraint(team.id, ci, { time: v })}
                              placeholder="08:00"
                              placeholderTextColor={Colors.textMuted}
                              keyboardType="numbers-and-punctuation"
                            />
                            {c.type === 'NOT_BETWEEN' && (
                              <>
                                <Text style={styles.toText}>to</Text>
                                <TextInput
                                  style={styles.timeInput}
                                  value={c.endTime ?? ''}
                                  onChangeText={v => updateConstraint(team.id, ci, { endTime: v })}
                                  placeholder="17:00"
                                  placeholderTextColor={Colors.textMuted}
                                  keyboardType="numbers-and-punctuation"
                                />
                              </>
                            )}
                            <TouchableOpacity onPress={() => removeConstraint(team.id, ci)} style={styles.removeBtn}>
                              <Text style={styles.removeBtnText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      {/* Matchup restrictions */}
                      {selectedTeams.filter(t => t.id !== team.id).length > 0 && (
                        <View>
                          <Text style={styles.schedRowLabel}>Matchup Restrictions</Text>
                          <Text style={styles.schedOptionDesc}>Prevent this team from playing your other teams</Text>
                          {selectedTeams.filter(t => t.id !== team.id).map(other => {
                            const restricted = sched.matchupRestrictions.includes(other.id);
                            return (
                              <TouchableOpacity
                                key={other.id}
                                style={styles.matchupRow}
                                onPress={() => toggleMatchup(team.id, other.id)}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.smallCheck, restricted && styles.smallCheckOn]}>
                                  {restricted && <Text style={styles.smallCheckTick}>✓</Text>}
                                </View>
                                <Text style={styles.matchupName}>{other.name}</Text>
                                {other.division && <Text style={styles.matchupDiv}>{other.division}</Text>}
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
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );

  const renderRosters = () => (
    <>
      <Text style={styles.stepDesc}>Please verify that rosters for your selected teams are up to date.</Text>
      {selectedTeams.map(team => {
        const expanded = expandedRosterIds.has(team.id);
        const empty = team.rosterCount === 0;
        return (
          <View key={team.id} style={styles.rosterCard}>
            <TouchableOpacity
              style={styles.rosterCardHeader}
              onPress={() => setExpandedRosterIds(prev => {
                const s = new Set(prev); s.has(team.id) ? s.delete(team.id) : s.add(team.id); return s;
              })}
              activeOpacity={0.7}
            >
              <View style={[styles.rosterStatusIcon, empty ? styles.rosterWarnIcon : styles.rosterOkIcon]}>
                <Text style={styles.rosterStatusText}>{empty ? '⚠' : '✓'}</Text>
              </View>
              <View style={styles.rosterInfo}>
                <Text style={styles.rosterTeamName}>{team.name}</Text>
                <Text style={[styles.rosterCount, empty && styles.rosterCountWarn]}>
                  {team.rosterCount} players{empty ? ' — Roster is empty!' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expanded && (
              <View style={styles.rosterList}>
                {empty ? (
                  <Text style={styles.rosterEmpty}>No players on this roster yet.</Text>
                ) : (
                  team.roster.map((p, i) => (
                    <View key={i} style={styles.rosterPlayerRow}>
                      <Text style={styles.rosterJersey}>{p.jerseyNumber ? `#${p.jerseyNumber}` : '—'}</Text>
                      <Text style={styles.rosterPlayerName}>{p.firstName} {p.lastName}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.confirmRow}
        onPress={() => setRostersConfirmed(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, rostersConfirmed && styles.checkboxConfirmed]}>
          {rostersConfirmed && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.confirmText}>
          I confirm that all rosters are up-to-date and accurate. I understand rosters may be verified before or during the event.
        </Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );

  const renderConfirm = () => (
    <>
      <Text style={styles.sectionLabel}>TEAMS</Text>
      {selectedTeams.map(team => (
        <View key={team.id} style={styles.summaryTeamRow}>
          <View>
            <Text style={styles.summaryTeamName}>{team.name}</Text>
            {team.division && <Text style={styles.summaryTeamDiv}>{team.division}</Text>}
          </View>
          {!isFree && <Text style={styles.summaryFee}>${Number(event.entryFee).toFixed(0)}</Text>}
        </View>
      ))}

      {!isFree && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${totalFee.toFixed(0)}</Text>
        </View>
      )}

      {isFree && (
        <View style={styles.freeNotice}>
          <Text style={styles.freeNoticeText}>✓ This is a free event — no payment required</Text>
        </View>
      )}

      {!isFree && (
        <View style={styles.paymentNotice}>
          <Text style={styles.paymentNoticeText}>
            ⚠ Payment integration coming soon. Registration will be confirmed without payment.
          </Text>
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );

  const renderSuccess = () => (
    <View style={styles.centeredBox}>
      <Text style={styles.successIcon}>✓</Text>
      <Text style={styles.centeredTitle}>Registration Complete!</Text>
      <Text style={styles.centeredDesc}>
        Your teams have been registered for {event.name}.
      </Text>
      <View style={styles.successTeams}>
        {registeredTeams.map(t => (
          <View key={t.id} style={styles.successTeamRow}>
            <Text style={styles.successTeamCheck}>✓</Text>
            <View>
              <Text style={styles.successTeamName}>{t.name}</Text>
              {t.division && <Text style={styles.successTeamDiv}>{t.division}</Text>}
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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Register Your Team</Text>
          <Text style={styles.headerSub}>{event.name}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {userRole === 'PROGRAM_DIRECTOR' && step !== 'success' && (
        <View style={styles.progress}>
          {(['teams', 'rosters', 'confirm'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <View style={[styles.progressStep, (step === s || (i < ['teams','rosters','confirm'].indexOf(step))) && styles.progressStepActive]}>
                <Text style={styles.progressStepNum}>{i + 1}</Text>
                <Text style={styles.progressStepLabel}>{stepTitle[s]}</Text>
              </View>
              {i < 2 && <View style={styles.progressLine} />}
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
            ? <ActivityIndicator size="large" color={Colors.textMuted} style={{ marginTop: 40 }} />
            : step === 'teams' ? renderTeams()
              : step === 'rosters' ? renderRosters()
                : step === 'confirm' ? renderConfirm()
                  : renderSuccess()
        }
      </ScrollView>

      {/* Footer navigation */}
      {userRole === 'PROGRAM_DIRECTOR' && !isLoading && step !== 'success' && (
        <View style={styles.footer}>
          {step !== 'teams' ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === 'rosters') setStep('teams');
                else if (step === 'confirm') setStep('rosters');
              }}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
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
              ? <ActivityIndicator size="small" color={Colors.textPrimary} />
              : <Text style={styles.primaryBtnText}>
                  {step === 'teams' ? 'Continue ›'
                    : step === 'rosters' ? 'Continue ›'
                      : 'Complete Registration'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.footer}>
          <View />
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Done</Text>
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
    borderBottomColor: Colors.border,
  },
  headerText: { flex: 1, marginRight: Spacing.md },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: Fonts.bodyMedium,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  progressStepActive: {
    backgroundColor: Colors.surfaceLight,
  },
  progressStepNum: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.border,
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  progressStepLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  body: {},
  bodyContent: { padding: Spacing.lg, gap: Spacing.md },
  stepDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },

  // Team cards
  teamCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  teamCardDisabled: { opacity: 0.5 },
  teamCardWarning: { borderColor: 'rgba(251,191,36,0.4)' },
  teamCardSelected: { borderColor: Colors.textSecondary },
  teamCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  teamCheckbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  teamCheckboxGray: { borderColor: Colors.textMuted, backgroundColor: Colors.surfaceLight },
  teamCheckboxChecked: { borderColor: Colors.textSecondary, backgroundColor: Colors.surfaceLight },
  teamCheckboxWarning: { borderColor: 'rgba(251,191,36,0.5)' },
  teamCheckTick: { fontSize: 12, color: Colors.textPrimary, fontFamily: Fonts.bodyBold },
  teamCheckGray: { color: Colors.textMuted },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  teamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  registeredBadge: {
    backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  registeredBadgeText: { fontSize: 9, fontFamily: Fonts.bodyMedium, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  divChip: {
    backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 1,
    borderWidth: 1, borderColor: Colors.border,
  },
  divChipText: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  teamRoster: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textMuted },
  eligIcon: { fontSize: 14, fontFamily: Fonts.bodyBold },
  eligOk: { color: 'rgb(34,197,94)' },
  eligWarn: { color: 'rgb(251,191,36)' },
  ineligibleRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  ineligibleText: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: 'rgb(251,191,36)' },

  // Schedule
  schedSection: { borderTopWidth: 1, borderTopColor: Colors.border },
  schedToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  schedToggleLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  schedToggleChevron: { fontSize: 10, color: Colors.textMuted },
  schedBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.md },
  schedToggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  schedOptionText: { flex: 1 },
  schedOptionTitle: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, color: Colors.textPrimary },
  schedOptionDesc: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 1 },
  schedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  schedRowLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 16, color: Colors.textPrimary, lineHeight: 20 },
  stepValue: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  clearStep: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium, color: Colors.textMuted },
  addConstraintBtn: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  constraintRow: {
    backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md,
    padding: Spacing.sm, gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  chipOption: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.full, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border, marginRight: 4,
  },
  chipOptionActive: { backgroundColor: Colors.surfaceLight, borderColor: Colors.textSecondary },
  chipOptionText: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: Colors.textMuted },
  chipOptionTextActive: { color: Colors.textPrimary },
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  timeInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4,
    fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textPrimary, width: 72,
  },
  toText: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: Fonts.body },
  removeBtn: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 10, color: Colors.textMuted },
  matchupRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: BorderRadius.md, marginTop: 4,
  },
  matchupName: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, color: Colors.textPrimary, flex: 1 },
  matchupDiv: { fontSize: 10, fontFamily: Fonts.body, color: Colors.textMuted },

  // Rosters
  rosterCard: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: Colors.background,
  },
  rosterCardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rosterStatusIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rosterOkIcon: { backgroundColor: 'rgba(34,197,94,0.15)' },
  rosterWarnIcon: { backgroundColor: 'rgba(251,191,36,0.15)' },
  rosterStatusText: { fontSize: 14 },
  rosterInfo: { flex: 1 },
  rosterTeamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  rosterCount: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 1 },
  rosterCountWarn: { color: 'rgb(251,191,36)' },
  chevron: { fontSize: 10, color: Colors.textMuted },
  rosterList: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  rosterEmpty: { fontSize: FontSize.sm, fontFamily: Fonts.body, color: Colors.textMuted, paddingVertical: Spacing.sm },
  rosterPlayerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: Spacing.md },
  rosterJersey: { width: 32, textAlign: 'right', fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textMuted },
  rosterPlayerName: { fontSize: FontSize.sm, fontFamily: Fonts.body, color: Colors.textSecondary },
  confirmRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginTop: Spacing.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxConfirmed: { borderColor: Colors.textSecondary, backgroundColor: Colors.surfaceLight },
  checkboxTick: { fontSize: 12, color: Colors.textPrimary, fontFamily: Fonts.bodyBold },
  confirmText: { flex: 1, fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textSecondary, lineHeight: 18 },

  // Summary
  sectionLabel: {
    fontSize: 10, fontFamily: Fonts.bodyBold, color: Colors.textMuted,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  summaryTeamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  summaryTeamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  summaryTeamDiv: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 1 },
  summaryFee: { fontSize: FontSize.md, fontFamily: Fonts.bodyBold, color: Colors.textPrimary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm,
  },
  totalLabel: { fontSize: FontSize.md, fontFamily: Fonts.bodyMedium, color: Colors.textSecondary },
  totalAmount: { fontSize: 28, fontFamily: Fonts.headingBlack, color: Colors.textPrimary },
  freeNotice: {
    backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  freeNoticeText: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, color: 'rgb(34,197,94)' },
  paymentNotice: {
    backgroundColor: 'rgba(251,191,36,0.06)', borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  paymentNoticeText: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: 'rgb(251,191,36)', lineHeight: 18 },

  // Success
  successIcon: { fontSize: 48, color: 'rgb(34,197,94)', textAlign: 'center', marginBottom: Spacing.md },
  successTeams: { width: '100%', marginTop: Spacing.lg, gap: Spacing.sm },
  successTeamRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  successTeamCheck: { fontSize: 16, color: 'rgb(34,197,94)' },
  successTeamName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
  successTeamDiv: { fontSize: FontSize.xs, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 1 },

  // Centered states
  centeredBox: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  centeredTitle: {
    fontSize: FontSize.lg, fontFamily: Fonts.heading, color: Colors.textPrimary,
    marginBottom: Spacing.sm, textAlign: 'center',
  },
  centeredDesc: {
    fontSize: FontSize.sm, fontFamily: Fonts.body, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },

  // Shared
  smallCheck: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  smallCheckOn: { borderColor: Colors.textSecondary, backgroundColor: Colors.surfaceLight },
  smallCheckTick: { fontSize: 10, color: Colors.textPrimary, fontFamily: Fonts.bodyBold },
  errorText: {
    fontSize: FontSize.sm, fontFamily: Fonts.body, color: '#f87171',
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
  },
  backBtn: { paddingVertical: Spacing.sm },
  backBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.bodyMedium, color: Colors.textMuted },
  primaryBtn: {
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    alignItems: 'center', justifyContent: 'center', minWidth: 160,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary },
});
