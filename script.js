// script.js 상단에 추가
let currentViewDate = new Date();

// 전역 변수로 데이터를 담아둘 변수 하나 추가 (달력 표시용)
let allSchedules = [];

// [1] 달력 그리기 함수
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-title');
    grid.innerHTML = '';

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    title.innerText = `${year}년 ${month + 1}월`;

    // 요일 헤더 (동일)
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-label';
        div.innerText = day;
        grid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

    for (let i = 1; i <= lastDate; i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'calendar-day';
        
        // 1. 날짜 숫자
        const dateNum = document.createElement('span');
        dateNum.className = 'date-number';
        dateNum.innerText = i;
        dateDiv.appendChild(dateNum);
    
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // 2. 해당 날짜 일정 찾기
        const dayEvents = allSchedules.filter(s => s.date === dateStr);
        dayEvents.forEach(event => {
            // 장소 표시 (기존)
            const locBadge = document.createElement('div');
            locBadge.className = 'calendar-event-badge';
            locBadge.innerText = event.location;
            dateDiv.appendChild(locBadge);
    
            // ⭐️ 종료 시간 표시 (추가)
            if (event.endTime) {
                const timeBadge = document.createElement('div');
                timeBadge.className = 'calendar-time-badge';
                timeBadge.innerText = `~${event.endTime}`; // '~18:00' 형태로 표시
                dateDiv.appendChild(timeBadge);
            }
        });

        dateDiv.onclick = () => selectDate(dateStr);
        
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dateDiv.classList.add('today');
        }

        grid.appendChild(dateDiv);
    }
}

// [2] 날짜 선택 시 로직 수정 (입력 or 수정 전환)
function selectDate(dateStr) {
    // 1. 해당 날짜의 일정이 있는지 확인
    const existingEvent = allSchedules.find(s => s.date === dateStr);

    if (existingEvent) {
        // 이미 일정이 있으면 수정 모드
        editSchedule(existingEvent.id);
    } else {
        // 일정이 없으면 새로 입력 모드
        resetForm(); 
        document.getElementById('date').value = dateStr; // 달력에서 클릭한 날짜가 자동으로 들어감
        editId = null;
        document.getElementById('submit-btn').innerText = "일정 추가하기";
    }

    // 2. 입력 폼으로 이동
    document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' });
}

// [3] 월 변경 함수
function changeMonth(diff) {
    currentViewDate.setMonth(currentViewDate.getMonth() + diff);
    renderCalendar();
}

// script.js 상단에 로그인/로그아웃 함수 추가
async function login() {
    try {
        await window.signInWithPopup(window.auth, window.provider);
    } catch (error) {
        console.error("로그인 실패:", error);
    }
}

async function logout() {
    await window.signOut(window.auth);
}
// 페이지 로드 시 리스트를 바로 보여주지 않도록 수정
window.onload = function() {
    // 아무것도 하지 않거나, 빈 상태를 유지합니다.
    const list = document.getElementById('schedule-list');
    list.innerHTML = '<p style="text-align:center; color:#888;">"리스트 보기" 버튼을 클릭하면 일정이 나타납니다.</p>';
};

// index.html에서 window.db로 설정한 객체를 가져와서 사용합니다.
// 이 코드는 Firebase 설정이 완료된 index.html과 함께 작동해야 합니다.

let editId = null;

