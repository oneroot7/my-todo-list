// [1] 전역 변수 설정
let currentViewDate = new Date();
let allSchedules = [];
let editId = null;

// [2] 일정 불러오기 및 업데이트
async function displaySchedules() {
    const user = window.auth.currentUser;
    if (!user) return;

    try {
        const { collection, getDocs, query, where, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        const q = query(
            collection(window.db, "schedules"), 
            where("userId", "==", user.uid), 
            orderBy("date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        allSchedules = [];
        querySnapshot.forEach((doc) => {
            allSchedules.push({ id: doc.id, ...doc.data() });
        });

        renderList(allSchedules);
        renderCalendar(); 
    } catch (e) {
        console.error("데이터 로딩 에러: ", e);
    }
}

// [3] 달력 생성 핵심 함수 (기존 로직 유지)
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-title');
    if (!grid || !title) return;
    
    grid.innerHTML = '';
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    title.innerText = `${year}년 ${month + 1}월`;

    const days = ['월', '화', '수', '목', '금', '토', '일'];
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-label';
        if (day === '일') div.style.color = '#ff4d4d';
        div.innerText = day;
        grid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay(); 
    const spaces = firstDay === 0 ? 6 : firstDay - 1;
    const lastDate = new Date(year, month + 1, 0).getDate();

    let weekScheduleCount = 0;
    let weekExtraMinutes = 0;

    const accumulateData = (y, m, d) => {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = allSchedules.filter(s => s.date === dateStr);
        
        weekScheduleCount += dayEvents.length;
        dayEvents.forEach(event => {
            if (event.endTime) {
                const [h, min] = event.endTime.split(':').map(Number);
                const diff = (h * 60 + min) - (18 * 60);
                if (diff > 0) weekExtraMinutes += diff;
            }
        });
        return dayEvents;
    };
    
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = spaces - 1; i >= 0; i--) {
        const d = prevMonthLastDate - i;
        const prevY = month === 0 ? year - 1 : year;
        const prevM = month === 0 ? 11 : month - 1;
        const events = accumulateData(prevY, prevM, d);
        grid.appendChild(createDayDiv(prevY, prevM, d, true, events));
    }

    for (let i = 1; i <= lastDate; i++) {
        const events = accumulateData(year, month, i);
        const dateDiv = createDayDiv(year, month, i, false, events);
        grid.appendChild(dateDiv);

        const isSundayColumn = (spaces + i) % 7 === 0;
        if (isSundayColumn) {
            showWeeklySummary(dateDiv, weekScheduleCount, weekExtraMinutes);
            weekScheduleCount = 0; weekExtraMinutes = 0;
        } 
        else if (i === lastDate) {
            let nextDay = 1;
            let remaining = 7 - ((spaces + i) % 7);
            if(remaining < 7) {
                for (let s = 0; s < remaining; s++) {
                    const nextY = month === 11 ? year + 1 : year;
                    const nextM = month === 11 ? 0 : month + 1;
                    const nextEvents = accumulateData(nextY, nextM, nextDay);
                    const nextDiv = createDayDiv(nextY, nextM, nextDay, true, nextEvents);
                    if (s === remaining - 1) showWeeklySummary(nextDiv, weekScheduleCount, weekExtraMinutes);
                    grid.appendChild(nextDiv);
                    nextDay++;
                }
            }
        }
    }
}

// [4] 날짜 칸 생성 (지도/주석/회차)
function createDayDiv(y, m, d, isOther, events) {
    const div = document.createElement('div');
    div.className = 'calendar-day' + (isOther ? ' other-month' : '');
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    div.innerHTML = `<span class="date-number">${d}</span>`;
    
    events.forEach(event => {
        const loc = document.createElement('div');
        loc.className = 'calendar-event-badge clickable-loc';
        
        const noteMatch = event.location.match(/^\[(.*?)\]/);
        const turnMatch = event.location.match(/\[\d+회\]$/);
        let displayHtml = event.location;
        let baseLocation = event.location;

        if (turnMatch) {
            displayHtml = displayHtml.replace(turnMatch[0], `<span style="color: #1a73e8; font-weight: bold;">${turnMatch[0]}</span>`);
            baseLocation = baseLocation.replace(turnMatch[0], "").trim();
        }
        if (noteMatch) {
            const note = noteMatch[0];
            const rest = displayHtml.replace(note, "").trim();
            displayHtml = `<span style="color: #d93025; font-weight: 800;">${note}</span> ${rest}`;
            baseLocation = baseLocation.replace(note, "").trim();
        }
        
        loc.innerHTML = displayHtml;
        loc.onclick = (e) => {
            e.stopPropagation();
            let cleanLocation = baseLocation.split(/(\d+동|\d+호|\d+층)/)[0].trim();
            window.open(`https://map.naver.com/v5/search/${encodeURIComponent(cleanLocation)}`, '_blank');
        };      
        div.appendChild(loc);

        if (event.endTime) {
        // 1. 종료 시간 배지 생성 (~18:30 형태)
            const time = document.createElement('div');
            time.className = 'calendar-time-badge';
            time.innerText = `~${event.endTime}`;
            div.appendChild(time);
        
            // 2. 연장 시간(오바타임) 계산 및 배지 생성
            const [h, min] = event.endTime.split(':').map(Number);
            const totalMinutes = h * 60 + min;
            const standardMinutes = 18 * 60; // 18:00 기준 (1080분)
            
            const diff = totalMinutes - standardMinutes;
            
            if (diff > 0) {
                const extra = document.createElement('div');
                extra.className = 'calendar-extra-badge'; // CSS에 이 클래스가 있어야 합니다
                
                const extraH = Math.floor(diff / 60);
                const extraM = diff % 60;
                
                // 1시간 이상이면 h와 m 둘 다 표시, 아니면 m만 표시
                let extraText = extraH > 0 ? `(+${extraH}h ${extraM}m)` : `(+${extraM}m)`;
                if (extraM === 0) extraText = `(+${extraH}h)`; // 정각에 끝난 경우
                
                extra.innerText = extraText;
                div.appendChild(extra);
            }
        }
    });

    if (new Date(y, m, d).getDay() === 0) div.style.color = '#ff4d4d';
    div.onclick = () => selectDate(dateStr);
    const today = new Date();
    if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) div.classList.add('today');
    return div;
}

