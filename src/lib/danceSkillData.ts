import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

// ── Types ────────────────────────────────────────────────────────────────────

export type SkillMilestoneStatus =
  | 'not_started' | 'curious' | 'attempting' | 'close'
  | 'landed_once' | 'building_consistency' | 'consistent' | 'mastered';

export type SkillCategory =
  | 'spins' | 'climbs' | 'inverts' | 'holds' | 'leg_hangs'
  | 'shapes_poses' | 'tricks' | 'flexibility_shapes' | 'transitions'
  | 'drops' | 'floorwork' | 'heels_technique' | 'freestyle' | 'conditioning';

export interface DanceSkill {
  id: string;
  name: string;
  category: SkillCategory;
  tags?: string[];
  notes?: string;
  active: boolean;
  currentStatus: SkillMilestoneStatus;
  dateCreated: string;
  dateFirstLanded?: string;
  needsSpotting?: boolean;
  needsConditioning?: boolean;
  needsFlexibility?: boolean;
  mentallyBlocked?: boolean;
}

export interface DanceSkillLog {
  id: string;
  skillId: string;
  skillName?: string;
  category?: SkillCategory;
  date: string;
  attempts?: number;
  confidence?: number;
  confidenceBefore: number;
  confidenceAfter?: number;
  fearLevel?: number;
  formQuality?: number;
  effortLevel?: number;
  outcome: SkillMilestoneStatus;
  attempted: boolean;
  notes?: string;
  filmed?: boolean;
  mediaId?: string;
  tags?: string[];
  win?: boolean;
}

// ── Config ───────────────────────────────────────────────────────────────────

export const SKILL_CATEGORIES: { key: SkillCategory; label: string; icon: string; color: string }[] = [
  { key: 'spins',             label: 'Spins',                  icon: '🌀', color: '#8b5cf6' },
  { key: 'climbs',            label: 'Climbs',                 icon: '🧗', color: '#10b981' },
  { key: 'inverts',           label: 'Inverts',                icon: '🙃', color: '#f43f5e' },
  { key: 'holds',             label: 'Holds',                  icon: '✋', color: '#0ea5e9' },
  { key: 'leg_hangs',         label: 'Leg Hangs',              icon: '🦵', color: '#e879f9' },
  { key: 'shapes_poses',      label: 'Shapes / Poses',         icon: '🌺', color: '#f472b6' },
  { key: 'tricks',            label: 'Tricks',                 icon: '⭐', color: '#fb923c' },
  { key: 'flexibility_shapes',label: 'Flexibility Shapes',     icon: '🌸', color: '#ec4899' },
  { key: 'transitions',       label: 'Transitions',            icon: '🔀', color: '#34d399' },
  { key: 'drops',             label: 'Drops',                  icon: '⬇️', color: '#f87171' },
  { key: 'floorwork',         label: 'Floorwork',              icon: '💫', color: '#f59e0b' },
  { key: 'heels_technique',   label: 'Heels Technique',        icon: '👠', color: '#a78bfa' },
  { key: 'freestyle',         label: 'Freestyle',              icon: '🎵', color: '#06b6d4' },
  { key: 'conditioning',      label: 'Conditioning Milestones',icon: '💪', color: '#22d3ee' },
];

export const MILESTONE_STATUSES: {
  key: SkillMilestoneStatus; label: string; order: number; color: string; bg: string;
}[] = [
  { key: 'not_started',          label: 'Not Started',          order: 0, color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.05)'  },
  { key: 'curious',              label: 'Curious',              order: 1, color: '#a78bfa',               bg: 'rgba(167,139,250,0.12)'  },
  { key: 'attempting',           label: 'Attempting',           order: 2, color: '#f59e0b',               bg: 'rgba(245,158,11,0.12)'   },
  { key: 'close',                label: 'So Close!',            order: 3, color: '#fb923c',               bg: 'rgba(251,146,60,0.12)'   },
  { key: 'landed_once',          label: 'Landed Once 🌟',       order: 4, color: '#10b981',               bg: 'rgba(16,185,129,0.12)'   },
  { key: 'building_consistency', label: 'Building Consistency', order: 5, color: '#0ea5e9',               bg: 'rgba(14,165,233,0.12)'   },
  { key: 'consistent',           label: 'Consistent',           order: 6, color: '#8b5cf6',               bg: 'rgba(139,92,246,0.12)'   },
  { key: 'mastered',             label: 'Mastered ✦',           order: 7, color: '#ec4899',               bg: 'rgba(236,72,153,0.12)'   },
];

