// ==========================================
// SINGLE SOURCE OF TRUTH: Semester -> Subject mapping
// Derived from the B.Tech (Civil Engineering) program structure.
// Used by contribute_material.js, index.js, and moderation.js so the
// three pages never fall out of sync with each other.
// ==========================================

export const CURRICULUM = {
  "1st Semester (Autumn)": [
    "Engineering Mechanics",
    "Soft Skills",
    "Mathematics-I",
  ],
  "2nd Semester (Spring)": [
    "Geospatial Engineering-I",
    "Fluid Mechanics",
    "Solid Mechanics"
  ],
  "3rd Semester (Autumn)": [
    "Geospatial Engineering-II",
    "Structural Analysis-I",
    "Channel Hydraulics"
  ],
  "4th Semester (Spring)": [
    "Water Supply Engineering",
    "Structural Analysis-II",
    "Design of Reinforced Concrete"
  ],
  "5th Semester (Autumn)": [
    "Soil Mechanics",
    "Waste Water Engineering",
    "Design of Steel Elements",
    "Highway and Traffic Engineering"
  ],
  "6th Semester (Spring)": [
    "Design of Structural Systems",
    "Foundation Engineering",
    "Railway Engineering"
  ],
  // 7th/8th sem core credits are almost entirely Program Electives, BTP,
  // and Minor Specialization/Departmental Honours courses rather than
  // fixed CEC-xxx subjects, so we give a single catch-all option here.
  "7th Semester (Autumn)": [
    "Program Elective / BTP / Internship"
  ],
  "8th Semester (Spring)": [
    "Program Elective / BTP / Internship"
  ]
};

export const ALL_SEMESTERS = Object.keys(CURRICULUM);

export const ALL_SUBJECTS = Array.from(new Set(Object.values(CURRICULUM).flat()));

export function getSubjectsForSemester(semester) {
  return CURRICULUM[semester] || [];
}

// Fills a <select> with <option> elements.
// - options: array of strings
// - placeholder: text for the first, disabled option
// - selectedValue: pre-select this value if it's present in options
export function populateSelect(selectEl, options, placeholder, selectedValue = '') {
  if (!selectEl) return;
  selectEl.innerHTML = '';

  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder;
  ph.disabled = true;
  ph.selected = !selectedValue;
  selectEl.appendChild(ph);

  options.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === selectedValue) o.selected = true;
    selectEl.appendChild(o);
  });
}