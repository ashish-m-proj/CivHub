// ==========================================
// TIME TABLE — SINGLE SOURCE OF TRUTH
// Parsed from the official IIT Roorkee timetable portal
// (timetable.iitr.ac.in), B.Tech Civil Engineering, 1st Year, Autumn
// Semester 2026-27 — all six sub-batches (26CE1–26CE6).
//
// This is a static reference file (no Firestore writes) — re-export and
// re-parse it from the portal each semester the way academic-calendar-data.js
// and curriculum-data.js get refreshed.
//
// Course codes are shown as-is from the portal (e.g. "HSI-101") — full
// subject names weren't reliably available from the source page, so we
// don't guess them here to avoid mislabeling a course.
//
// "type" is one of: Lecture, Tutorial, Practical.
// "batches" lists every sub-batch (26CE1..26CE6) this session applies to —
// most Tutorial/Practical rows apply to exactly one; common Lectures list
// several (sometimes all six) sharing the same room/faculty/slot.
// "batchLabel" (e.g. "Batch 1") is the portal's own internal teaching-group
// label for that shared session — informational only, distinct from the
// student's own 26CEx admission batch.
// ==========================================

export const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TIMETABLE_BATCHES = ['26CE1', '26CE2', '26CE3', '26CE4', '26CE5', '26CE6'];

// The portal's fixed row structure — kept explicit (rather than derived from
// TIMETABLE_ENTRIES) so the 13:00–14:00 Lunch Break row still renders even
// though no batch has a class in it.
export const TIMETABLE_SLOTS = [
  { start: '08:00', end: '08:55' },
  { start: '09:00', end: '09:55' },
  { start: '10:00', end: '10:55' },
  { start: '11:05', end: '12:00' },
  { start: '12:05', end: '13:00' },
  { start: '13:00', end: '14:00', isBreak: true },
  { start: '14:00', end: '14:55' },
  { start: '15:00', end: '15:55' },
  { start: '16:05', end: '17:00' },
  { start: '17:05', end: '18:00' },
  { start: '18:05', end: '19:00' }
];

// Styling per session type — same class-naming convention as CATEGORY_META
// in academic-calendar-data.js so the two calendars feel like one system.
export const TIMETABLE_TYPE_META = {
  Lecture: {
    label: 'Lecture',
    dot: 'bg-brand-500',
    chipBg: 'bg-brand-50 dark:bg-brand-500/20',
    chipBorder: 'border-brand-100 dark:border-brand-500/30',
    chipText: 'text-brand-700 dark:text-brand-300'
  },
  Tutorial: {
    label: 'Tutorial',
    dot: 'bg-purple-500',
    chipBg: 'bg-purple-50 dark:bg-purple-500/20',
    chipBorder: 'border-purple-100 dark:border-purple-500/30',
    chipText: 'text-purple-700 dark:text-purple-300'
  },
  Practical: {
    label: 'Practical',
    dot: 'bg-emerald-500',
    chipBg: 'bg-emerald-50 dark:bg-emerald-500/20',
    chipBorder: 'border-emerald-100 dark:border-emerald-500/30',
    chipText: 'text-emerald-700 dark:text-emerald-300'
  }
};