// [5] 주간 합계 및 날짜 선택
function showWeeklySummary(target, count, mins) {
    if (count === 0 && mins === 0) return;
    const summary = document.createElement('div');
    summary.className = 'week-summary-badge';
    summary.innerHTML = `<div class="summary-title">주간 합계</div><div>${count}회 | +${Math.floor(mins/60)}h ${mins%60}m</div>`;
    target.appendChild(summary);
}

function selectDate(dateStr) {
    document.getElementById('date').value = dateStr;
    const item = allSchedules.find(s => s.date === dateStr);
    if (item) editSchedule(item.id);
    else {
        resetForm();
        document.getElementById('date').value = dateStr;
        editId = null;
        document.getElementById('submit-btn').innerText = "일정 추가하기";
    }
    document.getElementById('date').scrollIntoView({ behavior: 'smooth' });
}

// [6] 회차 계산 (일정이 있는 날만 카운트)
async function getTurnByOrder(targetDateStr) {
    const user = window.auth.currentUser;
    if (!user) return 31;
    try {
        const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const q = query(collection(window.db, "schedules"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        let uniqueDates = new Set();
        querySnapshot.forEach(doc => {
            if (editId && doc.id === editId) return;
            uniqueDates.add(doc.data().date);
        });
        const baseDate = "2026-02-05";
        const baseTurn = 31;
        const actualDatesBefore = Array.from(uniqueDates).filter(date => date >= baseDate && date < targetDateStr);
        return baseTurn + actualDatesBefore.length;
    } catch (e) { return 31; }
}

// [7] 저장/수정 로직
window.addSchedule = async function() {
    const user = window.auth.currentUser;
    if (!user) return alert("로그인이 필요합니다.");

    const dateInput = document.getElementById('date').value;
    let locationInput = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const author = document.getElementById('author').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    if (!dateInput || !locationInput) return alert("필수 항목을 입력하세요.");

    const turn = await getTurnByOrder(dateInput);
    locationInput = locationInput.replace(/\[\d+회\]/g, "").trim() + ` [${turn}회]`;

    const data = {
        date: dateInput, location: locationInput, endTime, author, teammates, memo,
        userId: user.uid, timestamp: Date.now()
    };

    try {
        const { collection, addDoc, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        if (editId) {
            await updateDoc(doc(window.db, "schedules", editId), data);
            editId = null;
            document.getElementById('submit-btn').innerText = "일정 추가하기";
        } else {
            await addDoc(collection(window.db, "schedules"), data);
        }
        resetForm();
        displaySchedules();
    } catch (e) { console.error(e); }
};

// [8] 리스트 렌더링 및 검색
function renderList(data) {
    const list = document.getElementById('schedule-list');
    if (!list) return;
    list.innerHTML = '';
    data.forEach(item => {
        const noteMatch = item.location.match(/^\[(.*?)\]/);
        let displayLoc = item.location;
        if (noteMatch) displayLoc = `<b style="color:#d93025;">${noteMatch[0]}</b> ${item.location.replace(noteMatch[0],"").trim()}`;

        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <div class="item-info">
                <strong>[${item.date}]</strong> 📍 ${displayLoc} <br>
                <span style="font-size: 0.85rem; color: #666;">
                    ⏰ ${item.endTime} 종료 | 👥 ${item.teammates || '없음'} <br>
                    📝 ${item.memo || '메모 없음'}
                </span>
            </div>
            <div class="item-btns">
                <button class="edit-btn" onclick="editSchedule('${item.id}')">수정</button>
                <button class="delete-btn" onclick="deleteSchedule('${item.id}')">삭제</button>
            </div>
        `;
        list.appendChild(li);
    });
}

window.filterList = function() {
    const query = document.getElementById('list-search').value.toLowerCase();
    const filtered = allSchedules.filter(item => {
        return (item.location.toLowerCase().includes(query) || 
                (item.teammates && item.teammates.toLowerCase().includes(query)) || 
                (item.memo && item.memo.toLowerCase().includes(query)) || 
                item.date.includes(query));
    });
    renderList(filtered);
};

// [9] 기타 제어 함수
window.changeMonth = (diff) => { currentViewDate.setMonth(currentViewDate.getMonth() + diff); renderCalendar(); };
window.editSchedule = (id) => {
    const item = allSchedules.find(s => s.id === id);
    if (!item) return;
    document.getElementById('date').value = item.date;
    document.getElementById('location').value = item.location;
    document.getElementById('end-time').value = item.endTime;
    document.getElementById('author').value = item.author || '';
    document.getElementById('teammates').value = item.teammates || '';
    document.getElementById('memo').value = item.memo || '';
    editId = id;
    document.getElementById('submit-btn').innerText = "수정 완료하기";
    document.getElementById('date').scrollIntoView({ behavior: 'smooth' });
};

window.deleteSchedule = async (id) => {
    if (!confirm("삭제할까요?")) return;
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    await deleteDoc(doc(window.db, "schedules", id));
    displaySchedules();
};

function resetForm() {
    // 모든 필드 비우기
    ['date', 'location', 'teammates', 'memo'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    // ⭐️ 작성자 칸에만 로그인한 유저 이름 넣기
    const user = window.auth.currentUser;
    if (user && document.getElementById('author')) {
        document.getElementById('author').value = user.displayName || '작성자';
    }
    
    document.getElementById('end-time').value = '18:00';
}

// 인증 상태 감시
window.auth.onAuthStateChanged(user => { if (user) displaySchedules(); });

window.login = () => window.signInWithPopup(window.auth, window.provider);
window.logout = () => window.signOut(window.auth);