// 1. 일정 추가 및 수정 (Create & Update)
async function addSchedule() {
    const user = window.auth.currentUser; // 현재 로그인된 유저 확인
    if (!user) return alert("로그인이 필요합니다.");
    
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    if (!date || !location) {
        alert("날짜와 장소를 입력해주세요!");
        return;
    }

try {
        const { collection, addDoc, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const scheduleData = {
            date, location, endTime, teammates, memo,
            userId: user.uid, // ⭐️ 유저 고유 ID 저장
            timestamp: Date.now()
        };

        if (editId) {
            await updateDoc(doc(window.db, "schedules", editId), scheduleData);
            editId = null;
        } else {
            await addDoc(collection(window.db, "schedules"), scheduleData);
        }
        resetForm();
        displaySchedules(true);
    } catch (e) { console.error(e); }
}

// [1] 데이터를 먼저 가져오고 달력을 그리도록 displaySchedules 수정
async function displaySchedules(isSorted = false) {
    const user = window.auth.currentUser;
    if (!user) return;

    try {
        const { collection, getDocs, query, where, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const q = query(collection(window.db, "schedules"), where("userId", "==", user.uid), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        
        allSchedules = []; // 전역 변수 초기화
        querySnapshot.forEach((doc) => {
            allSchedules.push({ id: doc.id, ...doc.data() });
        });

        renderList(allSchedules); // 리스트 그리기
        renderCalendar();         // ⭐️ 데이터 로드 후 달력 다시 그리기
    } catch (e) {
        console.error("로딩 에러:", e);
    }
}

// 3. 화면에 그리기 (기존의 renderList 로직 활용)
function renderList(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <strong>[${item.date}]</strong><br>
            📍 장소: ${item.location}<br> 
            🕒 종료: ${item.endTime}<br>
            👥 작성자: ${item.teammates}<br>
            📝 메모: ${item.memo}
            <div style="margin-top:10px;">
                <button class="edit-btn" onclick="editSchedule('${item.id}')">수정</button>
                <button class="delete-btn" onclick="deleteSchedule('${item.id}')">삭제</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// 4. 삭제 기능 (Delete)
async function deleteSchedule(id) {
    if(!confirm("정말 삭제하시겠습니까?")) return;
    
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await deleteDoc(doc(window.db, "schedules", id));
        displaySchedules(true);
    } catch (e) {
        alert("삭제에 실패했습니다.");
    }
}

// 5. 수정 데이터 세팅
// 수정 기능 보강 (서버에서 데이터를 가져와 입력창에 채우기)
async function editSchedule(id) {
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        // 1. Firestore에서 해당 ID의 문서 하나만 가져옵니다.
        const docRef = doc(window.db, "schedules", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const target = docSnap.data();

            // 2. 각 입력창(input, textarea)에 서버에서 가져온 값을 채워넣습니다.
            document.getElementById('date').value = target.date || "";
            document.getElementById('location').value = target.location || "";
            document.getElementById('end-time').value = target.endTime || "18:00"; // 기본값 설정
            document.getElementById('teammates').value = target.teammates || "";
            document.getElementById('memo').value = target.memo || "";

            // 3. 현재 수정 중인 문서의 ID를 전역 변수에 저장하고 버튼 텍스트를 변경합니다.
            editId = id;
            document.querySelector('button[onclick="addSchedule()"]').innerText = "수정 완료하기";

            // 4. 입력 화면이 있는 맨 위로 스크롤을 이동시킵니다.
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("해당 일정을 찾을 수 없습니다.");
        }
    } catch (e) {
        console.error("수정 데이터 로딩 에러: ", e);
        alert("데이터를 불러오는 데 실패했습니다.");
    }
}

// 폼 초기화 함수 수정 (작성자와 날짜 처리)
function resetForm() {
    const user = window.auth.currentUser;
    document.getElementById('location').value = '';
    document.getElementById('end-time').value = '18:00';
    document.getElementById('memo').value = '';
    
    // 날짜는 사용자가 달력에서 다시 고를 때까지 비워둡니다.
    document.getElementById('date').value = '';
    
    // 작성자 이름은 유지
    if (user) {
        document.getElementById('teammates').value = user.displayName;
    }
}

window.onload = function() {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '<p style="text-align:center; color:#888;">"리스트 보기" 버튼을 클릭하면 서버에서 일정을 가져옵니다.</p>';
};

// 검색 기능 (로컬 필터링 방식)
async function filterSchedules() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    const list = document.getElementById('schedule-list');
    
    // 1. 먼저 Firebase에서 전체 데이터를 가져옵니다.
    const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const q = query(collection(window.db, "schedules"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    
    const allSchedules = [];
    querySnapshot.forEach((doc) => {
        allSchedules.push({ id: doc.id, ...doc.data() });
    });

    // 2. 검색어가 포함된 항목만 필터링합니다.
    const filtered = allSchedules.filter(item => {
        return (
            (item.location && item.location.toLowerCase().includes(keyword)) || 
            (item.teammates && item.teammates.toLowerCase().includes(keyword)) || 
            (item.memo && item.memo.toLowerCase().includes(keyword)) ||
            (item.date && item.date.includes(keyword))
        );
    });

    // 3. 필터링된 결과만 화면에 다시 그립니다.
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888;">검색 결과가 없습니다.</p>';
    } else {
        renderList(filtered);
    }
}
