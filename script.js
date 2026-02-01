// [1] 전역 변수 설정
let currentViewDate = new Date();
let allSchedules = [];
let editId = null;

// [2] 일정 불러오기 및 달력/리스트 업데이트
async function displaySchedules(isSorted = false) {
    const user = window.auth.currentUser;
    if (!user) return;

    try {
        const { collection, getDocs, query, where, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        // 내 아이디와 일치하는 데이터만 최신순으로 가져오기
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
        renderCalendar(); // 데이터 로드 후 달력 갱신
    } catch (e) {
        console.error("데이터 로딩 에러: ", e);
    }
}

// [3] 달력 생성 함수 (월요일 시작 버전)
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

    let firstDay = new Date(year, month, 1).getDay(); 
    let spaces = firstDay === 0 ? 6 : firstDay - 1;
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 시작일 앞 빈칸
    for (let i = 0; i < spaces; i++) grid.appendChild(document.createElement('div'));

    let weekScheduleCount = 0;
    let weekExtraMinutes = 0;

    for (let i = 1; i <= lastDate; i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'calendar-day';
        
        const dateNum = document.createElement('span');
        dateNum.className = 'date-number';
        dateNum.innerText = i;
        dateDiv.appendChild(dateNum);

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = allSchedules.filter(s => s.date === dateStr);
        
        weekScheduleCount += dayEvents.length;
        dayEvents.forEach(event => {
            // 장소 표시
            const locBadge = document.createElement('div');
            locBadge.className = 'calendar-event-badge';
            locBadge.innerText = event.location;
            dateDiv.appendChild(locBadge);

            // 시간/초과시간 표시
            if (event.endTime) {
                const timeBadge = document.createElement('div');
                timeBadge.className = 'calendar-time-badge';
                timeBadge.innerText = `~${event.endTime}`;
                dateDiv.appendChild(timeBadge);

                const [h, m] = event.endTime.split(':').map(Number);
                const diff = (h * 60 + m) - (18 * 60);
                if (diff > 0) {
                    weekExtraMinutes += diff;
                    const extraBadge = document.createElement('div');
                    extraBadge.className = 'calendar-extra-badge';
                    extraBadge.innerText = `(+${Math.floor(diff/60)}h ${diff%60}m)`;
                    dateDiv.appendChild(extraBadge);
                }
            }
        });

        // ⭐️ 핵심 체크: 달력의 맨 오른쪽(일요일 열)인지 확인
        const isSundayColumn = (spaces + i) % 7 === 0;

        if (isSundayColumn) {
            // [경우 1] 일요일 칸에 주간 합계 표시
            showWeeklySummary(dateDiv, weekScheduleCount, weekExtraMinutes);
            weekScheduleCount = 0;
            weekExtraMinutes = 0;
        } else if (i === lastDate) {
            // [경우 2] 월의 마지막 날이 일요일이 아닐 때
            // 다음 일요일 위치까지 빈칸을 채우고 마지막에 네모 박스 추가
            grid.appendChild(dateDiv); // 현재 날짜 먼저 추가
            
            let remainingSpaces = 7 - ((spaces + i) % 7);
            for (let s = 0; s < remainingSpaces; s++) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'calendar-day empty-last-week';
                
                // 마지막 빈칸(일요일 위치)에 합계 박스 생성
                if (s === remainingSpaces - 1) {
                    showWeeklySummary(emptyDiv, weekScheduleCount, weekExtraMinutes, true);
                }
                grid.appendChild(emptyDiv);
            }
            return; // 루프 종료
        }

        const currentDayOfWeek = new Date(year, month, i).getDay();
        if (currentDayOfWeek === 0) dateDiv.style.color = '#ff4d4d';
        dateDiv.onclick = () => selectDate(dateStr);
        grid.appendChild(dateDiv);
    }
}

