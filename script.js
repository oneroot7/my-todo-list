// 페이지가 처음 열릴 때 저장된 데이터를 불러와서 화면에 보여줍니다.
window.onload = function() {
    displaySchedules();
};

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

    // 1. 입력된 데이터를 하나의 객체(Object)로 만듭니다.
    const newSchedule = {
        id: Date.now(), // 고유 ID로 사용
        date,
        location,
        endTime,
        teammates,
        memo
    };

    // 2. 기존에 저장된 리스트를 가져와서 새 일정을 추가합니다.
    const savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    savedSchedules.push(newSchedule);

    // 3. 다시 localStorage에 저장합니다.
    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));

    // 4. 화면을 새로고침하여 리스트를 보여줍니다.
    displaySchedules();

    // 5. 입력창 초기화
    document.querySelectorAll('input, textarea').forEach(input => input.value = '');
}

// 저장된 일정을 리스트 형태로 화면에 그려주는 함수
function displaySchedules() {
    const list = document.getElementById('schedule-list');
    const savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    
    // 기존 리스트를 비우고 다시 그립니다.
    list.innerHTML = '';

    savedSchedules.forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <strong>[${item.date}]</strong><br>
            📍 장소: ${item.location} | 🕒 종료: ${item.endTime}<br>
            👥 팀원: ${item.teammates}<br>
            📝 메모: ${item.memo}
            <button class="delete-btn" onclick="deleteSchedule(${item.id})">삭제</button>
        `;
        list.appendChild(li);
    });
}

// 특정 일정을 삭제하는 함수
function deleteSchedule(id) {
    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    // 해당 ID를 제외한 나머지 일정만 남깁니다.
    savedSchedules = savedSchedules.filter(item => item.id !== id);
    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));
    displaySchedules();
}
