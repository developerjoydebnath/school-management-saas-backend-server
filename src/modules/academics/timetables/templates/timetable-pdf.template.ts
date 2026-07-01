type TimetablePdfAssignment = {
  subjectName?: string | { en?: string; bn?: string };
  teacherName?: string;
  roomNumber?: string;
};

type TimetablePdfColumn = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
};

type TimetablePdfData = {
  schoolName: string;
  schoolLogo?: string | null;
  sessionName?: string | null;
  className: string;
  sectionNames: string[];
  days: string[];
  columns: TimetablePdfColumn[];
  cells: Record<string, TimetablePdfAssignment[]>;
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

function getLocalizedValue(value: unknown, locale: string) {
  if (!value || typeof value !== 'object') return escapeHtml(value);
  const localized = value as { en?: string; bn?: string };
  return escapeHtml(
    locale === 'bn' ? localized.bn || localized.en : localized.en,
  );
}

function renderAssignment(assignment: TimetablePdfAssignment, locale: string) {
  return `
    <div class="assignment">
      <div class="subject">${getLocalizedValue(assignment.subjectName, locale)}</div>
      ${
        assignment.teacherName
          ? `<div class="meta">${escapeHtml(assignment.teacherName)}</div>`
          : ''
      }
      ${
        assignment.roomNumber
          ? `<div class="meta">Room ${escapeHtml(assignment.roomNumber)}</div>`
          : ''
      }
    </div>
  `;
}

function renderCell(
  cells: Record<string, TimetablePdfAssignment[]>,
  day: string,
  column: TimetablePdfColumn,
  locale: string,
) {
  if (column.type !== 'Period') {
    return `<td class="special-cell">${escapeHtml(column.type)}</td>`;
  }

  const assignments = cells[`${day}_${column.id}`] || [];
  if (!assignments.length) return '<td class="empty-cell">-</td>';

  return `<td>${assignments.map((item) => renderAssignment(item, locale)).join('')}</td>`;
}

export function getTimetablePdfTemplate(data: TimetablePdfData) {
  const locale = data.locale === 'bn' ? 'bn' : 'en';
  const title = locale === 'bn' ? 'ক্লাস রুটিন' : 'Class Timetable';
  const sections = data.sectionNames.length
    ? data.sectionNames.join(', ')
    : locale === 'bn'
      ? 'প্রযোজ্য নয়'
      : 'Not applicable';

  return `
<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font-family: Arial, "Noto Sans Bengali", sans-serif;
      font-size: 11px;
      background: #ffffff;
    }
    .page {
      width: 100%;
      padding: 4px;
    }
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
    .logo {
      width: 54px;
      height: 54px;
      object-fit: contain;
    }
    .school-name {
      font-size: 19px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 4px;
    }
    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: .02em;
      text-transform: uppercase;
    }
    .meta-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0 12px;
    }
    .meta-box {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 6px 8px;
    }
    .label {
      color: #6b7280;
      font-size: 9px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .value {
      font-size: 11px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #9ca3af;
      vertical-align: top;
      padding: 6px;
    }
    th {
      background: #f3f4f6;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
    }
    .day-column {
      width: 82px;
      background: #f9fafb;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
    }
    .period-time {
      display: block;
      color: #4b5563;
      font-size: 9px;
      font-weight: 500;
      margin-top: 2px;
    }
    .assignment + .assignment {
      margin-top: 5px;
      padding-top: 5px;
      border-top: 1px dashed #d1d5db;
    }
    .subject {
      font-weight: 700;
      line-height: 1.25;
    }
    .meta {
      color: #4b5563;
      font-size: 9.5px;
      margin-top: 2px;
      line-height: 1.25;
    }
    .special-cell {
      background: #fff7ed;
      color: #9a3412;
      text-align: center;
      vertical-align: middle;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .empty-cell {
      color: #9ca3af;
      text-align: center;
      vertical-align: middle;
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
        <p class="title">${escapeHtml(title)}</p>
      </div>
    </div>

    <div class="meta-row">
      <div class="meta-box">
        <div class="label">${locale === 'bn' ? 'সেশন' : 'Session'}</div>
        <div class="value">${escapeHtml(data.sessionName || '-')}</div>
      </div>
      <div class="meta-box">
        <div class="label">${locale === 'bn' ? 'শ্রেণি' : 'Class'}</div>
        <div class="value">${escapeHtml(data.className)}</div>
      </div>
      <div class="meta-box">
        <div class="label">${locale === 'bn' ? 'শাখা' : 'Section'}</div>
        <div class="value">${escapeHtml(sections)}</div>
      </div>
      <div class="meta-box">
        <div class="label">${locale === 'bn' ? 'তারিখ' : 'Generated'}</div>
        <div class="value">${escapeHtml(data.generatedAt.toLocaleDateString('en-GB'))}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="day-column">${locale === 'bn' ? 'দিন' : 'Day'}</th>
          ${data.columns
            .map(
              (column) => `
                <th>
                  ${escapeHtml(column.name)}
                  <span class="period-time">${escapeHtml(column.startTime)}-${escapeHtml(column.endTime)}</span>
                </th>
              `,
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${data.days
          .map(
            (day) => `
              <tr>
                <td class="day-column">${escapeHtml(locale === 'bn' ? banglaDays[day] || day : day)}</td>
                ${data.columns.map((column) => renderCell(data.cells, day, column, locale)).join('')}
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer">
      <span>${locale === 'bn' ? 'স্বয়ংক্রিয়ভাবে তৈরি' : 'Auto generated timetable'}</span>
      <span>NEXA School Management System</span>
    </div>
  </div>
</body>
</html>
`;
}