// ── Storage ───────────────────────────────────────────────────────────────────

const SKILLS_KEY     = 'danceflow-skills';
const SKILL_LOGS_KEY = 'danceflow-skill-logs';

type DanceSkillRow = {
  id: string;
  name: string;
  category: SkillCategory;
  tags: string[] | null;
  notes: string | null;
  active: boolean;
  current_status: SkillMilestoneStatus;
  date_created: string;
  date_first_landed: string | null;
  needs_spotting: boolean | null;
  needs_conditioning: boolean | null;
  needs_flexibility: boolean | null;
  mentally_blocked: boolean | null;
};

type DanceSkillLogRow = {
  id: string;
  skill_id: string;
  skill_name?: string | null;
  category?: SkillCategory | null;
  date: string;
  attempts?: number | null;
  confidence?: number | null;
  confidence_before: number;
  confidence_after: number | null;
  fear_level: number | null;
  form_quality: number | null;
  effort_level: number | null;
  outcome: SkillMilestoneStatus;
  attempted: boolean;
  notes: string | null;
  filmed: boolean | null;
  media_id?: string | null;
  tags?: string[] | null;
  win?: boolean | null;
};

export function generateSkillId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
export function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Seed library ──────────────────────────────────────────────────────────────

function makeSeed(
  id: string,
  name: string,
  category: SkillCategory,
  status: SkillMilestoneStatus = 'not_started',
): DanceSkill {
  return { id: `seed-${id}`, name, category, active: true, currentStatus: status, dateCreated: '2024-01-01' };
}

