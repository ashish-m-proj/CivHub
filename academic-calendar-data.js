// ==========================================
// OFFICIAL ACADEMIC CALENDAR — SINGLE SOURCE OF TRUTH
// Parsed from: "Academic Calendar (Autumn Semester 2026-27) — For All
// Programs (Other than MBA)", IIT Roorkee.
//
// This is a static file (no Firestore writes, no moderation) — swap it
// out each semester the same way curriculum-data.js gets updated.
// Dates are plain ISO strings ("YYYY-MM-DD"), inclusive on both ends.
// Single-day items just repeat the same date for start/end.
//
// Deliberately EXCLUDED (per instruction to ignore new-admission noise):
//   - New Ph.D./Masters admission + registration + orientation
//   - New UG admission cum registration, orientation, Commencement of
//     Classes for UG I year (all "*Subject to JoSAA Counseling")
//   - Internal admin-only deadlines (grades to AAO, Ph.D. progress
//     reports to AAO)
//   - Answer-script viewing / grade-revision / grade-communication dates
//   - Time-Table Rescheduling & UG-I-year-only compensatory classes
// Flag any of these back in if you want them added.
// ==========================================

// ------------------------------------------
// CATEGORY TAXONOMY — drives chip color, dot color, and default icon.
// Shared by both the official calendar (below) and community events
// pulled from the Firestore "events" collection, so everything renders
// through one consistent legend.
// ------------------------------------------
export const CATEGORY_META = {
  academic: {
    label: 'Academic',
    dot: 'bg-brand-500',
    chipBg: 'bg-brand-50 dark:bg-brand-500/20',
    chipBorder: 'border-brand-100 dark:border-brand-500/30',
    chipText: 'text-brand-700 dark:text-brand-300',
    icon: 'fa-graduation-cap'
  },
  workshop: {
    label: 'Workshop',
    dot: 'bg-emerald-500',
    chipBg: 'bg-emerald-50 dark:bg-emerald-500/20',
    chipBorder: 'border-emerald-100 dark:border-emerald-500/30',
    chipText: 'text-emerald-700 dark:text-emerald-300',
    icon: 'fa-laptop-code'
  },
  club: {
    label: 'Club / Fest',
    dot: 'bg-purple-500',
    chipBg: 'bg-purple-50 dark:bg-purple-500/20',
    chipBorder: 'border-purple-100 dark:border-purple-500/30',
    chipText: 'text-purple-700 dark:text-purple-300',
    icon: 'fa-users'
  },
  deadline: {
    label: 'Deadline',
    dot: 'bg-amber-500',
    chipBg: 'bg-amber-50 dark:bg-amber-500/20',
    chipBorder: 'border-amber-100 dark:border-amber-500/30',
    chipText: 'text-amber-700 dark:text-amber-300',
    icon: 'fa-clock'
  },
  exams: {
    label: 'Exams',
    dot: 'bg-rose-500',
    chipBg: 'bg-rose-50 dark:bg-rose-500/20',
    chipBorder: 'border-rose-100 dark:border-rose-500/30',
    chipText: 'text-rose-700 dark:text-rose-300',
    icon: 'fa-file-signature'
  },
  holiday: {
    label: 'Holiday',
    dot: 'bg-teal-500',
    chipBg: 'bg-teal-50 dark:bg-teal-500/20',
    chipBorder: 'border-teal-100 dark:border-teal-500/30',
    chipText: 'text-teal-700 dark:text-teal-300',
    icon: 'fa-umbrella-beach'
  }
};

export const CATEGORY_IDS = Object.keys(CATEGORY_META);

