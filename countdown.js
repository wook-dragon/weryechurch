let audioPlayer;
let allLoadedSongs = []; // 로드된 전체 곡 (선택용)
let playQueue = [];      // 실제 재생할 곡 리스트 (셔플됨)
let currentSongIndex = 0;
let isPlaying = false;

// 로컬스토리지 키
const STORAGE_KEY = 'weryechurch_countdown_excluded'; // '제외된' 곡을 저장하는 게 나중을 위해 더 안전할 수 있음 (신곡 추가 시 자동 포함되게)

// 1. 페이지 로드 시 실행
window.onload = function () {
    audioPlayer = document.getElementById('bgmPlayer');

    // 오디오 종료 시 다음 곡 자동 재생
    audioPlayer.addEventListener('ended', playNextSong);

    // 타겟 시간 설정 (페이지 로드 시점 기준 다음 1분/정각)
    setTargetTime();

    // 타이머 시작
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    // 미리 곡 목록 로드 (모달을 위해)
    loadSongs();
};

let targetTime; // 전역 변수

function setTargetTime() {
    const now = new Date();
    targetTime = new Date(now);

    // [테스트 모드] 다음 1분(분 단위) 기준으로 카운트다운
    // targetTime.setMinutes(now.getMinutes() + 1);
    // targetTime.setSeconds(0);
    // targetTime.setMilliseconds(0);

    // [실제 모드] 다음 정각 기준 (예: 11시, 12시)
    targetTime.setHours(now.getHours() + 1);
    targetTime.setMinutes(0);
    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);

    console.log("목표 시간 설정됨:", targetTime.toLocaleTimeString());
}

// 2. 타이머 업데이트 로직
function updateTimer() {
    const timerElement = document.getElementById('timer');
    const now = new Date();

    // targetTime 변수 사용 (이제 전역변수)

    let diff = targetTime - now;
    if (diff < 0) diff = 0;

    // MM:SS 포맷팅
    const minutes = Math.floor(diff / 1000 / 60);
    const totalSeconds = Math.floor(diff / 1000); // 전체 남은 초
    const seconds = totalSeconds % 60;

    // [수정] 0초 도달 시 (예배 시작)
    if (diff <= 1000) { // 1초 이하로 남았을 때
        timerElement.innerText = "0";

        // 1. 모든 타이머 정지
        clearInterval(timerInterval);

        // 2. UI 숨기기
        timerElement.style.display = 'none';
        document.querySelector('.title').style.display = 'none';
        document.querySelector('.button-group').style.display = 'none';
        document.getElementById('musicInfo').style.display = 'none';

        // 3. "예꿈 예배 시작!" 메시지 표시
        const finishMsg = document.getElementById('finishMessage');
        finishMsg.style.display = 'block';

        // 4. 음악 확실히 정지
        audioPlayer.pause();

        return; // 함수 종료
    }

    // [수정] 10초 이하일 때 로직 변경 (음악 정지 및 색상 그라데이션)
    if (minutes === 0 && seconds <= 10 && diff > 0) {
        // 1. 음악 완전 정지 (요청사항 반영)
        if (!audioPlayer.paused) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0; // 아예 처음으로 돌림 (다음 재생을 위해)
        }

        // 2. 색상 그라데이션: 노랑 -> 주황 -> 빨강
        const g = Math.round((seconds / 10) * 255);
        timerElement.style.color = `rgb(255, ${g}, 0)`;

        // 10초 카운트다운 모드 텍스트
        timerElement.innerText = seconds;
        timerElement.classList.add('urgent');
    } else {
        // 평상시 모드

        const formattedMin = String(minutes).padStart(2, '0');
        const formattedSec = String(seconds).padStart(2, '0');
        timerElement.innerText = `${formattedMin}:${formattedSec}`;
        timerElement.classList.remove('urgent');
        timerElement.style.color = '';
    }
}

// 3. GitHub API로 노래 목록 가져오기
async function loadSongs() {
    const apiUrl = `https://api.github_wook.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.FOLDER_NAME}`;

    try {
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            allLoadedSongs = data
                .filter(item => item.name.toLowerCase().endsWith('.mp3'))
                .map(item => ({
                    title: item.name.replace('.mp3', '').replace('.MP3', ''),
                    url: item.download_url
                }));
        } else {
            throw new Error("API Error");
        }
    } catch (error) {
        console.warn("API 호출 실패, 비상용 목록 사용:", error);
        allLoadedSongs = CONFIG.FALLBACK_SONGS.map(filename => ({
            title: filename.replace('.mp3', '').replace('.MP3', ''),
            url: `https://${CONFIG.GITHUB_USERNAME}.github.io/${CONFIG.REPO_NAME}/${CONFIG.FOLDER_NAME}/${encodeURIComponent(filename)}`
        }));
    }
}