export const SEED_SKILLS: DanceSkill[] = [
  // Spins
  makeSeed('spin-01', 'Fireman spin',        'spins'),
  makeSeed('spin-02', 'Back hook spin',      'spins'),
  makeSeed('spin-03', 'Front hook spin',     'spins'),
  makeSeed('spin-04', 'Chair spin',          'spins'),
  makeSeed('spin-05', 'Attitude spin',       'spins'),
  makeSeed('spin-06', 'Carousel spin',       'spins'),
  makeSeed('spin-07', 'Sun wheel',           'spins'),
  makeSeed('spin-08', 'Pencil spin',         'spins'),
  makeSeed('spin-09', 'Corkscrew spin',      'spins'),
  makeSeed('spin-10', 'Fan kick spin',       'spins'),
  makeSeed('spin-11', 'Pirouette',           'spins'),
  makeSeed('spin-12', 'Step-around',         'spins'),
  makeSeed('spin-13', 'Dip turn',            'spins'),
  // Climbs
  makeSeed('clmb-01', 'Basic climb',         'climbs'),
  makeSeed('clmb-02', 'Forearm climb',       'climbs'),
  makeSeed('clmb-03', 'Side climb',          'climbs'),
  makeSeed('clmb-04', 'Russian climb',       'climbs'),
  makeSeed('clmb-05', 'Cross-knee climb',    'climbs'),
  makeSeed('clmb-06', 'Pole walk climb',     'climbs'),
  makeSeed('clmb-07', 'Stronghold climb',    'climbs'),
  // Inverts
  makeSeed('inv-01',  'Basic invert',        'inverts'),
  makeSeed('inv-02',  'Chopper',             'inverts'),
  makeSeed('inv-03',  'Aerial invert',       'inverts'),
  makeSeed('inv-04',  'Deadlift invert',     'inverts'),
  makeSeed('inv-05',  'Side invert',         'inverts'),
  makeSeed('inv-06',  'Inverted tuck',       'inverts'),
  makeSeed('inv-07',  'Straddle invert',     'inverts'),
  // Holds
  makeSeed('hld-01',  'Pole sit',            'holds'),
  makeSeed('hld-02',  'Side climb hold',     'holds'),
  makeSeed('hld-03',  'Split grip hold',     'holds'),
  makeSeed('hld-04',  'Cup grip hold',       'holds'),
  makeSeed('hld-05',  'Stronghold',          'holds'),
  makeSeed('hld-06',  'Crucifix',            'holds'),
  makeSeed('hld-07',  'Extended butterfly hold', 'holds'),
  makeSeed('hld-08',  'Flatline hold',       'holds'),
  makeSeed('hld-09',  'Ayesha prep hold',    'holds'),
  makeSeed('hld-10',  'Elbow grip hold',     'holds'),
  // Leg Hangs
  makeSeed('lh-01',   'Outside leg hang',    'leg_hangs'),
  makeSeed('lh-02',   'Inside leg hang',     'leg_hangs'),
  makeSeed('lh-03',   'Gemini',              'leg_hangs'),
  makeSeed('lh-04',   'Scorpio',             'leg_hangs'),
  // Shapes / Poses
  makeSeed('shp-01',  'Jasmine',             'shapes_poses'),
  makeSeed('shp-02',  'Genie',               'shapes_poses'),
  makeSeed('shp-03',  'Figurehead',          'shapes_poses'),
  makeSeed('shp-04',  'Martini',             'shapes_poses'),
  makeSeed('shp-05',  'Stag',                'shapes_poses'),
  makeSeed('shp-06',  'Attitude pose',       'shapes_poses'),
  makeSeed('shp-07',  'Seated pose',         'shapes_poses'),
  makeSeed('shp-08',  'Mermaid',             'shapes_poses'),
  makeSeed('shp-09',  'Layout',              'shapes_poses'),
  makeSeed('shp-10',  'Bow and arrow',       'shapes_poses'),
  makeSeed('shp-11',  'Cupid',               'shapes_poses'),
  // Tricks
  makeSeed('trk-01',  'Butterfly',           'tricks'),
  makeSeed('trk-02',  'Extended butterfly',  'tricks'),
  makeSeed('trk-03',  'Ayesha',              'tricks'),
  makeSeed('trk-04',  'Handspring',          'tricks'),
  makeSeed('trk-05',  'Brass monkey',        'tricks'),
  makeSeed('trk-06',  'Shoulder mount',      'tricks'),
  makeSeed('trk-07',  'Superman',            'tricks'),
  makeSeed('trk-08',  'Allegra',             'tricks'),
  makeSeed('trk-09',  'Iguana',              'tricks'),
  makeSeed('trk-10',  'Cocoon',              'tricks'),
  makeSeed('trk-11',  'Fonji',               'tricks'),
  makeSeed('trk-12',  'Phoenix',             'tricks'),
  // Flexibility Shapes
  makeSeed('flex-01', 'Jade split',          'flexibility_shapes'),
  makeSeed('flex-02', 'Rainbow',             'flexibility_shapes'),
  makeSeed('flex-03', 'Spatchcock',          'flexibility_shapes'),
  makeSeed('flex-04', 'Russian split',       'flexibility_shapes'),
  makeSeed('flex-05', 'Needle variation',    'flexibility_shapes'),
  makeSeed('flex-06', 'Split pose',          'flexibility_shapes'),
  makeSeed('flex-07', 'Arabesque variation', 'flexibility_shapes'),
  // Transitions
  makeSeed('tr-01',   'Leg switch',          'transitions'),
  makeSeed('tr-02',   'Fan kick entry',      'transitions'),
  makeSeed('tr-03',   'Pirouette into climb','transitions'),
  makeSeed('tr-04',   'Dip turn into spin',  'transitions'),
  makeSeed('tr-05',   'Invert to crucifix',  'transitions'),
  makeSeed('tr-06',   'Crucifix to butterfly','transitions'),
  makeSeed('tr-07',   'Sit to layout',       'transitions'),
  makeSeed('tr-08',   'Jasmine to genie',    'transitions'),
  makeSeed('tr-09',   'Climb to seat',       'transitions'),
  makeSeed('tr-10',   'Floor-to-pole entry', 'transitions'),
  // Drops
  makeSeed('drp-01',  'Basic crucifix drop', 'drops'),
  makeSeed('drp-02',  'Cross-ankle release', 'drops'),
  makeSeed('drp-03',  'Cross-knee release',  'drops'),
  makeSeed('drp-04',  'Superman drop',       'drops'),
  makeSeed('drp-05',  'Marley',              'drops'),
  makeSeed('drp-06',  'Shoulder mount dismount drop', 'drops'),
  // Floorwork
  makeSeed('flr-01',  'Shoulder roll',       'floorwork'),
  makeSeed('flr-02',  'Body roll',           'floorwork'),
  makeSeed('flr-03',  'Forearm stand',       'floorwork'),
  makeSeed('flr-04',  'Headstand',           'floorwork'),
  makeSeed('flr-05',  'Shoulder stand',      'floorwork'),
  makeSeed('flr-06',  'Kips',                'floorwork'),
  makeSeed('flr-07',  'Leg waves',           'floorwork'),
  makeSeed('flr-08',  'Crawls',              'floorwork'),
  makeSeed('flr-09',  'Fish flop',           'floorwork'),
  makeSeed('flr-10',  'Floor pirouette',     'floorwork'),
  makeSeed('flr-11',  'Split slides',        'floorwork'),
  // Heels Technique
  makeSeed('hls-01',  'Heel clacks',         'heels_technique'),
  makeSeed('hls-02',  'Toe drags',           'heels_technique'),
  makeSeed('hls-03',  'Pirouettes in heels', 'heels_technique'),
  makeSeed('hls-04',  'Body wave in heels',  'heels_technique'),
  makeSeed('hls-05',  'Heel slide',          'heels_technique'),
  makeSeed('hls-06',  'Heel walk',           'heels_technique'),
  makeSeed('hls-07',  'Ankle roll transition','heels_technique'),
  makeSeed('hls-08',  'Knee glide',          'heels_technique'),
  makeSeed('hls-09',  'Edge work',           'heels_technique'),
  makeSeed('hls-10',  'Sexy walk / catwalk', 'heels_technique'),
  // Freestyle
  makeSeed('frs-01',  'Musicality',          'freestyle'),
  makeSeed('frs-02',  'Texture changes',     'freestyle'),
  makeSeed('frs-03',  'Tempo play',          'freestyle'),
  makeSeed('frs-04',  'Eye focus',           'freestyle'),
  makeSeed('frs-05',  'Arm styling',         'freestyle'),
  makeSeed('frs-06',  'Hair whip',           'freestyle'),
  makeSeed('frs-07',  'Level changes',       'freestyle'),
  makeSeed('frs-08',  'Flow transitions',    'freestyle'),
  makeSeed('frs-09',  'Character work',      'freestyle'),
  makeSeed('frs-10',  'Pause control',       'freestyle'),
  // Conditioning Milestones
  makeSeed('cnd-01',  'Pole sit hold',       'conditioning'),
  makeSeed('cnd-02',  'Tuck hold',           'conditioning'),
  makeSeed('cnd-03',  'Split grip hold time','conditioning'),
  makeSeed('cnd-04',  'Basic climb reps',    'conditioning'),
  makeSeed('cnd-05',  'Invert attempts',     'conditioning'),
  makeSeed('cnd-06',  'Chopper hold',        'conditioning'),
  makeSeed('cnd-07',  'Shoulder engagement drills', 'conditioning'),
  makeSeed('cnd-08',  'Fan kicks',           'conditioning'),
  makeSeed('cnd-09',  'Leg lifts',           'conditioning'),
  makeSeed('cnd-10',  'One-arm assisted pulls', 'conditioning'),
];

