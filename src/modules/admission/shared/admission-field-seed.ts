type AdmissionFieldSeed = {
  fieldKey: string;
  section: string;
  label: string;
  labelBn?: string;
  fieldType: string;
  placeholder: string;
  options?: any;
  dependsOnFieldKey?: string;
  isSystem: boolean;
  isSystemLocked: boolean;
  isShown: boolean;
  isRequired: boolean;
  showInFastMode?: boolean;
  showInFullMode?: boolean;
  requiredInFastMode?: boolean;
  requiredInFullMode?: boolean;
  sortOrder: number;
};

const option = (label: string, value: string) => ({ label, value });

const field = (
  sortOrder: number,
  section: string,
  fieldKey: string,
  label: string,
  fieldType: string,
  placeholder: string,
  overrides: Partial<AdmissionFieldSeed> = {},
): AdmissionFieldSeed => ({
  fieldKey,
  section,
  label,
  fieldType,
  placeholder,
  isSystem: true,
  isSystemLocked: false,
  isShown: true,
  isRequired: false,
  sortOrder,
  ...overrides,
});

const locked = (overrides: Partial<AdmissionFieldSeed> = {}) => ({
  isSystemLocked: true,
  isRequired: true,
  isShown: true,
  showInFastMode: true,
  showInFullMode: true,
  requiredInFastMode: true,
  requiredInFullMode: true,
  ...overrides,
});

