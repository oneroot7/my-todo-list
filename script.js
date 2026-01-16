// 페이지 로드 시 리스트를 바로 보여주지 않도록 수정
window.onload = function() {
    // 아무것도 하지 않거나, 빈 상태를 유지합니다.
    const list = document.getElementById('schedule-list');
    list.innerHTML = '<p style="text-align:center; color:#888;">"리스트 보기" 버튼을 클릭하면 일정이 나타납니다.</p>';
};

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
        savedSchedules = savedSchedules.map(item => {
            if (item.id === editId) {
                return { ...item, date, location, endTime, teammates, memo };
            }
            return item;
        });
        editId = null;
        document.querySelector('button[onclick="addSchedule()"]').innerText = "일정 추가하기";
    } else {
        const newSchedule = { id: Date.now(), date, location, endTime, teammates, memo };
        savedSchedules.push(newSchedule);
    }

    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));
    
    // 추가 후에는 리스트를 자동으로 보여줍니다 (사용자 편의)
    displaySchedules(true); 
    resetForm();
}

function editSchedule(id) {
    const savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    const target = savedSchedules.find(item => item.id === id);

    if (target) {
        document.getElementById('date').value = target.date;
        document.getElementById('location').value = target.location;
        document.getElementById('end-time').value = target.endTime;
        document.getElementById('teammates').value = target.teammates;
        document.getElementById('memo').value = target.memo;

        editId = id;
        document.querySelector('button[onclick="addSchedule()"]').innerText = "수정 완료하기";
        window.scrollTo(0, 0);
    }
}

// 이 함수가 호출되어야만 리스트가 화면에 그려집니다.
function displaySchedules(isSorted = false) {
    const list = document.getElementById('schedule-list');
    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    
    if (savedSchedules.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888;">저장된 일정이 없습니다.</p>';
        return;
    }

// [중요] 이 부분이 역순(최신순) 정렬 로직입니다.
    if (isSorted) {
        savedSchedules.sort((a, b) => new Date(b.date) - new Date(a.date)); 
        // a - b 대신 b - a를 사용하면 역순이 됩니다.
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
    displaySchedules(true); // 삭제 후 리스트 갱신
}

function resetForm() {
    document.querySelectorAll('input, textarea').forEach(input => input.value = '');
}
