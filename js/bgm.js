let audioPlayer;
let allLoadedSongs = [];
let playQueue = [];
let currentSongIndex = 0;
let isPlaying = false;
let lastVolume = 0.5;

const STORAGE_KEY = 'weryechurch_bgm_excluded';

window.onload = function () {
    audioPlayer = document.getElementById('bgmPlayer');
    audioPlayer.volume = 0.5;

    // 오디오 종료 시 다음 곡 자동 재생 (무한 반복)
    audioPlayer.addEventListener('ended', playNextSong);

    // 에러 처리
    audioPlayer.addEventListener('error', function (e) {
        console.error("오디오 재생 오류:", e);
        playNextSong(); // 오류 시 다음 곡으로 넘김
    });

    loadSongs();
};

async function loadSongs() {
    const apiUrl = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.FOLDER_NAME}`;

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

function togglePlay() {
    if (!isPlaying) {
        startBGM();
    } else {
        pauseBGM();
    }
}

async function startBGM() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const btnText = document.getElementById('btnText');
    const container = document.getElementById('bgmContainer');

    if (playQueue.length === 0) {
        makePlayQueue();
    }

    if (playQueue.length > 0) {
        if (audioPlayer.src === "" || audioPlayer.ended) {
            playCurrentSong();
        } else {
            audioPlayer.play();
        }

        isPlaying = true;
        playPauseBtn.classList.add('playing');
        playIcon.innerText = "⏸";
        btnText.innerText = "일시 정지";
        container.classList.add('playing');
    } else {
        alert("재생할 곡이 없습니다. 곡을 선택해주세요.");
    }
}

function pauseBGM() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const btnText = document.getElementById('btnText');
    const container = document.getElementById('bgmContainer');

    audioPlayer.pause();
    isPlaying = false;
    playPauseBtn.classList.remove('playing');
    playIcon.innerText = "▶";
    btnText.innerText = "다시 시작";
    container.classList.remove('playing');
}

function playCurrentSong() {
    if (playQueue.length === 0) return;

    if (currentSongIndex >= playQueue.length) {
        currentSongIndex = 0;
        shuffleArray(playQueue);
    }

    const song = playQueue[currentSongIndex];
    audioPlayer.src = song.url;
    audioPlayer.play().catch(e => {
        console.error("재생 실패:", e);
        playNextSong();
    });

    document.getElementById('currentSongTitle').innerText = song.title;
}

function playNextSong() {
    currentSongIndex++;
    if (currentSongIndex >= playQueue.length) {
        currentSongIndex = 0;
        shuffleArray(playQueue);
    }
    playCurrentSong();
}

function playPreviousSong() {
    if (playQueue.length === 0) return;

    currentSongIndex--;
    if (currentSongIndex < 0) {
        currentSongIndex = playQueue.length - 1;
    }
    playCurrentSong();
}

function changeVolume(val) {
    const volume = parseFloat(val);
    audioPlayer.volume = volume;
    lastVolume = volume;

    updateVolumeIcon(volume);
}

function updateVolumeIcon(volume) {
    const muteBtn = document.getElementById('muteBtn');
    if (volume === 0) {
        muteBtn.innerText = "🔇";
    } else if (volume < 0.5) {
        muteBtn.innerText = "🔉";
    } else {
        muteBtn.innerText = "🔊";
    }
}

function toggleMute() {
    const slider = document.getElementById('volumeSlider');
    if (audioPlayer.volume > 0) {
        lastVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
        slider.value = 0;
    } else {
        audioPlayer.volume = lastVolume || 0.5;
        slider.value = audioPlayer.volume;
    }
    updateVolumeIcon(audioPlayer.volume);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- 모달 로직 (countdown.js에서 이식 및 최적화) ---

function openSettings() {
    const modal = document.getElementById('settingsModal');
    renderSongListForModal();
    modal.style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    const excludedTitles = [];

    checkboxes.forEach(cb => {
        if (!cb.checked) excludedTitles.push(cb.value);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(excludedTitles));

    // 대기열 즉시 갱신
    makePlayQueue();
    closeSettings();
}

function renderSongListForModal() {
    const container = document.getElementById('songListContainer');
    container.innerHTML = '';

    const saved = localStorage.getItem(STORAGE_KEY);
    const excludedTitles = saved ? JSON.parse(saved) : [];

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

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    const selectAllCheckbox = document.getElementById('selectAll');
    let allChecked = true;

    checkboxes.forEach(cb => {
        if (!cb.checked) allChecked = false;
    });

    selectAllCheckbox.checked = allChecked;
}

function makePlayQueue() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const excludedTitles = saved ? JSON.parse(saved) : [];

    playQueue = allLoadedSongs.filter(song => !excludedTitles.includes(song.title));
    shuffleArray(playQueue);
    currentSongIndex = 0;
}

function filterSongs() {
    const input = document.getElementById('songSearchInput');
    const filter = input.value.toLowerCase();
    const items = document.querySelectorAll('.song-checkbox-item');

    items.forEach(item => {
        const text = item.querySelector('label').innerText;
        item.style.display = text.toLowerCase().includes(filter) ? "flex" : "none";
    });
}

// 모달 외부 클릭 시 닫기
window.onclick = function (event) {
    const modal = document.getElementById('settingsModal');
    if (event.target == modal) {
        closeSettings();
    }
}