export const ADMISSION_SYSTEM_FIELDS: AdmissionFieldSeed[] = [
  field(10, 'student_info', 'studentNameEn', 'Student Full Name', 'text', 'Enter student full name', locked()),
  field(20, 'student_info', 'studentNameBn', 'Student Bangla Name', 'text', 'Enter student Bangla name'),
  field(30, 'student_info', 'dateOfBirth', 'Date of Birth', 'date', 'Select date of birth', locked()),
  field(40, 'student_info', 'gender', 'Gender', 'select', 'Select gender', {
    ...locked(),
    options: [option('Male', 'male'), option('Female', 'female'), option('Other', 'other')],
  }),
  field(50, 'student_info', 'birthRegistrationNo', 'Birth Registration No', 'text', 'Enter birth registration number'),
  field(60, 'student_info', 'bloodGroup', 'Blood Group', 'select', 'Select blood group', {
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => option(value, value)),
  }),
  field(70, 'student_info', 'religion', 'Religion', 'select', 'Select religion', {
    options: [
      option('Islam', 'islam'),
      option('Hinduism', 'hinduism'),
      option('Christianity', 'christianity'),
      option('Buddhism', 'buddhism'),
      option('Other', 'other'),
    ],
  }),
  field(80, 'student_info', 'nationality', 'Nationality', 'text', 'e.g. Bangladeshi'),
  field(85, 'student_info', 'email', 'Student Email', 'email', 'Enter student email address'),
  field(90, 'student_info', 'specialQuota', 'Special Quota', 'select', 'Select quota', {
    options: [
      option('None', 'none'),
      option('Freedom Fighter', 'freedom_fighter'),
      option('Indigenous', 'indigenous'),
      option('Disability', 'disability'),
      option('Sibling', 'sibling'),
      option('Other', 'other'),
    ],
  }),
  field(100, 'student_info', 'photoUrl', 'Student Photo', 'file', 'Upload student photo'),

  field(210, 'academic_info', 'applyingClassId', 'Applying Class', 'dynamic_select', 'Select class', {
    ...locked(),
    options: { source: 'classes' },
  }),
  field(220, 'academic_info', 'sectionId', 'Section', 'dynamic_select', 'Select section', {
    options: { source: 'sections_by_class' },
    dependsOnFieldKey: 'applyingClassId',
  }),
  field(230, 'academic_info', 'sessionId', 'Session Year', 'dynamic_select', 'Select session', {
    ...locked(),
    options: { source: 'sessions' },
  }),
  field(240, 'academic_info', 'admissionType', 'Admission Type', 'select', 'Select admission type', {
    ...locked(),
    options: [
      option('New Admission', 'new'),
      option('Transfer', 'transfer'),
      option('Re-admission', 're_admission'),
    ],
  }),
  field(250, 'academic_info', 'mediumOrVersion', 'Medium / Version', 'select', 'Select medium or version', {
    options: [option('Bangla', 'bangla'), option('English', 'english'), option('Both', 'both')],
  }),
  field(260, 'academic_info', 'shift', 'Shift', 'dynamic_select', 'Select shift', {
    options: { source: 'shifts' },
  }),
  field(270, 'academic_info', 'groupOrDept', 'Group / Department', 'select', 'Select group or department', {
    options: [
      option('General', 'general'),
      option('Science', 'science'),
      option('Business Studies', 'business_studies'),
      option('Humanities', 'humanities'),
    ],
  }),
  field(280, 'academic_info', 'previousSchoolName', 'Previous School Name', 'text', 'Enter previous school name'),
  field(290, 'academic_info', 'previousSchoolEiin', 'Previous School EIIN', 'text', 'Enter previous school EIIN'),
  field(300, 'academic_info', 'transferCertificateNo', 'Transfer Certificate No', 'text', 'Enter transfer certificate number'),
  field(310, 'academic_info', 'lastClassCompleted', 'Last Class Completed', 'text', 'e.g. Class 5'),
  field(320, 'academic_info', 'lastExamResult', 'Last Exam Result', 'text', 'e.g. GPA 5.00'),

  field(410, 'parent_info', 'fatherName', "Father's Name", 'text', "Enter father's name", locked()),
  field(420, 'parent_info', 'fatherNameBn', "Father's Bangla Name", 'text', "Enter father's Bangla name"),
  field(430, 'parent_info', 'fatherNid', "Father's NID", 'text', "Enter father's NID"),
  field(440, 'parent_info', 'fatherOccupation', "Father's Occupation", 'text', "Enter father's occupation"),
  field(450, 'parent_info', 'fatherMobile', "Father's Mobile Number", 'phone', 'e.g. 01712345678', locked()),
  field(460, 'parent_info', 'motherName', "Mother's Name", 'text', "Enter mother's name"),
  field(470, 'parent_info', 'motherNameBn', "Mother's Bangla Name", 'text', "Enter mother's Bangla name"),
  field(480, 'parent_info', 'motherNid', "Mother's NID", 'text', "Enter mother's NID"),
  field(490, 'parent_info', 'motherOccupation', "Mother's Occupation", 'text', "Enter mother's occupation"),
  field(500, 'parent_info', 'motherMobile', "Mother's Mobile Number", 'phone', 'e.g. 01712345678'),
  field(510, 'parent_info', 'monthlyFamilyIncome', 'Monthly Family Income', 'number', 'e.g. 30000'),

  field(610, 'guardian_info', 'guardianName', "Guardian's Name", 'text', "Enter guardian's name"),
  field(620, 'guardian_info', 'guardianRelation', 'Guardian Relation', 'text', 'e.g. Uncle'),
  field(630, 'guardian_info', 'guardianNid', "Guardian's NID", 'text', "Enter guardian's NID"),
  field(640, 'guardian_info', 'guardianMobile', "Guardian's Mobile Number", 'phone', 'e.g. 01712345678'),
  field(650, 'guardian_info', 'localGuardianName', 'Local Guardian Name', 'text', 'Enter local guardian name'),
  field(660, 'guardian_info', 'localGuardianMobile', 'Local Guardian Mobile', 'phone', 'e.g. 01712345678'),
  field(670, 'guardian_info', 'localGuardianAddress', 'Local Guardian Address', 'textarea', 'Enter local guardian address'),
  field(680, 'guardian_info', 'emergencyContactName', 'Emergency Contact Name', 'text', 'Enter emergency contact name'),
  field(690, 'guardian_info', 'emergencyContactPhone', 'Emergency Contact Phone', 'phone', 'e.g. 01712345678'),

  field(810, 'address', 'presentAddress', 'Present Address', 'textarea', 'Enter present address'),
  field(820, 'address', 'presentDivisionId', 'Present Division', 'dynamic_select', 'Select present division', {
    options: { source: 'divisions' },
  }),
  field(830, 'address', 'presentDistrictId', 'Present District', 'dynamic_select', 'Select present district', {
    options: { source: 'districts_by_division' },
    dependsOnFieldKey: 'presentDivisionId',
  }),
  field(840, 'address', 'presentUpazilaId', 'Present Upazila', 'dynamic_select', 'Select present upazila', {
    options: { source: 'upazilas_by_district' },
    dependsOnFieldKey: 'presentDistrictId',
  }),
  field(850, 'address', 'permanentSameAsPresent', 'Permanent Same As Present', 'checkbox', 'Use present address'),
  field(860, 'address', 'permanentAddress', 'Permanent Address', 'textarea', 'Enter permanent address'),
  field(870, 'address', 'permanentDivisionId', 'Permanent Division', 'dynamic_select', 'Select permanent division', {
    options: { source: 'divisions' },
  }),
  field(880, 'address', 'permanentDistrictId', 'Permanent District', 'dynamic_select', 'Select permanent district', {
    options: { source: 'districts_by_division' },
    dependsOnFieldKey: 'permanentDivisionId',
  }),
  field(890, 'address', 'permanentUpazilaId', 'Permanent Upazila', 'dynamic_select', 'Select permanent upazila', {
    options: { source: 'upazilas_by_district' },
    dependsOnFieldKey: 'permanentDistrictId',
  }),

  field(1010, 'health_info', 'allergies', 'Allergies', 'textarea', 'Enter allergies if any'),
  field(1020, 'health_info', 'medicalConditions', 'Medical Conditions', 'textarea', 'Enter medical conditions if any'),
  field(1030, 'health_info', 'disabilityType', 'Disability Type', 'text', 'Enter disability type if any'),
  field(1040, 'health_info', 'immunizationComplete', 'Immunization Complete', 'checkbox', 'Mark immunization complete'),

  field(1210, 'payment', 'admissionFeeAmount', 'Admission Fee Amount', 'number', 'e.g. 1500'),
  field(1220, 'payment', 'paymentStatus', 'Payment Status', 'select', 'Select payment status', {
    options: [
      option('Pending', 'pending'),
      option('Paid', 'paid'),
      option('Partial', 'partial'),
      option('Waived', 'waived'),
    ],
  }),
  field(1230, 'payment', 'paymentMethod', 'Payment Method', 'select', 'Select payment method', {
    options: { source: 'payment_methods' },
  }),
  field(1240, 'payment', 'transactionId', 'Transaction ID', 'text', 'Enter transaction ID'),
  field(1250, 'payment', 'paidAt', 'Paid At', 'date', 'Select payment date'),

  field(1410, 'documents', 'birthRegistrationDocument', 'Birth Registration', 'file', 'Upload birth registration document'),
  field(1420, 'documents', 'documents', 'Documents', 'file', 'Upload documents'),
  field(1430, 'documents', 'previousSchoolTestimonial', 'Previous School Testimonial', 'file', 'Upload previous school testimonial'),
  field(1440, 'documents', 'transferCertificateDocument', 'Transfer Certificate', 'file', 'Upload transfer certificate'),
  field(1450, 'documents', 'fatherNidDocument', 'Father NID', 'file', "Upload father's NID"),
  field(1460, 'documents', 'motherNidDocument', 'Mother NID', 'file', "Upload mother's NID"),
  field(1470, 'documents', 'guardianNidDocument', 'Guardian NID', 'file', "Upload guardian's NID"),
  field(1480, 'documents', 'medicalDocument', 'Medical Document', 'file', 'Upload medical document'),
  field(1490, 'documents', 'paymentSlipDocument', 'Payment Slip', 'file', 'Upload payment slip'),
  field(1500, 'documents', 'otherDocument', 'Other Document', 'file', 'Upload other document'),
  field(1610, 'additional_info', 'notes', 'Internal Notes', 'textarea', 'Enter internal notes'),
];