function readSkillsCache(): DanceSkill[] {
  if (typeof window === 'undefined') return SEED_SKILLS;
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    return raw ? (JSON.parse(raw) as DanceSkill[]) : [];
  } catch {
    return SEED_SKILLS;
  }
}

function writeSkillsCache(skills: DanceSkill[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  }
}

function readSkillLogsCache(): DanceSkillLog[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SKILL_LOGS_KEY) ?? '[]') as DanceSkillLog[];
  } catch {
    return [];
  }
}

function writeSkillLogsCache(logs: DanceSkillLog[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SKILL_LOGS_KEY, JSON.stringify(logs));
  }
}

function skillFromRow(row: DanceSkillRow): DanceSkill {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: row.tags ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active,
    currentStatus: row.current_status,
    dateCreated: row.date_created,
    dateFirstLanded: row.date_first_landed ?? undefined,
    needsSpotting: row.needs_spotting ?? undefined,
    needsConditioning: row.needs_conditioning ?? undefined,
    needsFlexibility: row.needs_flexibility ?? undefined,
    mentallyBlocked: row.mentally_blocked ?? undefined,
  };
}

function skillToRow(skill: DanceSkill): DanceSkillRow {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    tags: skill.tags ?? null,
    notes: skill.notes ?? null,
    active: skill.active,
    current_status: skill.currentStatus,
    date_created: skill.dateCreated,
    date_first_landed: skill.dateFirstLanded ?? null,
    needs_spotting: skill.needsSpotting ?? null,
    needs_conditioning: skill.needsConditioning ?? null,
    needs_flexibility: skill.needsFlexibility ?? null,
    mentally_blocked: skill.mentallyBlocked ?? null,
  };
}