// ------------------------------------------
// OFFICIAL CALENDAR ENTRIES
// ------------------------------------------
export const ACADEMIC_CALENDAR = [
  {
    id: 'ac-commencement',
    title: 'Commencement of Classes',
    category: 'academic',
    startDate: '2026-07-16',
    endDate: '2026-07-16',
    description: 'Commencement of classes for Autumn Semester 2026-27 (except UG I year).'
  },
  {
    id: 'ac-reexam-spring',
    title: 'Re-Exam / Second Exam (Spring 2025-26)',
    category: 'exams',
    startDate: '2026-07-16',
    endDate: '2026-07-18',
    description: 'Re-examination and second examination window for Spring Semester 2025-26.'
  },
  {
    id: 'ac-add-drop',
    title: 'Last Date: Add/Drop Courses',
    category: 'deadline',
    startDate: '2026-08-03',
    endDate: '2026-08-03',
    description: 'Last date for adding/changing courses for all programs.'
  },
  {
    id: 'ac-convocation',
    title: 'Convocation 2026',
    category: 'academic',
    startDate: '2026-09-19',
    endDate: '2026-09-19',
    description: 'Convocation 2026. Tentative — the Institute has listed 19 Sep or 26 Sep 2026; the final date will be notified separately.'
  },
  {
    id: 'ac-midterms',
    title: 'Mid-Term Examinations',
    category: 'exams',
    startDate: '2026-09-10',
    endDate: '2026-09-15',
    description: 'Mid-Term Examinations (except Sunday).'
  },
  {
    id: 'ac-feedback-1',
    title: 'Feedback / Response Form I',
    category: 'deadline',
    startDate: '2026-09-28',
    endDate: '2026-10-01',
    description: 'Window to submit Feedback/Response Form I on the online portal.'
  },
  {
    id: 'ac-sangram',
    title: 'Sangram 2026',
    category: 'club',
    startDate: '2026-10-03',
    endDate: '2026-10-04',
    description: "IIT Roorkee's annual sports festival, Sangram 2026."
  },
  {
    id: 'ac-withdrawal',
    title: 'Last Date: Course Withdrawal',
    category: 'deadline',
    startDate: '2026-10-05',
    endDate: '2026-10-05',
    description: 'Last date for withdrawal of courses.'
  },
  {
    id: 'ac-thomso',
    title: 'Thomso 2026',
    category: 'club',
    startDate: '2026-10-09',
    endDate: '2026-10-11',
    description: "IIT Roorkee's annual cultural festival, Thomso 2026."
  },
  {
    id: 'ac-feedback-2',
    title: 'Feedback / Response Form II',
    category: 'deadline',
    startDate: '2026-11-05',
    endDate: '2026-11-11',
    description: 'Window to submit Feedback/Response Form II on the online portal.'
  },
  {
    id: 'ac-last-teaching',
    title: 'Last Date of Teaching',
    category: 'academic',
    startDate: '2026-11-11',
    endDate: '2026-11-11',
    description: 'Last day of teaching for the Autumn Semester 2026-27.'
  },
  {
    id: 'ac-endterms',
    title: 'End-Term Examinations',
    category: 'exams',
    startDate: '2026-11-13',
    endDate: '2026-11-24',
    description: 'End Term Examinations (excluding Sunday and declared holidays).'
  },
  {
    id: 'ac-foundation-day',
    title: 'Institute Foundation Day',
    category: 'academic',
    startDate: '2026-11-25',
    endDate: '2026-11-25',
    description: "IIT Roorkee's Institute Foundation Day."
  },
  {
    id: 'ac-winter-vacation',
    title: 'Winter Vacation (UG students)',
    category: 'holiday',
    startDate: '2026-12-05',
    endDate: '2027-01-06',
    description: 'Winter vacation for UG students (except IDD final year).'
  },
  {
    id: 'ac-branch-change-window',
    title: 'Online Choices for Branch Change',
    category: 'deadline',
    startDate: '2026-12-10',
    endDate: '2026-12-14',
    description: 'Window to submit online choices for branch change.'
  },
  {
    id: 'ac-branch-change-result',
    title: 'Branch Change: Final List (Tentative)',
    category: 'academic',
    startDate: '2026-12-31',
    endDate: '2026-12-31',
    description: 'Tentative date for declaration of the final branch-change list.'
  },
  {
    id: 'ac-spring-commencement',
    title: 'Commencement of Classes — Spring 2026-27',
    category: 'academic',
    startDate: '2027-01-11',
    endDate: '2027-01-11',
    description: 'Commencement of classes for Spring Semester 2026-27.'
  },

  // ---------------- Holidays ----------------
  { id: 'hol-independence-day', title: 'Independence Day', category: 'holiday', startDate: '2026-08-15', endDate: '2026-08-15', description: 'Institute holiday.' },
  { id: 'hol-id-e-milad', title: "Id-e-Milad (Prophet Mohammad's Birthday)", category: 'holiday', startDate: '2026-08-26', endDate: '2026-08-26', description: 'Institute holiday. Subject to change based on moon sighting.' },
  { id: 'hol-raksha-bandhan', title: 'Raksha Bandhan', category: 'holiday', startDate: '2026-08-28', endDate: '2026-08-28', description: 'Institute holiday.' },
  { id: 'hol-janamashtami', title: 'Janamashtami', category: 'holiday', startDate: '2026-09-04', endDate: '2026-09-04', description: 'Institute holiday.' },
  { id: 'hol-gandhi-jayanti', title: "Mahatma Gandhi's Birthday", category: 'holiday', startDate: '2026-10-02', endDate: '2026-10-02', description: 'Institute holiday.' },
  { id: 'hol-mahashtami', title: 'Mahashtami', category: 'holiday', startDate: '2026-10-19', endDate: '2026-10-19', description: 'Institute holiday.' },
  { id: 'hol-dussehra', title: 'Mahanavmi / Dussehra (Vijaydashmi)', category: 'holiday', startDate: '2026-10-20', endDate: '2026-10-20', description: 'Institute holiday.' },
  { id: 'hol-diwali', title: 'Diwali (Deepavali)', category: 'holiday', startDate: '2026-11-08', endDate: '2026-11-08', description: 'Institute holiday.' },
  { id: 'hol-govardhan-puja', title: 'Govardhan Puja', category: 'holiday', startDate: '2026-11-09', endDate: '2026-11-09', description: 'Institute holiday.' },
  { id: 'hol-guru-nanak', title: "Guru Nanak's Birthday", category: 'holiday', startDate: '2026-11-24', endDate: '2026-11-24', description: 'Institute holiday.' },
  { id: 'hol-christmas', title: 'Christmas Day', category: 'holiday', startDate: '2026-12-25', endDate: '2026-12-25', description: 'Institute holiday.' }
];