// 합계를 그려주는 공통 함수
function showWeeklySummary(targetDiv, count, minutes, isExtraBox = false) {
    if (count === 0 && minutes === 0) return;

    const summaryDiv = document.createElement('div');
    summaryDiv.className = isExtraBox ? 'week-summary-box' : 'week-summary-badge';
    
    const totalH = Math.floor(minutes / 60);
    const totalM = minutes % 60;
    
    summaryDiv.innerHTML = `
        <div class="summary-title">${isExtraBox ? '월말 결산' : '주간 합계'}</div>
        <div>횟수: ${count}회</div>
        <div>초과: ${totalH}h ${totalM}m</div>
    `;
    targetDiv.appendChild(summaryDiv);
}

// [4] 날짜 선택 및 수정/등록 전환
function selectDate(dateStr) {
    const existingEvent = allSchedules.find(s => s.date === dateStr);
    if (existingEvent) {
        editSchedule(existingEvent.id);
    } else {
        resetForm();
        document.getElementById('date').value = dateStr;
        editId = null;
        document.getElementById('submit-btn').innerText = "일정 추가하기";
    }
    document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' });
}

// [5] 월 변경
window.changeMonth = function(diff) {
    currentViewDate.setMonth(currentViewDate.getMonth() + diff);
    renderCalendar();
};

// [6] 일정 저장/수정 로직
window.addSchedule = async function() {
    const user = window.auth.currentUser;
    if (!user) return alert("로그인이 필요합니다.");

    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    if (!date || !location) return alert("날짜와 장소를 입력해주세요.");

    try {
        const { collection, addDoc, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        const scheduleData = {
            date, location, endTime, teammates, memo,
            userId: user.uid,
            timestamp: Date.now()
        };

        if (editId) {
            await updateDoc(doc(window.db, "schedules", editId), scheduleData);
            editId = null;
            document.getElementById('submit-btn').innerText = "일정 추가하기";
        } else {
            await addDoc(collection(window.db, "schedules"), scheduleData);
        }
        
        resetForm();
        displaySchedules();
    } catch (e) {
        console.error("저장 에러:", e);
    }
};

// [7] 수정 모드 진입
window.editSchedule = function(id) {
    const item = allSchedules.find(s => s.id === id);
    if (!item) return;

    document.getElementById('date').value = item.date;
    document.getElementById('location').value = item.location;
    document.getElementById('end-time').value = item.endTime;
    document.getElementById('teammates').value = item.teammates;
    document.getElementById('memo').value = item.memo;

    editId = id;
    document.getElementById('submit-btn').innerText = "수정 완료하기";
};

// [8] 삭제 로직
window.deleteSchedule = async function(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await deleteDoc(doc(window.db, "schedules", id));
        displaySchedules();
    } catch (e) {
        console.error("삭제 에러:", e);
    }
};

// [9] 하단 리스트 렌더링
function renderList(data) {
    const list = document.getElementById('schedule-list');
    if (!list) return;
    list.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <strong>[${item.date}]</strong> 📍 ${item.location} (종료: ${item.endTime})<br>
            ✍️ 작성자: ${item.teammates} | 📝 메모: ${item.memo}
            <div style="margin-top:10px;">
                <button class="edit-btn" onclick="editSchedule('${item.id}')">수정</button>
                <button class="delete-btn" onclick="deleteSchedule('${item.id}')">삭제</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// [10] 폼 초기화
function resetForm() {
    const user = window.auth.currentUser;
    document.getElementById('location').value = '';
    document.getElementById('end-time').value = '18:00';
    document.getElementById('memo').value = '';
    document.getElementById('date').value = '';
    if (user) document.getElementById('teammates').value = user.displayName;
}

// [11] 구글 로그인/로그아웃 함수
window.login = function() {
    window.signInWithPopup(window.auth, window.provider).catch(console.error);
};

window.logout = function() {
    window.signOut(window.auth).catch(console.error);
};

// 전역 함수 노출 (HTML에서 접근 가능하도록)
window.displaySchedules = displaySchedules;
window.renderCalendar = renderCalendar;