function logFromRow(row: DanceSkillLogRow): DanceSkillLog {
  return {
    id: row.id,
    skillId: row.skill_id,
    skillName: row.skill_name ?? undefined,
    category: row.category ?? undefined,
    date: row.date,
    attempts: row.attempts ?? (row.attempted ? 1 : 0),
    confidence: row.confidence ?? row.confidence_after ?? row.confidence_before,
    confidenceBefore: row.confidence_before,
    confidenceAfter: row.confidence_after ?? undefined,
    fearLevel: row.fear_level ?? undefined,
    formQuality: row.form_quality ?? undefined,
    effortLevel: row.effort_level ?? undefined,
    outcome: row.outcome,
    attempted: row.attempted,
    notes: row.notes ?? undefined,
    filmed: row.filmed ?? undefined,
    mediaId: row.media_id ?? undefined,
    tags: row.tags ?? undefined,
    win: row.win ?? undefined,
  };
}

function logToRow(log: DanceSkillLog): DanceSkillLogRow {
  return {
    id: log.id,
    skill_id: log.skillId,
    skill_name: log.skillName ?? null,
    category: log.category ?? null,
    date: log.date,
    attempts: log.attempts ?? (log.attempted ? 1 : 0),
    confidence: log.confidence ?? log.confidenceAfter ?? log.confidenceBefore,
    confidence_before: log.confidenceBefore,
    confidence_after: log.confidenceAfter ?? null,
    fear_level: log.fearLevel ?? null,
    form_quality: log.formQuality ?? null,
    effort_level: log.effortLevel ?? null,
    outcome: log.outcome,
    attempted: log.attempted,
    notes: log.notes ?? null,
    filmed: log.filmed ?? null,
    media_id: log.mediaId ?? null,
    tags: log.tags ?? null,
    win: log.win ?? null,
  };
}

// ── Storage functions ─────────────────────────────────────────────────────────

export function loadSkills(): DanceSkill[] {
  if (typeof window === 'undefined') return SEED_SKILLS;
  ensureDataRecoveryMigration();
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    // Seed on first visit (key never set)
    if (raw === null) {
      localStorage.setItem(SKILLS_KEY, JSON.stringify(SEED_SKILLS));
      syncCollection({
        key: SKILLS_KEY,
        table: "dance_skills",
        localData: SEED_SKILLS,
        readCache: readSkillsCache,
        writeCache: writeSkillsCache,
        fromRow: skillFromRow,
        toRow: skillToRow,
        orderBy: "date_created",
      });
      return SEED_SKILLS;
    }
    const skills = JSON.parse(raw) as DanceSkill[];
    syncCollection({
      key: SKILLS_KEY,
      table: "dance_skills",
      localData: skills,
      readCache: readSkillsCache,
      writeCache: writeSkillsCache,
      fromRow: skillFromRow,
      toRow: skillToRow,
      orderBy: "date_created",
    });
    return skills;
  } catch { return SEED_SKILLS; }
}
export function saveSkills(skills: DanceSkill[]): void {
  if (typeof window !== 'undefined') {
    writeSkillsCache(skills);
    saveRemoteCollectionById("dance_skills", "id", skills, (skill) => skill.id, skillToRow);
    notifyAppDataUpdated();
  }
}
export function loadSkillLogs(): DanceSkillLog[] {
  if (typeof window === 'undefined') return [];
  ensureDataRecoveryMigration();
  const logs = readSkillLogsCache();
  syncCollection({
    key: SKILL_LOGS_KEY,
    table: "dance_skill_logs",
    localData: logs,
    readCache: readSkillLogsCache,
    writeCache: writeSkillLogsCache,
    fromRow: logFromRow,
    toRow: logToRow,
    orderBy: "date",
  });
  return logs;
}
export function saveSkillLogs(logs: DanceSkillLog[]): void {
  if (typeof window !== 'undefined') {
    writeSkillLogsCache(logs);
    saveRemoteCollectionById("dance_skill_logs", "id", logs, (log) => log.id, logToRow);
    notifyAppDataUpdated();
  }
}

// ── Skill analytics helpers ───────────────────────────────────────────────────

