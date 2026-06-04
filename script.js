const users = [
  { id: 'pepa', name: 'Pepa', password: 'pepa123' },
  { id: 'kuba', name: 'Kuba', password: 'kuba123' },
  { id: 'matej', name: 'Matej', password: 'matej123' },
  { id: 'me', name: 'Me', password: 'me123' }
];

const storageKey = 'friendsTripPlannerEvents';
let currentUser = null;
let events = loadEvents();

const $ = (id) => document.getElementById(id);

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || []; }
  catch { return []; }
}

function saveEvents() {
  localStorage.setItem(storageKey, JSON.stringify(events));
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function monthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange() {
  const start = $('monthFrom').value;
  const end = $('monthTo').value;
  if (!start || !end || start > end) return null;
  return { start, end };
}

function daysBetween(startISO, endISO) {
  const out = [];
  let cursor = fromISO(startISO);
  const end = fromISO(endISO);
  while (cursor <= end) {
    out.push(toISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function setupDefaults() {
  const now = new Date();
  const june = new Date(now.getFullYear(), 5, 1);
  const august = new Date(now.getFullYear(), 7, 1);
  $('monthFrom').value = monthValue(june);
  $('monthTo').value = monthValue(august);

  $('userSelect').innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  renderFriendCheckboxes();
}

function renderFriendCheckboxes() {
  $('friendCheckboxes').innerHTML = users.map(user => `
    <label class="checkbox-line">
      <input type="checkbox" class="friendCheck" value="${user.id}" checked />
      ${user.name}
    </label>
  `).join('');
}

function login() {
  const id = $('userSelect').value;
  const password = $('passwordInput').value;
  const user = users.find(u => u.id === id && u.password === password);
  if (!user) {
    $('loginError').textContent = 'Wrong login information.';
    return;
  }
  currentUser = user;
  $('loginView').classList.add('hidden');
  $('plannerView').classList.remove('hidden');
  $('loggedUser').textContent = `Logged in as ${currentUser.name}`;
  $('loginError').textContent = '';
  renderAll();
}

function logout() {
  currentUser = null;
  $('plannerView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
  $('passwordInput').value = '';
}

function addEvent() {
  const title = $('eventTitle').value.trim() || 'Busy';
  const start = $('eventStart').value;
  const end = $('eventEnd').value;
  $('eventError').textContent = '';

  if (!start || !end) {
    $('eventError').textContent = 'Choose both start and end date.';
    return;
  }
  if (start > end) {
    $('eventError').textContent = 'End date must be after start date.';
    return;
  }

  events.push({
    id: crypto.randomUUID(),
    userId: currentUser.id,
    title,
    start,
    end
  });
  saveEvents();

  $('eventTitle').value = '';
  $('eventStart').value = '';
  $('eventEnd').value = '';
  renderAll();
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveEvents();
  renderAll();
}

function renderCalendar() {
  const range = getMonthRange();
  if (!range) return;
  const calendar = $('calendar');
  calendar.innerHTML = '';

  const startDate = new Date(Number(range.start.slice(0, 4)), Number(range.start.slice(5, 7)) - 1, 1);
  const endDate = new Date(Number(range.end.slice(0, 4)), Number(range.end.slice(5, 7)) - 1, 1);
  const todayISO = toISO(new Date());

  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    const monthEl = document.createElement('div');
    monthEl.className = 'month';
    monthEl.innerHTML = `
      <div class="month-title">${monthNames[month]} ${year}</div>
      <div class="weekdays">${weekdayNames.map(d => `<div>${d}</div>`).join('')}</div>
      <div class="days"></div>
    `;
    const daysEl = monthEl.querySelector('.days');

    for (let i = 0; i < mondayOffset; i++) {
      const empty = document.createElement('div');
      empty.className = 'day empty';
      daysEl.appendChild(empty);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const iso = toISO(new Date(year, month, day));
      const dayEvents = events.filter(e => iso >= e.start && iso <= e.end);
      const dayEl = document.createElement('div');
      dayEl.className = `day ${dayEvents.length ? 'busy' : ''} ${iso === todayISO ? 'today' : ''}`;
      dayEl.title = dayEvents.map(e => `${userName(e.userId)}: ${e.title} (${e.start} to ${e.end})`).join('\n');
      dayEl.innerHTML = `<div class="day-number">${day}</div>`;
      if (dayEvents.length) {
        dayEl.innerHTML += `<div class="busy-line"></div>`;
        dayEl.innerHTML += dayEvents.slice(0, 2).map(e => `<span class="event-chip">${userName(e.userId)}: ${escapeHtml(e.title)}</span>`).join('');
      }
      daysEl.appendChild(dayEl);
    }

    calendar.appendChild(monthEl);
    cursor.setMonth(cursor.getMonth() + 1);
  }
}

function userName(id) {
  return users.find(u => u.id === id)?.name || id;
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function selectedUserIds() {
  if ($('allFriendsCheckbox').checked) return users.map(u => u.id);
  return [...document.querySelectorAll('.friendCheck:checked')].map(i => i.value);
}

function findFreeDates() {
  const range = getMonthRange();
  const picked = selectedUserIds();
  if (!range || picked.length === 0) return;

  const rangeStart = `${range.start}-01`;
  const endMonthDate = new Date(Number(range.end.slice(0, 4)), Number(range.end.slice(5, 7)), 0);
  const rangeEnd = toISO(endMonthDate);

  const allDays = daysBetween(rangeStart, rangeEnd);
  const freeDays = allDays.filter(day => {
    return !events.some(e => picked.includes(e.userId) && day >= e.start && day <= e.end);
  });

  $('resultsCard').classList.remove('hidden');
  $('resultsSummary').textContent = `${freeDays.length} free day(s) found for: ${picked.map(userName).join(', ')}`;
  $('freeResults').innerHTML = groupConsecutiveDays(freeDays).map(group => `
    <div class="result-block">
      <strong>${formatRange(group[0], group[group.length - 1])}</strong>
      <div>${group.length} day(s)</div>
    </div>
  `).join('') || '<p>No common free dates in this timeframe.</p>';
}

function groupConsecutiveDays(days) {
  const groups = [];
  let current = [];
  for (const day of days) {
    if (!current.length) {
      current.push(day);
      continue;
    }
    const prev = fromISO(current[current.length - 1]);
    prev.setDate(prev.getDate() + 1);
    if (toISO(prev) === day) current.push(day);
    else { groups.push(current); current = [day]; }
  }
  if (current.length) groups.push(current);
  return groups;
}

function formatRange(start, end) {
  if (start === end) return start;
  return `${start} → ${end}`;
}

function renderMyEvents() {
  const mine = events.filter(e => e.userId === currentUser.id).sort((a, b) => a.start.localeCompare(b.start));
  $('myEvents').innerHTML = mine.map(e => `
    <div class="event-row">
      <div>
        <strong>${escapeHtml(e.title)}</strong><br>
        <span class="muted">${e.start} → ${e.end}</span>
      </div>
      <button onclick="deleteEvent('${e.id}')">Delete</button>
    </div>
  `).join('') || '<p class="muted">You have no events yet.</p>';
}

function renderAll() {
  renderCalendar();
  renderMyEvents();
}

$('loginBtn').addEventListener('click', login);
$('passwordInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('logoutBtn').addEventListener('click', logout);
$('addEventBtn').addEventListener('click', addEvent);
$('renderCalendarBtn').addEventListener('click', renderAll);
$('freeTimeBtn').addEventListener('click', findFreeDates);
$('allFriendsCheckbox').addEventListener('change', e => {
  document.querySelectorAll('.friendCheck').forEach(ch => ch.checked = e.target.checked);
});

document.addEventListener('change', e => {
  if (e.target.classList?.contains('friendCheck')) {
    const checks = [...document.querySelectorAll('.friendCheck')];
    $('allFriendsCheckbox').checked = checks.every(ch => ch.checked);
  }
});

setupDefaults();
