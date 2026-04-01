'use strict';

const STORAGE_KEY = 'meonjeomeokja_mvp_items_v1';
const CONSUMED_KEY  = 'meonjeomeokja_consumed_v1';

const STORAGE_META = {
  all: { label: '전체', icon: '<img src="assets/icon_all_1774998652863.png" class="app-icon" alt="전체">', tagClass: '' },
  fridge: { label: '냉장', icon: '<img src="assets/icon_fridge_1774998665567.png" class="app-icon" alt="냉장">', tagClass: 'tag-fridge' },
  freezer: { label: '냉동', icon: '<img src="assets/icon_freezer_1774998679890.png" class="app-icon" alt="냉동">', tagClass: 'tag-freezer' },
  room: { label: '실온', icon: '<img src="assets/icon_room_1774998697115.png" class="app-icon" alt="실온">', tagClass: 'tag-room' },
};

const HOME_FILTERS = [
  {
    key: 'all',
    label: '전체 재료',
    title: '전체 재료 목록',
    helper: '등록된 재료를 한 번에 보고 먼저 먹을 재료를 고를 수 있어요.',
    emptyTitle: '등록된 재료가 없어요',
    emptySub: '+ 버튼을 눌러 먼저 먹을 재료를 추가해보세요',
  },
  {
    key: 'today',
    label: '오늘 먹기',
    title: '오늘 먹어야 할 재료',
    helper: '유통기한이 오늘이거나 지난 재료만 보여줍니다.',
    emptyTitle: '오늘 먹기 재료가 없어요',
    emptySub: '급한 재료가 없어서 조금 여유롭네요',
  },
  {
    key: 'soon',
    label: '곧 임박',
    title: '빠르게 챙기면 좋은 재료',
    helper: '1~2일 안에 먹으면 좋은 재료만 보여줍니다.',
    emptyTitle: '곧 임박한 재료가 없어요',
    emptySub: '지금은 조금 더 여유 있게 사용할 수 있어요',
  },
  {
    key: 'safe',
    label: '여유 있음',
    title: '여유 있는 재료',
    helper: '6일 이상 남은 재료만 보여줍니다.',
    emptyTitle: '여유 있는 재료가 없어요',
    emptySub: '등록된 재료가 적거나 임박한 재료가 많아요',
  },
];

const SAMPLE_ITEMS = [
  { id: uid(), name: '우유', quantity: '1팩', storage: 'fridge', expiryDate: offsetDate(0), memo: '개봉했으면 오늘 마시기', createdAt: new Date().toISOString() },
  { id: uid(), name: '두부', quantity: '1모', storage: 'fridge', expiryDate: offsetDate(1), memo: '찌개용', createdAt: new Date().toISOString() },
  { id: uid(), name: '버섯', quantity: '2봉', storage: 'fridge', expiryDate: offsetDate(4), memo: '볶음밥에 쓰기 좋음', createdAt: new Date().toISOString() },
  { id: uid(), name: '만두', quantity: '1봉', storage: 'freezer', expiryDate: offsetDate(8), memo: '급할 때 한 끼용', createdAt: new Date().toISOString() },
  { id: uid(), name: '사과', quantity: '3개', storage: 'room', expiryDate: offsetDate(7), memo: '간식용', createdAt: new Date().toISOString() },
];