export function getLogsForSkill(logs: DanceSkillLog[], skillId: string): DanceSkillLog[] {
  return logs.filter((l) => l.skillId === skillId).sort((a, b) => a.date.localeCompare(b.date));
}

export function getAttemptedLogs(logs: DanceSkillLog[], skillId: string): DanceSkillLog[] {
  return getLogsForSkill(logs, skillId).filter((l) => l.attempted);
}

export function getSkillAttemptCount(logs: DanceSkillLog[], skillId: string): number {
  return getAttemptedLogs(logs, skillId).reduce((sum, log) => sum + (log.attempts ?? 1), 0);
}

export function getAvgConfidence(logs: DanceSkillLog[], skillId: string): number {
  const attempted = getAttemptedLogs(logs, skillId);
  if (!attempted.length) return 0;
  const total = attempted.reduce((s, l) => s + (l.confidenceAfter ?? l.confidenceBefore), 0);
  return Math.round((total / attempted.length) * 10) / 10;
}

export function getConfidenceTrend(logs: DanceSkillLog[], skillId: string) {
  return getAttemptedLogs(logs, skillId).map((l) => ({
    date:   l.date,
    before: l.confidenceBefore,
    after:  l.confidenceAfter ?? null,
  }));
}

export function getDaysSinceLastAttempt(logs: DanceSkillLog[], skillId: string): number | null {
  const attempted = getAttemptedLogs(logs, skillId);
  if (!attempted.length) return null;
  const last = attempted[attempted.length - 1].date;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}

export function getMostPracticedSkill(skills: DanceSkill[], logs: DanceSkillLog[]): DanceSkill | null {
  const active = skills.filter((s) => s.active);
  if (!active.length) return null;
  return active.sort((a, b) =>
    getSkillAttemptCount(logs, b.id) - getSkillAttemptCount(logs, a.id)
  )[0];
}

export function getHighestConfidenceSkill(skills: DanceSkill[], logs: DanceSkillLog[]): DanceSkill | null {
  const withLogs = skills.filter((s) => s.active && getAttemptedLogs(logs, s.id).length > 0);
  if (!withLogs.length) return null;
  return withLogs.sort((a, b) => getAvgConfidence(logs, b.id) - getAvgConfidence(logs, a.id))[0];
}

export function getLowestConfidenceSkill(skills: DanceSkill[], logs: DanceSkillLog[]): DanceSkill | null {
  const withLogs = skills.filter((s) => s.active && getAttemptedLogs(logs, s.id).length > 0);
  if (!withLogs.length) return null;
  return withLogs.sort((a, b) => getAvgConfidence(logs, a.id) - getAvgConfidence(logs, b.id))[0];
}

export function getMostImprovedSkill(skills: DanceSkill[], logs: DanceSkillLog[]): DanceSkill | null {
  let best: DanceSkill | null = null;
  let bestDelta = -Infinity;
  for (const skill of skills.filter((s) => s.active)) {
    const trend = getConfidenceTrend(logs, skill.id);
    if (trend.length < 2) continue;
    const first = trend[0].after ?? trend[0].before;
    const last  = trend[trend.length - 1].after ?? trend[trend.length - 1].before;
    if (last - first > bestDelta) { bestDelta = last - first; best = skill; }
  }
  return best;
}

export function getSkillsReadyToLevel(skills: DanceSkill[], logs: DanceSkillLog[]): DanceSkill[] {
  const notDone: SkillMilestoneStatus[] = ['not_started','curious','attempting','close','landed_once','building_consistency'];
  return skills.filter((s) => s.active && notDone.includes(s.currentStatus) && getAvgConfidence(logs, s.id) >= 4);
}

// ── Category analytics helpers ────────────────────────────────────────────────

/** Total attempts across all skills in a category */
export function getCategoryAttemptCount(skills: DanceSkill[], logs: DanceSkillLog[], cat: SkillCategory): number {
  return skills
    .filter((s) => s.active && s.category === cat)
    .reduce((sum, s) => sum + getSkillAttemptCount(logs, s.id), 0);
}

/** Average confidence for a category (across all skills with logs) */
export function getCategoryAvgConfidence(skills: DanceSkill[], logs: DanceSkillLog[], cat: SkillCategory): number {
  const catSkills = skills.filter((s) => s.active && s.category === cat && getAttemptedLogs(logs, s.id).length > 0);
  if (!catSkills.length) return 0;
  const total = catSkills.reduce((sum, s) => sum + getAvgConfidence(logs, s.id), 0);
  return Math.round((total / catSkills.length) * 10) / 10;
}