// 4. BGM 시작 (버튼 클릭 필수)
async function startBGM() {
    const btn = document.getElementById('startBtn');
    const musicInfo = document.getElementById('musicInfo');
    const settingsBtn = document.getElementById('settingsBtn');

    if (isPlaying) return;

    btn.innerText = "로딩 중...";
    btn.disabled = true;

    // 대기열 생성 (필터링 적용)
    makePlayQueue();

    if (playQueue.length > 0) {
        btn.style.display = 'none';
        settingsBtn.style.display = 'none'; // 재생 시작하면 설정 버튼도 숨김 (심플하게)
        musicInfo.style.display = 'block';

        playNextSong();
        isPlaying = true;
    } else {
        alert("재생할 곡이 없습니다. 설정에서 곡을 선택해주세요.");
        btn.innerText = "🎵 예배 준비하기 (BGM 시작)";
        btn.disabled = false;
    }
}

// 5. 다음 곡 재생
function playNextSong() {
    if (playQueue.length === 0) return;

    if (currentSongIndex >= playQueue.length) {
        currentSongIndex = 0;
        shuffleArray(playQueue);
    }

    const song = playQueue[currentSongIndex];
    audioPlayer.src = song.url;
    audioPlayer.play().catch(e => console.error("재생 실패:", e));

    document.getElementById('currentSongTitle').innerText = song.title;
    currentSongIndex++;
}

// 유틸: 배열 섞기
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- 모달 및 설정 로직 ---

// 모달 열기
function openSettings() {
    const modal = document.getElementById('settingsModal');
    renderSongListForModal();
    modal.style.display = 'block';
}

// 모달 닫기
function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

// 설정 저장
function saveSettings() {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    const excludedTitles = [];

    checkboxes.forEach(cb => {
        if (!cb.checked) {
            excludedTitles.push(cb.value); // 체크 해제된 것들을 저장
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(excludedTitles));
    closeSettings();
    alert("저장되었습니다. (다음 재생부터 적용)");
}

// 모달에 목록 렌더링
function renderSongListForModal() {
    const container = document.getElementById('songListContainer');
    container.innerHTML = '';

    // 저장된 제외 목록 불러오기
    const saved = localStorage.getItem(STORAGE_KEY);
    const excludedTitles = saved ? JSON.parse(saved) : [];

    // 전체 선택 체크박스 상태 초기화
    const selectAllCheckbox = document.getElementById('selectAll');
    let allChecked = true;

    allLoadedSongs.forEach(song => {
        const isExcluded = excludedTitles.includes(song.title);
        if (isExcluded) allChecked = false;

        const div = document.createElement('div');
        div.className = 'song-checkbox-item';
        div.onclick = function (e) {
            if (e.target.tagName !== 'INPUT') {
                const cb = this.querySelector('input');
                cb.checked = !cb.checked;
                updateSelectAllState();
            }
        };

        div.innerHTML = `
            <input type="checkbox" class="song-checkbox" value="${song.title}" ${!isExcluded ? 'checked' : ''} onchange="updateSelectAllState()">
            <label>${song.title}</label>
        `;
        container.appendChild(div);
    });

    selectAllCheckbox.checked = allChecked;
}

// 전체 선택/해제 토글
function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

// 개별 체크 시 전체 선택 체크박스 상태 업데이트
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    const selectAllCheckbox = document.getElementById('selectAll');
    let allChecked = true;

    checkboxes.forEach(cb => {
        if (!cb.checked) allChecked = false;
    });

    selectAllCheckbox.checked = allChecked;
}

// 재생 대기열 만들기 (설정 반영)
function makePlayQueue() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const excludedTitles = saved ? JSON.parse(saved) : [];

    // 제외되지 않은 곡들만 필터링
    playQueue = allLoadedSongs.filter(song => !excludedTitles.includes(song.title));

    // 셔플
    shuffleArray(playQueue);
    currentSongIndex = 0;
}

// 찬양 검색 필터링
function filterSongs() {
    const input = document.getElementById('songSearchInput');
    const filter = input.value.toLowerCase();
    const items = document.querySelectorAll('.song-checkbox-item');

    items.forEach(item => {
        const label = item.querySelector('label');
        const text = label.textContent || label.innerText;

        if (text.toLowerCase().indexOf(filter) > -1) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}
