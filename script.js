import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allSchedules = [];
let editId = null;

// [1] 회차 계산: 실제 일정이 존재하는 '날짜'의 개수만 카운트 (2026년 기준)
async function getTurnByOrder(targetDateStr) {
    const user = auth.currentUser;
    if (!user) return 31;

    try {
        const q = query(collection(db, "schedules"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        let uniqueDates = new Set();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // 수정 중인 경우 현재 데이터의 날짜는 계산에서 제외하여 중복 방지
            if (editId && doc.id === editId) return;
            uniqueDates.add(data.date);
        });

        const baseDate = "2026-02-05"; // 기준일
        const baseTurn = 31;          // 기준 회차

        // 기준일 이후 ~ 선택한 날짜 이전까지 실제 일정이 있는 날짜 수
        const actualDatesBefore = Array.from(uniqueDates).filter(d => d >= baseDate && d < targetDateStr);

        return baseTurn + actualDatesBefore.length;
    } catch (e) {
        console.error("회차 계산 오류:", e);
        return 31;
    }
}

// [2] 일정 저장 및 수정
window.addSchedule = async function() {
    const user = auth.currentUser;
    if (!user) return alert("로그인이 필요합니다.");

    const date = document.getElementById('date').value;
    let location = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const author = document.getElementById('author').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    if (!date || !location) return alert("날짜와 장소는 필수입니다.");

    // 회차 자동 부여
    const turn = await getTurnByOrder(date);
    const turnTag = `[${turn}회]`;
    location = location.replace(/\[\d+회\]/g, "").trim(); 
    location = `${location} ${turnTag}`;

    const scheduleData = {
        date, location, endTime, author, teammates, memo,
        userId: user.uid,
        timestamp: Date.now()
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "schedules", editId), scheduleData);
            editId = null;
            document.getElementById('submit-btn').innerText = "일정 추가하기";
        } else {
            await addDoc(collection(db, "schedules"), scheduleData);
        }
        resetForm();
        displaySchedules();
    } catch (e) {
        console.error("저장 오류:", e);
    }
};

// [3] 일정 불러오기 및 달력/리스트 표시
window.displaySchedules = async function() {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "schedules"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    allSchedules = [];
    querySnapshot.forEach(doc => {
        allSchedules.push({ id: doc.id, ...doc.data() });
    });

    // 날짜순 정렬
    allSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));

    renderCalendar();
    renderList(allSchedules);
};

// [4] 하단 리스트 렌더링 및 검색 기능
window.filterList = function() {
    const queryStr = document.getElementById('list-search').value.toLowerCase();
    const filtered = allSchedules.filter(item => 
        item.location.toLowerCase().includes(queryStr) ||
        item.teammates.toLowerCase().includes(queryStr) ||
        item.memo.toLowerCase().includes(queryStr)
    );
    renderList(filtered);
};

function renderList(data) {
    const list = document.getElementById('schedule-list');
    if (!list) return;
    list.innerHTML = '';

    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <div class="item-info">
                <strong>${item.date}</strong> | ${item.location} <br>
                <span>⏰ ${item.endTime} 종료 | 👤 작성: ${item.author} | 👥 팀원: ${item.teammates || '없음'}</span>
                <p style="margin:5px 0 0 0; font-size:0.85rem; color:#666;">📝 ${item.memo}</p>
            </div>
            <div class="item-btns">
                <button class="edit-btn" onclick="editSchedule('${item.id}')">수정</button>
                <button class="delete-btn" onclick="deleteSchedule('${item.id}')">삭제</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// [5] 달력 생성 (주석/회차/지도연동 핵심)
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    container.innerHTML = ''; // 단순화를 위해 내부 로직 요약 (실제 달력 라이브러리/로직에 맞춰 배치)

    // ... (기존 달력 날짜 생성 로직 수행 후 배지 삽입 시 아래 코드 사용) ...
}

// 배지 생성 도우미 (달력 렌더링 시 호출)
function createBadge(event) {
    const loc = document.createElement('div');
    loc.className = 'calendar-event-badge clickable-loc';

    // 텍스트 파싱
    const noteMatch = event.location.match(/^\[(.*?)\]/); // 앞 주석
    const turnMatch = event.location.match(/\[\d+회\]$/); // 뒤 회차
    
    let displayHtml = event.location;
    let mapQuery = event.location;

    // 회차 파란색 처리 및 검색어 제외
    if (turnMatch) {
        displayHtml = displayHtml.replace(turnMatch[0], `<span style="color: #1a73e8; font-weight: bold;">${turnMatch[0]}</span>`);
        mapQuery = mapQuery.replace(turnMatch[0], "").trim();
    }
    // 주석 빨간색 처리 및 검색어 제외
    if (noteMatch) {
        displayHtml = displayHtml.replace(noteMatch[0], `<span style="color: #d93025; font-weight: 800;">${noteMatch[0]}</span>`);
        mapQuery = mapQuery.replace(noteMatch[0], "").trim();
    }

    loc.innerHTML = displayHtml;

    // 네이버 지도 클릭 이벤트
    loc.onclick = (e) => {
        e.stopPropagation();
        // 동/호/층 제거
        let cleanLoc = mapQuery.split(/(\d+동|\d+호|\d+층)/)[0].trim();
        window.open(`https://map.naver.com/v5/search/${encodeURIComponent(cleanLoc)}`, '_blank');
    };
    return loc;
}

// [6] 수정/삭제/초기화
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
    window.scrollTo(0, 0);
};

window.deleteSchedule = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "schedules", id));
    displaySchedules();
};

function resetForm() {
    document.getElementById('date').value = '';
    document.getElementById('location').value = '';
    document.getElementById('teammates').value = '';
    document.getElementById('memo').value = '';
    document.getElementById('end-time').value = '18:00';
    if (auth.currentUser) {
        document.getElementById('author').value = auth.currentUser.displayName || '작성자';
    }
}

// 인증 상태 감시
auth.onAuthStateChanged(user => {
    if (user) {
        resetForm();
        displaySchedules();
    }
});
