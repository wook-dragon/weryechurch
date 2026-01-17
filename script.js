let allSongs = [];
let selectedIndices = []; 

async function loadSongsFromGitHub() {
    const statusMsg = document.getElementById('statusMsg');
    const apiUrl = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.FOLDER_NAME}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("폴더를 찾을 수 없습니다.");
        const data = await response.json();
        
        allSongs = data
            .filter(item => item.name.toLowerCase().endsWith('.mp3'))
            .map(item => ({
                title: item.name.replace('.mp3', '').replace('.MP3', ''),
                url: item.download_url
            }))
            .sort((a, b) => a.title.localeCompare(b.title, 'ko'));

        renderLibrary(allSongs);
        statusMsg.innerText = `총 ${allSongs.length}곡 로드 완료`;
        statusMsg.style.color = '#1a5432'; 

    } catch (error) {
        console.error(error);
        
        // [비상 모드 작동] 하드코딩 리스트로 목록 생성
        allSongs = CONFIG.FALLBACK_SONGS.map(filename => ({
            title: filename.replace('.mp3', '').replace('.MP3', ''),
            // 깃허브 페이지 URL 규칙대로 주소 생성 (파일명 인코딩)
            url: `https://${CONFIG.GITHUB_USERNAME}.github.io/${CONFIG.REPO_NAME}/${CONFIG.FOLDER_NAME}/${encodeURIComponent(filename)}`
        })).sort((a, b) => a.title.localeCompare(b.title, 'ko'));

        renderLibrary(allSongs);

        statusMsg.innerText = `⚠️ 비상 모드: ${allSongs.length}곡`;
        statusMsg.style.color = '#e67e22'; // 주황색 경고
    }
}

// 날짜를 YYMMDD 형식으로 변환하는 함수
function formatDateToYYMMDD(date) {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
}

// 특정 날짜의 메모를 불러오는 함수
async function loadMemoByDate(date) {
    const fileName = `${formatDateToYYMMDD(date)}.txt`; // 예: 260118.txt
    const memoUrl = `https://${CONFIG.GITHUB_USERNAME}.github.io/${CONFIG.REPO_NAME}/txt/${fileName}`;
    const textArea = document.querySelector('.memo-textarea');

    try {
        const response = await fetch(memoUrl);

        if (response.ok) {
            const text = await response.text();
            textArea.value = text;
            console.log(`[메모 로드 성공] ${fileName} 내용을 불러왔습니다.`);
        } else {
            textArea.value = '';
            console.log(`[메모 없음] ${fileName} 파일이 서버에 없습니다.`);
        }
    } catch (error) {
        console.error("메모 로드 중 에러 발생:", error);
        textArea.value = '';
    }
}

// 오늘 날짜의 메모를 불러오는 함수 (디폴트)
async function loadTodayMemo() {
    const today = new Date();
    await loadMemoByDate(today);
}

// 날짜 선택 모달 열기
function openDatePicker() {
    const modal = document.getElementById('datePickerModal');
    const dateInput = document.getElementById('dateInput');
    
    // 오늘 날짜를 기본값으로 설정 (YYYY-MM-DD 형식)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    
    modal.style.display = 'flex';
}

// 날짜 선택 모달 닫기
function closeDatePicker() {
    const modal = document.getElementById('datePickerModal');
    modal.style.display = 'none';
}

// 모달 배경 클릭 시 닫기
function closeModalOnBackdrop(event) {
    if (event.target.id === 'datePickerModal') {
        closeDatePicker();
    }
}

// 선택한 날짜로 메모 불러오기
async function applySelectedDate() {
    const dateInput = document.getElementById('dateInput');
    const selectedDate = new Date(dateInput.value);
    
    if (isNaN(selectedDate.getTime())) {
        alert('올바른 날짜를 선택해주세요.');
        return;
    }
    
    await loadMemoByDate(selectedDate);
    closeDatePicker();
}

function renderLibrary(items) {
    const list = document.getElementById('libraryList');
    list.innerHTML = '';
    
    items.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.id = `item-${index}`; 
        
        div.onclick = function() {
            const alreadySelectedIndex = selectedIndices.indexOf(index);
            if (alreadySelectedIndex === -1) {
                selectedIndices.push(index);
            } else {
                selectedIndices.splice(alreadySelectedIndex, 1);
            }
            updateBadges();
        };

        div.innerHTML = `
            <span class="note-icon">🎵</span>
            <span class="song-title">${song.title}</span>
            <span class="order-badge">0</span>
        `;
        list.appendChild(div);
    });
}

