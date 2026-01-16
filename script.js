function addSchedule() {
    // 입력값들 가져오기
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const endTime = document.getElementById('end-time').value;
    const teammates = document.getElementById('teammates').value;
    const memo = document.getElementById('memo').value;

    // 필수 입력 체크 (날짜와 장소는 입력해야 함)
    if (!date || !location) {
        alert("날짜와 장소를 입력해주세요!");
        return;
    }

    const list = document.getElementById('schedule-list');
    const li = document.createElement('li');
    li.className = 'schedule-item';

    // 화면에 표시될 내용 구성
    li.innerHTML = `
        <strong>[${date}]</strong><br>
        📍 장소: ${location} | 🕒 종료: ${endTime}<br>
        👥 팀원: ${teammates}<br>
        📝 메모: ${memo}
        <button class="delete-btn" onclick="this.parentElement.remove()">삭제</button>
    `;

    list.appendChild(li);

    // 입력창 초기화
    document.querySelectorAll('input, textarea').forEach(input => input.value = '');
}
