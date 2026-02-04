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

// [3] 달력 생성 핵심 함수
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

    // 데이터 합산 도우미 함수
    const accumulateData = (y, m, d) => {
        const dayOfWeek = new Date(y, m, d).getDay();
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = allSchedules.filter(s => s.date === dateStr);
        
        // ⭐️ 수정: 요일 제한(1~5)을 삭제하여 모든 날짜를 합산함
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
    
    // 1. 이전 달 날짜 채우기
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = spaces - 1; i >= 0; i--) {
        const d = prevMonthLastDate - i;
        const prevY = month === 0 ? year - 1 : year;
        const prevM = month === 0 ? 11 : month - 1;
        const events = accumulateData(prevY, prevM, d);
        grid.appendChild(createDayDiv(prevY, prevM, d, true, events));
    }

    // 2. 이번 달 날짜 채우기
    for (let i = 1; i <= lastDate; i++) {
        const events = accumulateData(year, month, i);
        const dateDiv = createDayDiv(year, month, i, false, events);
        grid.appendChild(dateDiv);

        const isSundayColumn = (spaces + i) % 7 === 0;
        if (isSundayColumn) {
            showWeeklySummary(dateDiv, weekScheduleCount, weekExtraMinutes);
            weekScheduleCount = 0; weekExtraMinutes = 0;
        } 
        // 마지막 날인데 일요일이 아니면 다음 달 날짜로 주간 합계 마무리
        else if (i === lastDate) {
            let nextDay = 1;
            let remaining = 7 - ((spaces + i) % 7);
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

// [4] 날짜 칸 생성 도우미
function createDayDiv(y, m, d, isOther, events) {
    const div = document.createElement('div');
    div.className = 'calendar-day' + (isOther ? ' other-month' : '');
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    div.innerHTML = `<span class="date-number">${d}</span>`;
    events.forEach(event => {
    const loc = document.createElement('div');
        loc.className = 'calendar-event-badge clickable-loc';
        
        // ⭐️ 1. 텍스트 파싱 ([주석] 내용 찾기)
        const noteMatch = event.location.match(/^\[(.*?)\]/);
        let displayHtml = event.location;
        let baseLocation = event.location;
    
        if (noteMatch) {
            const note = noteMatch[0]; // [주석] 부분
            const rest = event.location.replace(note, "").trim(); // 나머지 주소
            // 달력 표시용 HTML: 주석은 굵고 빨간색으로
            displayHtml = `<span style="color: #d93025; font-weight: 800;">${note}</span> ${rest}`;
            baseLocation = rest; // 지도 검색에 사용할 기본 주소
        }
        
        loc.innerHTML = displayHtml; // 태그 적용을 위해 innerHTML 사용
    
        // ⭐️ 2. 클릭 시 네이버 지도 이동 로직
        loc.onclick = (e) => {
            e.stopPropagation();
    
            // [주석]이 제거된 baseLocation에서 '동/호/층'만 추가로 정제
            let cleanLocation = baseLocation.split(/(\d+동|\d+호|\d+층)/)[0].trim();
            
            const finalQuery = cleanLocation.length > 1 ? cleanLocation : baseLocation;
            const searchQuery = encodeURIComponent(finalQuery);
            const naverMapUrl = `https://map.naver.com/v5/search/${searchQuery}`;
            
            window.open(naverMapUrl, '_blank');
        };        
        
        div.appendChild(loc);

        if (event.endTime) {
            const time = document.createElement('div');
            time.className = 'calendar-time-badge';
            time.innerText = `~${event.endTime}`;
            div.appendChild(time);

            const [h, min] = event.endTime.split(':').map(Number);
            const diff = (h * 60 + min) - (1080); // 18:00 = 1080분
            if (diff > 0) {
                const extra = document.createElement('div');
                extra.className = 'calendar-extra-badge';
                extra.innerText = `(+${Math.floor(diff/60)}h ${diff%60}m)`;
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

// [5] 주간 합계 표시
function showWeeklySummary(target, count, mins) {
    if (count === 0 && mins === 0) return;
    const summary = document.createElement('div');
    summary.className = 'week-summary-badge';
    summary.innerHTML = `<div class="summary-title">주간 합계</div><div>${count}회 | +${Math.floor(mins/60)}h ${mins%60}m</div>`;
    target.appendChild(summary);
}

// [6] 날짜 선택 및 폼 제어
function selectDate(dateStr) {
    const item = allSchedules.find(s => s.date === dateStr);
    if (item) {
        editSchedule(item.id);
    } else {
        resetForm();
        document.getElementById('date').value = dateStr;
        editId = null;
        document.getElementById('submit-btn').innerText = "일정 추가하기";
    }
    document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' });
}

// [7] 데이터 저장/수정
window.addSchedule = async function() {
    const user = window.auth.currentUser;
    if (!user) return alert("로그인이 필요합니다.");

    const data = {
        date: document.getElementById('date').value,
        location: document.getElementById('location').value,
        endTime: document.getElementById('end-time').value,
        teammates: document.getElementById('teammates').value,
        memo: document.getElementById('memo').value,
        userId: user.uid,
        timestamp: Date.now()
    };

    if (!data.date || !data.location) return alert("필수 항목을 입력하세요.");

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

// [기타 보조 함수들]
window.changeMonth = (diff) => { currentViewDate.setMonth(currentViewDate.getMonth() + diff); renderCalendar(); };
window.editSchedule = (id) => {
    const item = allSchedules.find(s => s.id === id);
    if (!item) return;
    ['date','location','end-time','teammates','memo'].forEach(k => {
        document.getElementById(k === 'end-time' ? 'end-time' : k).value = item[k === 'end-time' ? 'endTime' : k];
    });
    editId = id;
    document.getElementById('submit-btn').innerText = "수정 완료하기";
};
window.deleteSchedule = async (id) => {
    if (!confirm("삭제할까요?")) return;
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    await deleteDoc(doc(window.db, "schedules", id));
    displaySchedules();
};
function renderList(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '';
    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `<strong>[${item.date}]</strong> ${item.location} <button onclick="editSchedule('${item.id}')">수정</button>`;
        list.appendChild(li);
    });
}
function resetForm() {
    ['location','memo','date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('end-time').value = '18:00';
    const user = window.auth.currentUser;
    if (user) document.getElementById('teammates').value = user.displayName;
}
window.login = () => window.signInWithPopup(window.auth, window.provider);
window.logout = () => window.signOut(window.auth);
window.displaySchedules = displaySchedules;