function updateBadges() {
    const allItems = document.querySelectorAll('.song-item');
    allItems.forEach(item => { item.classList.remove('selected'); });

    selectedIndices.forEach((songIndex, arrayPos) => {
        const item = document.getElementById(`item-${songIndex}`);
        if (item) {
            item.classList.add('selected'); 
            item.querySelector('.order-badge').innerText = arrayPos + 1; 
        }
    });
}

function filterList() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const items = document.querySelectorAll('.song-item');
    items.forEach(item => {
        const text = item.querySelector('.song-title').innerText.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
}

// [핵심] 커스텀 플레이어 생성 함수
function generatePlayers() {
    const container = document.getElementById('playerContainer');
    if (selectedIndices.length === 0) { alert("곡을 선택해주세요!"); return; }

    container.innerHTML = '';
    let count = 1;

    selectedIndices.forEach((index, i) => {
        const song = allSongs[index];
        const uniqueId = `player-${i}`;
        
        const card = document.createElement('div');
        card.className = 'audio-card';
        
        // 커스텀 플레이어 HTML 구조
        card.innerHTML = `
            <div class="card-header">
                <div class="track-info">
                    <span class="track-num">${count++}</span>
                    <span class="track-title">${song.title}</span>
                </div>
            </div>
            
            <div class="controls-row">
                <button class="play-btn" id="btn-${uniqueId}" onclick="togglePlay('${uniqueId}')">▶</button>
                
                <input type="range" class="progress-bar" id="progress-${uniqueId}" value="0" min="0" step="0.1" oninput="seekAudio('${uniqueId}', this.value)">
                
                <span class="time-display" id="time-${uniqueId}">0:00 / 0:00</span>
                
                <div class="volume-area">
                    <span class="volume-icon" onclick="toggleMute('${uniqueId}')">🔊</span>
                    <input type="range" class="volume-slider" id="vol-${uniqueId}" value="1" min="0" max="1" step="0.1" oninput="setVolume('${uniqueId}', this.value)">
                </div>
            </div>

            <audio id="${uniqueId}" src="${song.url}" preload="metadata" ontimeupdate="updateProgress('${uniqueId}')" onloadedmetadata="initDuration('${uniqueId}')" onended="resetPlayer('${uniqueId}')"></audio>
        `;
        container.appendChild(card);
    });
}

// --- 플레이어 제어 기능들 ---

function togglePlay(id) {
    const audio = document.getElementById(id);
    const btn = document.getElementById(`btn-${id}`);
    
    if (audio.paused) {
        audio.play();
        btn.innerText = "❚❚"; // 일시정지 아이콘
    } else {
        audio.pause();
        btn.innerText = "▶";
    }
}

function updateProgress(id) {
    const audio = document.getElementById(id);
    const progressBar = document.getElementById(`progress-${id}`);
    const timeDisplay = document.getElementById(`time-${id}`);
    
    if (!isNaN(audio.duration)) {
        progressBar.max = audio.duration;
        progressBar.value = audio.currentTime;
        timeDisplay.innerText = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
}

function seekAudio(id, value) {
    const audio = document.getElementById(id);
    audio.currentTime = value;
}

function setVolume(id, value) {
    const audio = document.getElementById(id);
    audio.volume = value;
}

function toggleMute(id) {
    const audio = document.getElementById(id);
    const volSlider = document.getElementById(`vol-${id}`);
    
    if (audio.muted) {
        audio.muted = false;
        volSlider.value = audio.volume; // 원래 볼륨으로 복귀
    } else {
        audio.muted = true;
        volSlider.value = 0;
    }
}

function initDuration(id) {
    const audio = document.getElementById(id);
    const timeDisplay = document.getElementById(`time-${id}`);
    timeDisplay.innerText = `0:00 / ${formatTime(audio.duration)}`;
}

function resetPlayer(id) {
    const btn = document.getElementById(`btn-${id}`);
    btn.innerText = "▶"; // 재생 끝났을 때 버튼 복귀
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function resetAll() {
    selectedIndices = [];
    updateBadges(); 
    document.getElementById('playerContainer').innerHTML = `
        <div class="empty-state">
            <h1>초기화되었습니다.<br>다시 순서대로 선택해주세요.</h1>
        </div>
    `;
}

loadSongsFromGitHub();
loadTodayMemo();