export const TIMETABLE_ENTRIES = [
  { day: "Monday", start: "09:00", end: "09:55", type: "Tutorial", code: "MIE-101", room: "APJ AKB-303", faculty: "D.M. Joglekar", batchLabel: "", batches: ["26CE2"] },
  { day: "Monday", start: "09:00", end: "09:55", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE4"] },
  { day: "Monday", start: "10:00", end: "10:55", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE4"] },
  { day: "Monday", start: "11:05", end: "12:00", type: "Practical", code: "CEC-101", room: "", faculty: "PRITI MAHESHWARI", batchLabel: "", batches: ["26CE1"] },
  { day: "Monday", start: "11:05", end: "12:00", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE2"] },
  { day: "Monday", start: "11:05", end: "12:00", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE3"] },
  { day: "Monday", start: "12:05", end: "13:00", type: "Practical", code: "CEC-101", room: "", faculty: "PRITI MAHESHWARI", batchLabel: "", batches: ["26CE1"] },
  { day: "Monday", start: "12:05", end: "13:00", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE2"] },
  { day: "Monday", start: "12:05", end: "13:00", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE3"] },
  { day: "Monday", start: "14:00", end: "14:55", type: "Lecture", code: "TMI-103", room: "GB-102", faculty: "Rajat Agrawal,Navneet Arora,Sarbani Banerjee,Ellora Padhi,Anshul Yadav", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Monday", start: "15:00", end: "15:55", type: "Lecture", code: "MAI-101", room: "GB-102", faculty: "Sugandha Maheswary", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Monday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-101", faculty: "PRITI MAHESHWARI", batchLabel: "Batch 1", batches: ["26CE1", "26CE2"] },
  { day: "Monday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-103", faculty: "Anjaneya Dixit", batchLabel: "Batch 2", batches: ["26CE3", "26CE4"] },
  { day: "Monday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-005", faculty: "Tarun Gangwar", batchLabel: "Batch 3", batches: ["26CE5", "26CE6"] },
  { day: "Tuesday", start: "08:00", end: "08:55", type: "Lecture", code: "HSI-101", room: "GB-102", faculty: "Nagendra Kumar", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Tuesday", start: "09:00", end: "09:55", type: "Tutorial", code: "MAI-101", room: "APJ AKB-505", faculty: "Sugandha Maheswary", batchLabel: "", batches: ["26CE1"] },
  { day: "Tuesday", start: "09:00", end: "09:55", type: "Tutorial", code: "MIE-101", room: "APJ AKB-303", faculty: "SATISH C. SHARMA", batchLabel: "", batches: ["26CE6"] },
  { day: "Tuesday", start: "09:00", end: "09:55", type: "Tutorial", code: "MIE-101", room: "APJ AKB-304", faculty: "D.M. Joglekar", batchLabel: "", batches: ["26CE3"] },
  { day: "Tuesday", start: "10:00", end: "10:55", type: "Tutorial", code: "MAI-101", room: "APJ AKB-504", faculty: "Sugandha Maheswary", batchLabel: "", batches: ["26CE4"] },
  { day: "Tuesday", start: "11:05", end: "12:00", type: "Practical", code: "CEC-101", room: "", faculty: "Kaustav Chatterjee", batchLabel: "", batches: ["26CE2"] },
  { day: "Tuesday", start: "11:05", end: "12:00", type: "Tutorial", code: "PHI-101", room: "APJ AKB-505", faculty: "", batchLabel: "", batches: ["26CE1"] },
  { day: "Tuesday", start: "11:05", end: "12:00", type: "Tutorial", code: "PHI-101", room: "APJ AKB-504", faculty: "", batchLabel: "", batches: ["26CE3"] },
  { day: "Tuesday", start: "11:05", end: "12:00", type: "Tutorial", code: "PHI-101", room: "APJ AKB-503", faculty: "", batchLabel: "", batches: ["26CE5"] },
  { day: "Tuesday", start: "12:05", end: "13:00", type: "Practical", code: "CEC-101", room: "", faculty: "Kaustav Chatterjee", batchLabel: "", batches: ["26CE2"] },
  { day: "Tuesday", start: "12:05", end: "13:00", type: "Tutorial", code: "PHI-101", room: "APJ AKB-505", faculty: "", batchLabel: "", batches: ["26CE4"] },
  { day: "Tuesday", start: "12:05", end: "13:00", type: "Tutorial", code: "PHI-101", room: "APJ AKB-504", faculty: "", batchLabel: "", batches: ["26CE6"] },
  { day: "Tuesday", start: "14:00", end: "14:55", type: "Lecture", code: "TMI-103", room: "GB-102", faculty: "Rajat Agrawal,Navneet Arora,Sarbani Banerjee,Ellora Padhi,Anshul Yadav", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Tuesday", start: "15:00", end: "15:55", type: "Lecture", code: "PHI-101", room: "GB-102", faculty: "Manjari Garg", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Tuesday", start: "16:05", end: "17:00", type: "Lecture", code: "MIE-101", room: "GB-102", faculty: "D.M. Joglekar", batchLabel: "Batch 3", batches: ["26CE1", "26CE2", "26CE3"] },
  { day: "Tuesday", start: "16:05", end: "17:00", type: "Lecture", code: "MIE-101", room: "GB-202", faculty: "SATISH C. SHARMA", batchLabel: "Batch 4", batches: ["26CE4", "26CE5", "26CE6"] },
  { day: "Tuesday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-101", faculty: "PRITI MAHESHWARI", batchLabel: "Batch 1", batches: ["26CE1", "26CE2"] },
  { day: "Tuesday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-103", faculty: "Anjaneya Dixit", batchLabel: "Batch 2", batches: ["26CE3", "26CE4"] },
  { day: "Tuesday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-005", faculty: "Tarun Gangwar", batchLabel: "Batch 3", batches: ["26CE5", "26CE6"] },
  { day: "Wednesday", start: "09:00", end: "09:55", type: "Practical", code: "HSI-101", room: "APJ AKB-601", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE1"] },
  { day: "Wednesday", start: "09:00", end: "09:55", type: "Practical", code: "HSI-101", room: "APJ AKB-602", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE2"] },
  { day: "Wednesday", start: "09:00", end: "09:55", type: "Practical", code: "HSI-101", room: "APJ AKB-603", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE3"] },
  { day: "Wednesday", start: "09:00", end: "09:55", type: "Tutorial", code: "MIE-101", room: "APJ AKB-303", faculty: "SATISH C. SHARMA", batchLabel: "", batches: ["26CE4"] },
  { day: "Wednesday", start: "09:00", end: "09:55", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE6"] },
  { day: "Wednesday", start: "09:00", end: "09:55", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE5"] },
  { day: "Wednesday", start: "10:00", end: "10:55", type: "Practical", code: "HSI-101", room: "APJ AKB-601", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE1"] },
  { day: "Wednesday", start: "10:00", end: "10:55", type: "Practical", code: "HSI-101", room: "APJ AKB-602", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE2"] },
  { day: "Wednesday", start: "10:00", end: "10:55", type: "Practical", code: "HSI-101", room: "APJ AKB-603", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE3"] },
  { day: "Wednesday", start: "10:00", end: "10:55", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE6"] },
  { day: "Wednesday", start: "10:00", end: "10:55", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE5"] },
  { day: "Wednesday", start: "11:05", end: "12:00", type: "Practical", code: "CEC-101", room: "", faculty: "Anjaneya Dixit", batchLabel: "", batches: ["26CE3"] },
  { day: "Wednesday", start: "11:05", end: "12:00", type: "Practical", code: "HSI-101", room: "APJ AKB-601", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE5"] },
  { day: "Wednesday", start: "11:05", end: "12:00", type: "Practical", code: "HSI-101", room: "APJ AKB-602", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE6"] },
  { day: "Wednesday", start: "11:05", end: "12:00", type: "Practical", code: "HSI-101", room: "APJ AKB-603", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE4"] },
  { day: "Wednesday", start: "12:05", end: "13:00", type: "Practical", code: "CEC-101", room: "", faculty: "Anjaneya Dixit", batchLabel: "", batches: ["26CE3"] },
  { day: "Wednesday", start: "12:05", end: "13:00", type: "Practical", code: "HSI-101", room: "APJ AKB-603", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE4"] },
  { day: "Wednesday", start: "12:05", end: "13:00", type: "Practical", code: "HSI-101", room: "APJ AKB-601", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE5"] },
  { day: "Wednesday", start: "12:05", end: "13:00", type: "Practical", code: "HSI-101", room: "APJ AKB-602", faculty: "Nagendra Kumar", batchLabel: "", batches: ["26CE6"] },
  { day: "Wednesday", start: "14:00", end: "14:55", type: "Lecture", code: "PHI-101", room: "GB-102", faculty: "Manjari Garg", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Wednesday", start: "15:00", end: "15:55", type: "Lecture", code: "MAI-101", room: "GB-102", faculty: "Sugandha Maheswary", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Thursday", start: "08:00", end: "08:55", type: "Lecture", code: "HSI-101", room: "GB-102", faculty: "Nagendra Kumar", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Thursday", start: "09:00", end: "09:55", type: "Tutorial", code: "MAI-101", room: "APJ AKB-506", faculty: "Sugandha Maheswary", batchLabel: "", batches: ["26CE2"] },
  { day: "Thursday", start: "09:00", end: "09:55", type: "Tutorial", code: "MAI-101", room: "APJ AKB-505", faculty: "Sugandha Maheswary", batchLabel: "", batches: ["26CE3"] },
  { day: "Thursday", start: "10:00", end: "10:55", type: "Tutorial", code: "MAI-101", room: "APJ AKB-506", faculty: "Sugandha Maheswary", batchLabel: "", batches: ["26CE5"] },
  { day: "Thursday", start: "10:00", end: "10:55", type: "Tutorial", code: "MAI-101", room: "APJ AKB-505", faculty: "Sugandha Maheswary", batchLabel: "", batches: ["26CE6"] },
  { day: "Thursday", start: "10:00", end: "10:55", type: "Tutorial", code: "MIE-101", room: "GB-315", faculty: "D.M. Joglekar", batchLabel: "", batches: ["26CE1"] },
  { day: "Thursday", start: "11:05", end: "12:00", type: "Practical", code: "CEC-101", room: "", faculty: "Tarun Gangwar", batchLabel: "", batches: ["26CE5"] },
  { day: "Thursday", start: "11:05", end: "12:00", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE1"] },
  { day: "Thursday", start: "12:05", end: "13:00", type: "Practical", code: "CEC-101", room: "", faculty: "Tarun Gangwar", batchLabel: "", batches: ["26CE5"] },
  { day: "Thursday", start: "12:05", end: "13:00", type: "Practical", code: "PHI-101", room: "", faculty: "", batchLabel: "", batches: ["26CE1"] },
  { day: "Thursday", start: "14:00", end: "14:55", type: "Lecture", code: "TMI-103", room: "GB-102", faculty: "Rajat Agrawal,Navneet Arora,Sarbani Banerjee,Ellora Padhi,Anshul Yadav", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Thursday", start: "15:00", end: "15:55", type: "Lecture", code: "MIE-101", room: "GB-102", faculty: "D.M. Joglekar", batchLabel: "Batch 3", batches: ["26CE1", "26CE2", "26CE3"] },
  { day: "Thursday", start: "15:00", end: "15:55", type: "Lecture", code: "MIE-101", room: "GB-202", faculty: "SATISH C. SHARMA", batchLabel: "Batch 4", batches: ["26CE4", "26CE5", "26CE6"] },
  { day: "Thursday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-101", faculty: "PRITI MAHESHWARI", batchLabel: "Batch 1", batches: ["26CE1", "26CE2"] },
  { day: "Thursday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-103", faculty: "Anjaneya Dixit", batchLabel: "Batch 2", batches: ["26CE3", "26CE4"] },
  { day: "Thursday", start: "17:05", end: "18:00", type: "Lecture", code: "CEC-101", room: "GB-005", faculty: "Tarun Gangwar", batchLabel: "Batch 3", batches: ["26CE5", "26CE6"] },
  { day: "Friday", start: "09:00", end: "09:55", type: "Tutorial", code: "MIE-101", room: "GB-316", faculty: "SATISH C. SHARMA", batchLabel: "", batches: ["26CE5"] },
  { day: "Friday", start: "09:00", end: "09:55", type: "Tutorial", code: "PHI-101", room: "APJ AKB-404", faculty: "", batchLabel: "", batches: ["26CE2"] },
  { day: "Friday", start: "11:05", end: "12:00", type: "Practical", code: "CEC-101", room: "", faculty: "Rajib Chowdhury", batchLabel: "", batches: ["26CE4"] },
  { day: "Friday", start: "12:05", end: "13:00", type: "Practical", code: "CEC-101", room: "", faculty: "Rajib Chowdhury", batchLabel: "", batches: ["26CE4"] },
  { day: "Friday", start: "14:00", end: "14:55", type: "Lecture", code: "PHI-101", room: "GB-102", faculty: "Manjari Garg", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Friday", start: "15:00", end: "15:55", type: "Lecture", code: "MAI-101", room: "GB-102", faculty: "Sugandha Maheswary", batchLabel: "Batch 1", batches: ["26CE1", "26CE2", "26CE3", "26CE4", "26CE5", "26CE6"] },
  { day: "Friday", start: "16:05", end: "17:00", type: "Lecture", code: "MIE-101", room: "GB-102", faculty: "D.M. Joglekar", batchLabel: "Batch 3", batches: ["26CE1", "26CE2", "26CE3"] },
  { day: "Friday", start: "16:05", end: "17:00", type: "Lecture", code: "MIE-101", room: "GB-202", faculty: "SATISH C. SHARMA", batchLabel: "Batch 4", batches: ["26CE4", "26CE5", "26CE6"] },
];