const state = {
  items: [],
  consumedItems: [],
  homeFilter: 'all',
  storageTab: 'all',
  search: '',
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ITEMS));
      return [...SAMPLE_ITEMS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SAMPLE_ITEMS];
  } catch {
    return [...SAMPLE_ITEMS];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function loadConsumedItems() {
  try {
    const raw = localStorage.getItem(CONSUMED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConsumedItems() {
  localStorage.setItem(CONSUMED_KEY, JSON.stringify(state.consumedItems));
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

function parseStableDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function calcDaysLeft(item) {
  const target = parseStableDate(item.expiryDate);
  if (!target) return null;
  return Math.floor((target.getTime() - todayDate().getTime()) / 86400000);
}

function getItemStatus(item) {
  const daysLeft = calcDaysLeft(item);
  if (daysLeft === null) {
    return { key: 'safe', label: '여유 있음', className: 'badge-good', daysLeft: 999, ddayText: '날짜 미입력', hint: '유통기한을 입력하면 자동 정렬됩니다.' };
  }
  if (daysLeft < 0) {
    return {
      key: 'today',
      label: '기한 지남',
      className: 'badge-past',
      daysLeft,
      ddayText: `${Math.abs(daysLeft)}일 지남`,
      hint: '가장 먼저 먹는 것이 좋아요.',
    };
  }
  if (daysLeft === 0) {
    return {
      key: 'today',
      label: '오늘 먹기',
      className: 'badge-urgent',
      daysLeft,
      ddayText: '오늘까지',
      hint: '가장 먼저 먹는 것이 좋아요.',
    };
  }
  if (daysLeft <= 2) {
    return {
      key: 'soon',
      label: '곧 임박',
      className: 'badge-urgent',
      daysLeft,
      ddayText: `${daysLeft}일 남음`,
      hint: '이번 주 안에 먹으면 좋아요.',
    };
  }
  if (daysLeft >= 6) {
    return {
      key: 'safe',
      label: '여유 있음',
      className: 'badge-good',
      daysLeft,
      ddayText: `${daysLeft}일 남음`,
      hint: '아직은 여유가 있는 재료예요.',
    };
  }
  return {
    key: 'care',
    label: '주의',
    className: 'badge-warning',
    daysLeft,
    ddayText: `${daysLeft}일 남음`,
    hint: '곧 챙겨야 할 수 있어요.',
  };
}

function formatDate(dateString) {
  const date = parseStableDate(dateString);
  if (!date) return '날짜 미입력';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function escHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aDays = calcDaysLeft(a);
    const bDays = calcDaysLeft(b);
    if (aDays === null && bDays === null) return 0;
    if (aDays === null) return 1;
    if (bDays === null) return -1;
    if (aDays !== bDays) return aDays - bDays;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

function getSummaryCounts(items) {
  return items.reduce((acc, item) => {
    const status = getItemStatus(item);
    acc.all += 1;
    if (status.key === 'today') acc.today += 1;
    if (status.key === 'soon') acc.soon += 1;
    if (status.key === 'safe') acc.safe += 1;
    return acc;
  }, { all: 0, today: 0, soon: 0, safe: 0 });
}

function filterItems() {
  return sortItems(state.items.filter((item) => {
    if (state.storageTab !== 'all' && item.storage !== state.storageTab) return false;
    if (state.search && !item.name.toLowerCase().includes(state.search.toLowerCase())) return false;

    const status = getItemStatus(item);
    if (state.homeFilter === 'all') return true;
    if (state.homeFilter === 'today') return status.key === 'today';
    if (state.homeFilter === 'soon') return status.key === 'soon';
    if (state.homeFilter === 'safe') return status.key === 'safe';
    return true;
  }));
}

function render() {
  if (state.storageTab === 'history') {
    document.getElementById('statsRow').style.display = 'none';
    renderConsumedList();
  } else if (state.storageTab === 'calendar') {
    document.getElementById('statsRow').style.display = 'none';
    renderCalendar();
  } else {
    document.getElementById('statsRow').style.display = '';
    renderSummaryCards();
    renderList();
  }
}

function renderConsumedList() {
  const wrap = document.getElementById('foodListWrap');
  const list = state.consumedItems;

  if (list.length === 0) {
    wrap.innerHTML = `
      <div class="section-header" style="margin-top:12px">
        <span class="section-icon">🍽️</span>
        <span class="section-title">먹은 재료 기록</span>
      </div>
      <div class="consumed-clear-row"></div>
      <div class="empty-state">
        <div class="empty-state-icon">🍽️</div>
        <div class="empty-state-title">먹은 재료 기록이 없어요</div>
        <div class="empty-state-sub">재료에서 "😋 먹었어요"를 누르면<br>여기에 기록이 남아요</div>
      </div>
    `;
    return;
  }

  // 날짜별 그룹핑
  const groups = {};
  list.forEach((item) => {
    const dateKey = item.consumedAt
      ? item.consumedAt.slice(0, 10)
      : 'unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  });

  const today     = offsetDate(0);
  const yesterday = offsetDate(-1);

  function dateLabel(key) {
    if (key === today)     return '오늘';
    if (key === yesterday) return '어제';
    const [y, m, d] = key.split('-');
    return `${y}.${m}.${d}`;
  }

  const groupHtml = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => `
      <div class="consumed-date-group">
        <div class="consumed-date-label">${dateLabel(key)}</div>
        <div class="food-cards">
          ${groups[key].map(buildConsumedCard).join('')}
        </div>
      </div>
    `).join('');

  wrap.innerHTML = `
    <div class="section-header" style="margin-top:12px; justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="section-icon">🍽️</span>
        <span class="section-title">먹은 재료 기록</span>
        <span class="section-count">${list.length}개</span>
      </div>
      <button class="btn-ghost" style="height:30px;font-size:12px;padding:0 10px" onclick="clearAllConsumed()">전체삭제</button>
    </div>
    ${groupHtml}
  `;
}

function buildConsumedCard(item) {
  const storage = STORAGE_META[item.storage] || STORAGE_META.fridge;
  const dateStr = item.consumedAt
    ? item.consumedAt.slice(0, 10).replace(/-/g, '.')
    : '';

  return `
    <div class="food-card consumed-card" data-id="${item.id}">
      <div class="food-card-header">
        <div class="fcard-header-left">
          <div class="food-name">${escHtml(item.name)}</div>
        </div>
        <div class="fcard-header-right">
          <div class="dday-badge badge-good">
            <span class="dday-num">😋 먹음</span>
          </div>
          <div class="fcard-date">
            <span class="fcard-date-label">먹은날짜</span>
            <span class="fcard-date-value">${dateStr}</span>
          </div>
        </div>
      </div>

      <div class="fcard-body">
        <div class="food-tags">
          <span class="food-tag tag-category">${escHtml(storage.label)}</span>
          <span class="food-tag tag-category">소비 완료</span>
          ${item.quantity ? `<span class="food-quantity">수량: ${escHtml(item.quantity)}</span>` : ''}
        </div>

        ${item.memo ? `<div class="food-meta"><span class="food-memo">${escHtml(item.memo)}</span></div>` : ''}
      </div>

      <div class="food-actions">
        <button class="btn-ghost" type="button" onclick="restoreConsumed('${item.id}')">↩️ 기한 목록으로 복구</button>
        <button class="btn-eat btn-delete" type="button" onclick="deleteConsumed('${item.id}')">🗑️ 기록 삭제</button>
      </div>
    </div>
  `;
}

function renderSummaryCards() {
  const counts = getSummaryCounts(state.items);
  const row = document.getElementById('statsRow');
  row.innerHTML = HOME_FILTERS.map((filter) => `
    <button class="stat-card stat-filter ${state.homeFilter === filter.key ? 'active' : ''}" type="button" data-filter="${filter.key}">
      <div class="stat-number">${counts[filter.key]}</div>
      <div class="stat-label">${filter.label}</div>
    </button>
  `).join('');

  row.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.homeFilter = button.dataset.filter;
      render();
    });
  });
}

function renderList() {
  const wrap = document.getElementById('foodListWrap');
  const filter = HOME_FILTERS.find((item) => item.key === state.homeFilter) || HOME_FILTERS[0];
  const list = filterItems();

  if (list.length === 0) {
    wrap.innerHTML = `
      <div class="section-header list-header">
        <div>
          <div class="section-title">${filter.title}</div>
          <div class="section-subtitle">${filter.helper}</div>
        </div>
        <span class="section-count">0개</span>
      </div>
      ${buildEmpty(filter)}
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="section-header list-header">
      <div>
        <div class="section-title">${filter.title}</div>
        <div class="section-subtitle">${filter.helper}</div>
      </div>
      <span class="section-count">${list.length}개</span>
    </div>
    <div class="food-cards">${list.map(buildCard).join('')}</div>
  `;
}

function buildCard(item) {
  const status = getItemStatus(item);
  const storage = STORAGE_META[item.storage] || STORAGE_META.fridge;

  return `
    <div class="food-card" data-id="${item.id}">
      <div class="food-card-header">
        <div class="fcard-header-left">
          <div class="food-name">${escHtml(item.name)}</div>
        </div>
        <div class="fcard-header-right">
          <div class="dday-badge ${status.className}">
            <span class="dday-num">${escHtml(status.ddayText)}</span>
          </div>
          <div class="fcard-date">
            <span class="fcard-date-label">유통기한</span>
            <span class="fcard-date-value">${formatDate(item.expiryDate)}</span>
          </div>
        </div>
      </div>

      <div class="fcard-body">
        <div class="food-tags">
          <span class="food-tag tag-category">${escHtml(storage.label)}</span>
          <span class="food-tag tag-category">${escHtml(status.label)}</span>
          ${item.quantity ? `<span class="food-quantity">수량: ${escHtml(item.quantity)}</span>` : ''}
        </div>

        ${item.memo ? `<div class="food-meta"><span class="food-memo">${escHtml(item.memo)}</span></div>` : ''}
        
        <div class="food-status-copy">${escHtml(status.hint)}</div>
      </div>

      <div class="food-actions">
        <button class="btn-ghost" type="button" onclick="openEditModal('${item.id}')">✏️ 수정</button>
        <button class="btn-ghost btn-delete-ghost" type="button" onclick="deleteItem('${item.id}')">🗑️ 삭제</button>
        <button class="btn-eat" type="button" onclick="consumeItem('${item.id}')">😋 먹었어요</button>
      </div>
    </div>
  `;
}

function buildEmpty(filter) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🥗</div>
      <div class="empty-state-title">${filter.emptyTitle}</div>
      <div class="empty-state-sub">${filter.emptySub}</div>
    </div>
  `;
}

function openAddModal() {
  resetForm();
  document.getElementById('modalTitle').textContent = '🥦 재료 추가';
  document.getElementById('submitBtn').textContent = '✅ 저장하기';
  showModal();
}

function openEditModal(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  resetForm();
  document.getElementById('modalTitle').textContent = '✏️ 재료 수정';
  document.getElementById('submitBtn').textContent = '💾 저장하기';
  document.getElementById('editId').value = item.id;
  document.getElementById('foodName').value = item.name || '';
  document.getElementById('foodQty').value = item.quantity || '';
  document.getElementById('foodBestBefore').value = item.expiryDate || '';
  document.getElementById('foodMemo').value = item.memo || '';
  setStorage(item.storage || 'fridge');
  showModal();
}

function resetForm() {
  document.getElementById('foodForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('foodBestBefore').value = offsetDate(3);
  setStorage('fridge');
}

function setStorage(value) {
  document.getElementById('foodStorage').value = value;
  document.querySelectorAll('.storage-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.storage === value);
  });
}

function showModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('foodName').focus(), 280);
}

function hideModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function addItem(data) {
  state.items.unshift({ id: uid(), createdAt: new Date().toISOString(), ...data });
  saveItems();
  render();
  showToast('✅ 재료가 추가됐어요');
}

function updateItem(id, data) {
  state.items = state.items.map((item) => (
    item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
  ));
  saveItems();
  render();
  showToast('✏️ 재료를 수정했어요');
}

function deleteItem(id) {
  state.items = state.items.filter((item) => item.id !== id);
  saveItems();
  render();
  showToast('🗑️ 재료를 삭제했어요');
}

function consumeItem(id) {
  const itemIndex = state.items.findIndex((entry) => entry.id === id);
  if (itemIndex === -1) return;
  const item = state.items[itemIndex];

  let quantityReduced = false;
  let consumedQtyStr = item.quantity || '';
  let consumedId = item.id;

  // 수량 차감 로직 (첫 번째 숫자 매칭)
  if (item.quantity) {
    const match = item.quantity.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > 1) {
        item.quantity = item.quantity.replace(match[0], (num - 1).toString());
        quantityReduced = true;
        consumedQtyStr = consumedQtyStr.replace(match[0], '1');
        consumedId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
      }
    }
  }

  // 먹은 기록 추가
  const consumed = { 
    ...item, 
    id: consumedId,
    quantity: consumedQtyStr, 
    consumedAt: new Date().toISOString() 
  };
  state.consumedItems.unshift(consumed);
  saveConsumedItems();

  if (quantityReduced) {
    saveItems();
    render();
    showToast(`1개 소비했어요! (남은 수량: ${item.quantity})`);
  } else {
    // 전량 소비 (수량이 1이거나 숫자가 없는 경우)
    state.items.splice(itemIndex, 1);
    saveItems();
    render();
    showToast('😋 전부 소비했어요! 🍽️');
  }
}

function deleteConsumed(id) {
  state.consumedItems = state.consumedItems.filter((entry) => entry.id !== id);
  saveConsumedItems();
  renderConsumedList();
  showToast('🗑️ 먹은 기록을 삭제했어요');
}

function restoreConsumed(id) {
  const itemIndex = state.consumedItems.findIndex((entry) => entry.id === id);
  if (itemIndex === -1) return;

  const item = state.consumedItems.splice(itemIndex, 1)[0];
  delete item.consumedAt;
  state.items.push(item);

  saveItems();
  saveConsumedItems();
  renderConsumedList();
  showToast('↩️ 재료 목록으로 복구했어요!');
}

function clearAllConsumed() {
  if (!confirm('먹은 기록을 전부 삭제할까요?')) return;
  state.consumedItems = [];
  saveConsumedItems();
  renderConsumedList();
  showToast('🗑️ 전체 기록을 삭제했어요');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

function showUndoToast(message, undoLabel, duration, onUndo) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-warn';
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-undo-btn" type="button">${undoLabel}</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
  `;
  container.appendChild(toast);

  let undone = false;

  const undoBtn = toast.querySelector('.toast-undo-btn');
  undoBtn.addEventListener('click', () => {
    if (undone) return;
    undone = true;
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
    onUndo();
  });

  const timer = setTimeout(() => {
    if (undone) return;
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);

  // 되돌리기 시 타이머 취소
  undoBtn.addEventListener('click', () => clearTimeout(timer));
}

/* ============================================
   📅 달력 기능
   ============================================ */
const calState = { year: new Date().getFullYear(), month: new Date().getMonth() };

function renderCalendar() {
  const wrap = document.getElementById('foodListWrap');
  const { year, month } = calState;
  const today = new Date();
  const todayStr = offsetDate(0);

  // 이달 첫날/마지막날
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // 월요일 시작

  // 유통기한 날짜 → 재료 매핑
  const expiryMap = {};
  state.items.forEach((item) => {
    if (!item.expiryDate) return;
    if (!expiryMap[item.expiryDate]) expiryMap[item.expiryDate] = [];
    expiryMap[item.expiryDate].push(item);
  });

  // 달력 셀 생성
  const totalCells = startDow + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  let cells = '';

  // 빈 셀 (이전 달)
  for (let i = 0; i < startDow; i++) {
    cells += `<div class="cal-cell cal-empty"></div>`;
  }

  // 날짜 셀
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const items = expiryMap[dateStr] || [];
    const dots = items.map((item) => {
      const s = getItemStatus(item);
      return `<span class="cal-dot ${s.className}"></span>`;
    }).join('');

    cells += `
      <div class="cal-cell ${isToday ? 'cal-today' : ''} ${items.length ? 'cal-has-items' : ''}" 
           onclick="calSelectDate('${dateStr}')">
        <span class="cal-day-num">${d}</span>
        <div class="cal-dots">${dots}</div>
      </div>`;
  }

  // 월 이름
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  wrap.innerHTML = `
    <div class="cal-wrap">
      <div class="cal-header">
        <button class="cal-nav-btn" onclick="calMove(-1)">&#8249;</button>
        <span class="cal-title">${year}년 ${monthNames[month]}</span>
        <button class="cal-nav-btn" onclick="calMove(1)">&#8250;</button>
      </div>
      <div class="cal-grid">
        <div class="cal-dow">월</div><div class="cal-dow">화</div>
        <div class="cal-dow">수</div><div class="cal-dow">목</div>
        <div class="cal-dow">금</div>
        <div class="cal-dow cal-dow-sat">토</div>
        <div class="cal-dow cal-dow-sun">일</div>
        ${cells}
      </div>
      <div class="cal-detail" id="calDetail">
        <div class="cal-detail-empty">날짜를 탭하면 재료를 볼 수 있어요 📅</div>
      </div>
    </div>
  `;
}

function calMove(delta) {
  calState.month += delta;
  if (calState.month < 0)  { calState.month = 11; calState.year--; }
  if (calState.month > 11) { calState.month = 0;  calState.year++; }
  renderCalendar();
}

function calSelectDate(dateStr) {
  const detail = document.getElementById('calDetail');
  if (!detail) return;
  const items = state.items.filter((item) => item.expiryDate === dateStr);
  const [y, m, d] = dateStr.split('-');
  const label = `${y}년 ${m}월 ${d}일`;

  if (items.length === 0) {
    detail.innerHTML = `<div class="cal-detail-empty">${label} — 만료 재료 없음</div>`;
    return;
  }

  detail.innerHTML = `
    <div class="cal-detail-title">${label} 만료 재료</div>
    <div class="food-cards">
      ${items.map(buildCard).join('')}
    </div>`;
}

/* ============================================
   🔔 알림 기능
   ============================================ */
function updateNotifyBtn() {
  const btn = document.getElementById('notifyBtn');
  if (!btn) return;
  const perm = Notification.permission;
  btn.textContent = perm === 'granted' ? '🔔' : '🔕';
  btn.title = perm === 'granted' ? '알림 켜짐' : '알림 끄짐 (탭하여 켜기)';
}

async function handleNotifyBtn() {
  if (!('Notification' in window)) {
    showToast('⚠️ 이 브라우저는 알림을 지원하지 않아요', 'error');
    return;
  }
  if (Notification.permission === 'granted') {
    checkAndNotify(true);
    return;
  }
  const result = await Notification.requestPermission();
  updateNotifyBtn();
  if (result === 'granted') {
    showToast('🔔 알림이 켜졌어요!');
    checkAndNotify(false);
  } else {
    showToast('알림 권한이 거부됐어요. 브라우저 설정에서 허용해주세요.', 'warn');
  }
}

function checkAndNotify(manual = false) {
  if (Notification.permission !== 'granted') return;

  const urgent = state.items.filter((item) => {
    const d = calcDaysLeft(item);
    return d !== null && d <= 2 && d >= 0;
  });

  if (urgent.length === 0) {
    if (manual) showToast('✅ 임박한 재료가 없어요!');
    return;
  }

  const names = urgent.map((i) => i.name).join(', ');
  new Notification('🥗 먼저먹자! — 유통기한 임박', {
    body: `${urgent.length}개 재료가 곧 만료돼요: ${names}`,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'expiry-alert',
    renotify: true,
  });

  if (manual) showToast(`🔔 ${urgent.length}개 임박 재료 알림을 보냈어요!`);
}

function bindEvents() {
  document.getElementById('headerAddBtn').addEventListener('click', openAddModal);
  document.getElementById('notifyBtn').addEventListener('click', handleNotifyBtn);
  document.getElementById('modalClose').addEventListener('click', hideModal);
  document.getElementById('modalOverlay').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) hideModal();
  });

  document.querySelectorAll('.storage-btn').forEach((button) => {
    button.addEventListener('click', () => setStorage(button.dataset.storage));
  });

  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.storageTab = tab.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach((button) => button.classList.remove('active'));
      tab.classList.add('active');
      render();
    });
  });

  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    render();
  });

  document.getElementById('foodForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('foodName').value.trim();
    const quantity = document.getElementById('foodQty').value.trim();
    const storage = document.getElementById('foodStorage').value;
    const expiryDate = document.getElementById('foodBestBefore').value;
    const memo = document.getElementById('foodMemo').value.trim();

    if (!name) {
      showToast('⚠️ 재료명을 입력해주세요');
      return;
    }

    if (!expiryDate) {
      showToast('⚠️ 유통기한을 입력해주세요');
      return;
    }

    const data = { name, quantity, storage, expiryDate, memo };
    const editId = document.getElementById('editId').value;

    if (editId) {
      updateItem(editId, data);
    } else {
      addItem(data);
    }

    hideModal();
  });
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function init() {
  state.items = loadItems();
  state.consumedItems = loadConsumedItems();
  bindEvents();
  render();
  updateNotifyBtn();
  // 앱 실행 시 자동 알림 체크
  setTimeout(() => checkAndNotify(false), 1500);
}

window.openEditModal    = openEditModal;
window.deleteItem       = deleteItem;
window.consumeItem      = consumeItem;
window.deleteConsumed   = deleteConsumed;
window.clearAllConsumed = clearAllConsumed;
window.calMove          = calMove;
window.calSelectDate    = calSelectDate;

document.addEventListener('DOMContentLoaded', init);
