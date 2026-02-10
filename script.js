import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allSchedules = [];
let editId = null;
let currentYear = 2026;
let currentMonth = 1; // 2월 (0부터 시작)

// [1] 회차 계산: 실제 일정이 있는 날짜만 카운트
async function getTurnByOrder(targetDateStr) {
    const user = auth.currentUser;
    if (!user) return 31;
    try {
        const q = query(collection(db, "schedules"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        let uniqueDates = new Set();
        querySnapshot.forEach(doc => {
            if (editId && doc.id === editId) return;
            uniqueDates.add(doc.data().date);
        });
        const baseDate = "2026-02-05";
        const baseTurn = 31;
        const actualDatesBefore = Array.from(uniqueDates).filter(d => d >= baseDate && d < targetDateStr);
        return baseTurn + actualDatesBefore.length;
    } catch (e) { return 31; }
}

// [2] 일정 저장 (작성자/팀원 구분)
window.addSchedule = async function() {
    const user = auth.currentUser;
    if (!user) return alert("로그인 후 이용하세요.");

    const date = document.getElementById('date').value;
    let location = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const author = document.getElementById('author').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    if (!date || !location) return alert("날짜와 장소를 입력해주세요.");

    const turn = await getTurnByOrder(date);
    location = location.replace(/\[\d+회\]/g, "").trim() + ` [${turn}회]`;

    const data = { date, location, endTime, author, teammates, memo, userId: user.uid, timestamp: Date.now() };

    try {
        if (editId) {
            await updateDoc(doc(db, "schedules", editId), data);
            editId = null;
            document.getElementById('submit-btn').innerText = "일정 추가하기";
        } else {
            await addDoc(collection(db, "schedules"), data);
        }
        resetForm();
        displaySchedules();
    } catch (e) { console.error(e); }
};

// [3] 데이터 불러오기
window.displaySchedules = async function() {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "schedules"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    allSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    allSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));
    renderCalendar();
    renderList(allSchedules);
};

// [4] 달력 렌더링 (복구된 핵심 로직)
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    container.innerHTML = '';

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 빈 칸 생성
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        container.appendChild(empty);
    }

    // 날짜 생성
    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.innerHTML = `<span class="date-num">${d}</span>`;

        // 해당 날짜 일정 필터링
        const dayEvents = allSchedules.filter(e => e.date === dateStr);
        dayEvents.forEach(event => {
            const badge = document.createElement('div');
            badge.className = 'calendar-event-badge clickable-loc';
            
            // 주석/회차 강조 및 지도 연동
            let displayHtml = event.location;
            const noteMatch = displayHtml.match(/^\[(.*?)\]/);
            const turnMatch = displayHtml.match(/\[\d+회\]$/);
            
            let mapQuery = event.location;
            if (turnMatch) {
                displayHtml = displayHtml.replace(turnMatch[0], `<span style="color:blue; font-weight:bold;">${turnMatch[0]}</span>`);
                mapQuery = mapQuery.replace(turnMatch[0], "");
            }
            if (noteMatch) {
                displayHtml = displayHtml.replace(noteMatch[0], `<span style="color:red; font-weight:bold;">${noteMatch[0]}</span>`);
                mapQuery = mapQuery.replace(noteMatch[0], "");
            }
            
            badge.innerHTML = displayHtml;
            badge.onclick = (e) => {
                e.stopPropagation();
                let clean = mapQuery.split(/(\d+동|\d+호|\d+층)/)[0].trim();
                window.open(`https://map.naver.com/v5/search/${encodeURIComponent(clean)}`, '_blank');
            };
            dayDiv.appendChild(badge);
        });
        container.appendChild(dayDiv);
    }
}

// [5] 리스트 렌더링
function renderList(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '';
    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <div>
                <strong>${item.date}</strong> - ${item.location}<br>
                <small>👥 팀원: ${item.teammates || '없음'} | 👤 작성: ${item.author}</small>
            </div>
            <button onclick="editSchedule('${item.id}')">수정</button>
        `;
        list.appendChild(li);
    });
}

// [6] 기타 기능
window.editSchedule = (id) => {
    const item = allSchedules.find(s => s.id === id);
    document.getElementById('date').value = item.date;
    document.getElementById('location').value = item.location;
    document.getElementById('teammates').value = item.teammates || '';
    document.getElementById('author').value = item.author || '';
    document.getElementById('memo').value = item.memo || '';
    editId = id;
    document.getElementById('submit-btn').innerText = "수정 완료";
};

function resetForm() {
    document.getElementById('location').value = '';
    document.getElementById('teammates').value = '';
    document.getElementById('memo').value = '';
    if (auth.currentUser) document.getElementById('author').value = auth.currentUser.displayName || '';
}

auth.onAuthStateChanged(user => { if (user) displaySchedules(); });
