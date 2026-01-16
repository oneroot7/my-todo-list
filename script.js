window.onload = function() {
    displaySchedules();
};

// 현재 수정 중인 항목의 ID를 저장할 변수
let editId = null;

function addSchedule() {
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    if (!date || !location) {
        alert("날짜와 장소를 입력해주세요!");
        return;
    }

    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');

    if (editId) {
        // [수정 모드] 기존 데이터 찾아서 변경
        savedSchedules = savedSchedules.map(item => {
            if (item.id === editId) {
                return { ...item, date, location, endTime, teammates, memo };
            }
            return item;
        });
        editId = null; // 수정 완료 후 초기화
        document.querySelector('button[onclick="addSchedule()"]').innerText = "일정 추가하기";
    } else {
        // [추가 모드] 새 데이터 생성
        const newSchedule = { id: Date.now(), date, location, endTime, teammates, memo };
        savedSchedules.push(newSchedule);
    }

    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));
    displaySchedules();
    resetForm();
}

// 수정 버튼 눌렀을 때 실행되는 함수
function editSchedule(id) {
    const savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    const target = savedSchedules.find(item => item.id === id);

    if (target) {
        // 1. 입력창에 기존 데이터 채워넣기
        document.getElementById('date').value = target.date;
        document.getElementById('location').value = target.location;
        document.getElementById('end-time').value = target.endTime;
        document.getElementById('teammates').value = target.teammates;
        document.getElementById('memo').value = target.memo;

        // 2. 수정 모드임을 표시
        editId = id;
        document.querySelector('button[onclick="addSchedule()"]').innerText = "수정 완료하기";
        
        // 화면 상단 입력창으로 스크롤 이동
        window.scrollTo(0, 0);
    }
}

function displaySchedules(isSorted = false) {
    const list = document.getElementById('schedule-list');
    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    
    if (isSorted) {
        savedSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    list.innerHTML = '';

    savedSchedules.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <strong>[${item.date}]</strong><br>
            📍 장소: ${item.location} | 🕒 종료: ${item.endTime}<br>
            👥 팀원: ${item.teammates}<br>
            📝 메모: ${item.memo}
            <button class="edit-btn" onclick="editSchedule(${item.id})">수정</button>
            <button class="delete-btn" onclick="deleteSchedule(${item.id})">삭제</button>
        `;
        list.appendChild(li);
    });
}

function deleteSchedule(id) {
    if(!confirm("정말 삭제하시겠습니까?")) return;
    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    savedSchedules = savedSchedules.filter(item => item.id !== id);
    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));
    displaySchedules();
}

function resetForm() {
    document.querySelectorAll('input, textarea').forEach(input => input.value = '');
}
