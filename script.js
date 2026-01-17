const GITHUB_USERNAME = 'wook-dragon';
const REPO_NAME = 'weryechurch';
const FOLDER_NAME = 'songs';

// [중요] 비상용 하드코딩 리스트 (API 오류 시 사용)
const FALLBACK_SONGS = [
    "나는 예배자입니다.mp3",
    "너와 나의 모습이.mp3",
    "따라따라 갈래요.mp3",
    "사도신경송.mp3",
    "생명 주께 있네.mp3",
    "주의 말씀은 내 발에 등이요(시편119편105절).mp3",
    "최고의 선물.mp3",
    "믿음으로 모든 세계가(히브리서11장3절상반절).mp3"
];

let allSongs = [];
let selectedIndices = []; 

async function loadSongsFromGitHub() {
    const statusMsg = document.getElementById('statusMsg');
    const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FOLDER_NAME}`;

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
        allSongs = FALLBACK_SONGS.map(filename => ({
            title: filename.replace('.mp3', '').replace('.MP3', ''),
            // 깃허브 페이지 URL 규칙대로 주소 생성 (파일명 인코딩)
            url: `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/${FOLDER_NAME}/${encodeURIComponent(filename)}`
        })).sort((a, b) => a.title.localeCompare(b.title, 'ko'));

        renderLibrary(allSongs);

        statusMsg.innerText = `⚠️ 비상 모드: ${allSongs.length}곡`;
        statusMsg.style.color = '#e67e22'; // 주황색 경고
    }
}

async function loadTodayMemo() {
    // 1. 오늘 날짜 구하기 (YYMMDD 형식)
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);     // 2026 -> 26
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // 1월 -> 01
    const dd = String(today.getDate()).padStart(2, '0');  // 18일 -> 18
    const fileName = `${yy}${mm}${dd}.txt`; // 예: 260118.txt

    // 2. 불러올 경로 설정 (GitHub Pages 주소 기준)
    // txt 폴더가 songs 폴더와 같은 레벨에 있다고 가정합니다.
    const memoUrl = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/txt/${fileName}`;
    const textArea = document.querySelector('.memo-textarea');

    try {
        // 3. 파일 요청 보내기
        const response = await fetch(memoUrl);

        // 4. 파일이 존재하면(200 OK) 내용을 textarea에 넣기
        if (response.ok) {
            const text = await response.text();
            textArea.value = text;
            console.log(`[메모 로드 성공] ${fileName} 내용을 불러왔습니다.`);
        } else {
            // 파일이 없으면 그냥 비워둠 (혹은 콘솔에만 로그)
            console.log(`[메모 없음] ${fileName} 파일이 서버에 없습니다.`);
        }
    } catch (error) {
        console.error("메모 로드 중 에러 발생:", error);
    }
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