/** Category with the most total attempts */
export function getMostPracticedCategory(skills: DanceSkill[], logs: DanceSkillLog[]): SkillCategory | null {
  const cats = SKILL_CATEGORIES.map((c) => ({ key: c.key, count: getCategoryAttemptCount(skills, logs, c.key) }));
  const best = cats.sort((a, b) => b.count - a.count)[0];
  return best && best.count > 0 ? best.key : null;
}

/** Category with highest average confidence */
export function getHighestConfidenceCategory(skills: DanceSkill[], logs: DanceSkillLog[]): SkillCategory | null {
  const cats = SKILL_CATEGORIES
    .map((c) => ({ key: c.key, avg: getCategoryAvgConfidence(skills, logs, c.key) }))
    .filter((c) => c.avg > 0)
    .sort((a, b) => b.avg - a.avg);
  return cats.length ? cats[0].key : null;
}

/** Category with lowest average confidence (that has logs) */
export function getLowestConfidenceCategory(skills: DanceSkill[], logs: DanceSkillLog[]): SkillCategory | null {
  const cats = SKILL_CATEGORIES
    .map((c) => ({ key: c.key, avg: getCategoryAvgConfidence(skills, logs, c.key) }))
    .filter((c) => c.avg > 0)
    .sort((a, b) => a.avg - b.avg);
  return cats.length ? cats[0].key : null;
}

/** Category with the most skills at landed_once or better */
export function getCategoryWithMostLanded(skills: DanceSkill[]): SkillCategory | null {
  const landed: SkillMilestoneStatus[] = ['landed_once', 'building_consistency', 'consistent', 'mastered'];
  const cats = SKILL_CATEGORIES
    .map((c) => ({ key: c.key, count: skills.filter((s) => s.active && s.category === c.key && landed.includes(s.currentStatus)).length }))
    .sort((a, b) => b.count - a.count);
  return cats.length && cats[0].count > 0 ? cats[0].key : null;
}

/** Category with the most in-progress skills (attempting / close) */
export function getCategoryWithMostInProgress(skills: DanceSkill[]): SkillCategory | null {
  const wip: SkillMilestoneStatus[] = ['attempting', 'close'];
  const cats = SKILL_CATEGORIES
    .map((c) => ({ key: c.key, count: skills.filter((s) => s.active && s.category === c.key && wip.includes(s.currentStatus)).length }))
    .sort((a, b) => b.count - a.count);
  return cats.length && cats[0].count > 0 ? cats[0].key : null;
}

/** Summary stats per category for analytics view */
export interface CategoryStats {
  key: SkillCategory;
  label: string;
  icon: string;
  color: string;
  skillCount: number;
  attempts: number;
  avgConfidence: number;
  landedCount: number;
  inProgressCount: number;
}

export function getAllCategoryStats(skills: DanceSkill[], logs: DanceSkillLog[]): CategoryStats[] {
  const landed: SkillMilestoneStatus[] = ['landed_once', 'building_consistency', 'consistent', 'mastered'];
  const wip:    SkillMilestoneStatus[] = ['attempting', 'close'];
  return SKILL_CATEGORIES.map((c) => {
    const catSkills = skills.filter((s) => s.active && s.category === c.key);
    return {
      key:            c.key,
      label:          c.label,
      icon:           c.icon,
      color:          c.color,
      skillCount:     catSkills.length,
      attempts:       getCategoryAttemptCount(skills, logs, c.key),
      avgConfidence:  getCategoryAvgConfidence(skills, logs, c.key),
      landedCount:    catSkills.filter((s) => landed.includes(s.currentStatus)).length,
      inProgressCount:catSkills.filter((s) => wip.includes(s.currentStatus)).length,
    };
  }).filter((c) => c.skillCount > 0);
}

export function getStatusConfig(status: SkillMilestoneStatus) {
  return MILESTONE_STATUSES.find((m) => m.key === status) ?? MILESTONE_STATUSES[0];
}
export function getCategoryConfig(cat: SkillCategory) {
  return SKILL_CATEGORIES.find((c) => c.key === cat) ?? SKILL_CATEGORIES[0];
}
