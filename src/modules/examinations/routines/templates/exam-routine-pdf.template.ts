type RoutineSubject = {
  examDate?: Date | string | null;
  startTime?: string | null;
  durationMins?: number;
  subjectName?: string;
  subjectCode?: string | null;
  classRoom?: { roomNo?: string | null; name?: string | null } | null;
  invigilatorName?: string | null;
  status?: string;
};

type ExamRoutinePdfData = {
  schoolName: string;
  schoolLogo?: string | null;
  examName: string;
  sessionName?: string | null;
  className: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  instructions?: string | null;
  subjects: RoutineSubject[];
  locale: string;
  generatedAt: Date;
};

const banglaDays: Record<string, string> = {
  Sunday: 'রবিবার',
  Monday: 'সোমবার',
  Tuesday: 'মঙ্গলবার',
  Wednesday: 'বুধবার',
  Thursday: 'বৃহস্পতিবার',
  Friday: 'শুক্রবার',
  Saturday: 'শনিবার',
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDay(value: Date | string | null | undefined, locale: string) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = date.toLocaleDateString('en-US', { weekday: 'long' });
  return locale === 'bn' ? banglaDays[day] || day : day;
}

function addMinutes(time?: string | null, minutes?: number) {
  if (!time || !minutes) return '';
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  const date = new Date(2000, 0, 1, hour, minute);
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function label(locale: string, en: string, bn: string) {
  return locale === 'bn' ? bn : en;
}

export function getExamRoutinePdfTemplate(data: ExamRoutinePdfData) {
  const locale = data.locale === 'bn' ? 'bn' : 'en';
  const sortedSubjects = [...data.subjects].sort((a, b) => {
    const aDate = a.examDate ? new Date(a.examDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.examDate ? new Date(b.examDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDate !== bDate) return aDate - bDate;
    return String(a.startTime || '').localeCompare(String(b.startTime || ''));
  });

  return `
<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.examName)} ${escapeHtml(label(locale, 'Routine', 'রুটিন'))}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font-family: Arial, "Noto Sans Bengali", sans-serif;
      font-size: 11px;
      background: #ffffff;
    }
    .page { width: 100%; padding: 4px; }
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 10px;
      text-align: center;
    }
    .logo { width: 54px; height: 54px; object-fit: contain; }
    .school-name { font-size: 19px; font-weight: 700; line-height: 1.2; margin: 0 0 4px; }
    .title { margin: 0; font-size: 15px; font-weight: 700; text-transform: uppercase; }
    .meta-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0 12px;
    }
    .meta-box { border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 8px; }
    .label { color: #6b7280; font-size: 9px; text-transform: uppercase; margin-bottom: 2px; }
    .value { font-size: 11px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #9ca3af; vertical-align: top; padding: 7px 6px; }
    th { background: #f3f4f6; text-align: left; font-size: 10px; font-weight: 700; }
    .date-col { width: 110px; }
    .day-col { width: 92px; }
    .time-col { width: 112px; }
    .duration-col { width: 76px; text-align: center; }
    .room-col { width: 100px; }
    .status-col { width: 86px; }
    .subject { font-weight: 700; line-height: 1.3; }
    .muted { color: #4b5563; font-size: 9.5px; margin-top: 2px; }
    .instructions {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      margin-top: 12px;
      padding: 8px 10px;
      line-height: 1.5;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      color: #6b7280;
      font-size: 9px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${data.schoolLogo ? `<img class="logo" src="${escapeHtml(data.schoolLogo)}" />` : ''}
      <div>
        <h1 class="school-name">${escapeHtml(data.schoolName)}</h1>
        <p class="title">${escapeHtml(data.examName)} ${escapeHtml(label(locale, 'Routine', 'রুটিন'))}</p>
      </div>
    </div>

    <div class="meta-row">
      <div class="meta-box">
        <div class="label">${label(locale, 'Session', 'সেশন')}</div>
        <div class="value">${escapeHtml(data.sessionName || '-')}</div>
      </div>
      <div class="meta-box">
        <div class="label">${label(locale, 'Class', 'শ্রেণি')}</div>
        <div class="value">${escapeHtml(data.className)}</div>
      </div>
      <div class="meta-box">
        <div class="label">${label(locale, 'Exam Period', 'পরীক্ষার সময়কাল')}</div>
        <div class="value">${escapeHtml(formatDate(data.startDate, locale))} - ${escapeHtml(formatDate(data.endDate, locale))}</div>
      </div>
      <div class="meta-box">
        <div class="label">${label(locale, 'Generated', 'তৈরির তারিখ')}</div>
        <div class="value">${escapeHtml(formatDate(data.generatedAt, locale))}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="date-col">${label(locale, 'Date', 'তারিখ')}</th>
          <th class="day-col">${label(locale, 'Day', 'দিন')}</th>
          <th>${label(locale, 'Subject', 'বিষয়')}</th>
          <th class="time-col">${label(locale, 'Time', 'সময়')}</th>
          <th class="duration-col">${label(locale, 'Duration', 'সময়কাল')}</th>
          <th class="room-col">${label(locale, 'Room', 'কক্ষ')}</th>
          <th>${label(locale, 'Invigilator', 'পরিদর্শক')}</th>
          <th class="status-col">${label(locale, 'Status', 'অবস্থা')}</th>
        </tr>
      </thead>
      <tbody>
        ${sortedSubjects
          .map((subject) => {
            const endTime = addMinutes(subject.startTime, subject.durationMins);
            return `
              <tr>
                <td>${escapeHtml(formatDate(subject.examDate, locale))}</td>
                <td>${escapeHtml(formatDay(subject.examDate, locale))}</td>
                <td>
                  <div class="subject">${escapeHtml(subject.subjectName || '-')}</div>
                  ${subject.subjectCode ? `<div class="muted">${escapeHtml(subject.subjectCode)}</div>` : ''}
                </td>
                <td>${escapeHtml(subject.startTime || '-')}${endTime ? ` - ${escapeHtml(endTime)}` : ''}</td>
                <td class="duration-col">${escapeHtml(subject.durationMins || '-')} ${label(locale, 'min', 'মিনিট')}</td>
                <td>${escapeHtml(subject.classRoom?.roomNo || subject.classRoom?.name || '-')}</td>
                <td>${escapeHtml(subject.invigilatorName || '-')}</td>
                <td>${escapeHtml(String(subject.status || '-').replaceAll('_', ' '))}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>

    ${
      data.instructions
        ? `<div class="instructions"><strong>${label(locale, 'Instructions', 'নির্দেশনা')}:</strong> ${escapeHtml(data.instructions)}</div>`
        : ''
    }

    <div class="footer">
      <span>${label(locale, 'Auto generated exam routine', 'স্বয়ংক্রিয়ভাবে তৈরি পরীক্ষার রুটিন')}</span>
      <span>NEXA School Management System</span>
    </div>
  </div>
</body>
</html>
`;
}
