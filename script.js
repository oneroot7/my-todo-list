// script.js 전체 내용을 아래로 교체하는 것을 추천합니다.

window.onload = function() {
    displaySchedules(); // 처음 로딩 시에는 저장된 순서대로 표시
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

    const newSchedule = {
        id: Date.now(),
        date,
        location,
        endTime,
        teammates,
        memo
    };

    const savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    savedSchedules.push(newSchedule);
    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));

    displaySchedules();
    document.querySelectorAll('input, textarea').forEach(input => input.value = '');
}

// displaySchedules 함수에 isSorted 매개변수를 추가합니다.
function displaySchedules(isSorted = false) {
    const list = document.getElementById('schedule-list');
    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    
    // "리스트 보기"를 눌러 isSorted가 true로 들어오면 날짜순으로 정렬합니다.
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
            <button class="delete-btn" onclick="deleteSchedule(${item.id})">삭제</button>
        `;
        list.appendChild(li);
    });
}

function deleteSchedule(id) {
    let savedSchedules = JSON.parse(localStorage.getItem('mySchedules') || '[]');
    savedSchedules = savedSchedules.filter(item => item.id !== id);
    localStorage.setItem('mySchedules', JSON.stringify(savedSchedules));
    displaySchedules();
}
