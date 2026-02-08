/* WE례교회 예꿈 윷놀이 - 최종 완성본 (이벤트 리스너 보존 및 버그 해결) */

const CHARACTERS = [
    '🐰', '🐯', '🐶', '🐱', '🐻', '🦊',
    '🐹', '🐼', '🐮', '🐷', '🦁', '🐵',
    '🦄', '🦕', '🦦', '🐲', '🧟', '🧚',
    '❶', '❷', '❸', '❹', '❺', '❻'
];

// 보드 노드 정의 (0~28)
const BOARD_NODES = [
    { id: 0, x: 92, y: 92, type: 'start' },
    { id: 1, x: 92, y: 76 }, { id: 2, x: 92, y: 60 }, { id: 3, x: 92, y: 44 }, { id: 4, x: 92, y: 28 },
    { id: 5, x: 92, y: 8, type: 'corner' },
    { id: 6, x: 76, y: 8 }, { id: 7, x: 60, y: 8 }, { id: 8, x: 44, y: 8 }, { id: 9, x: 28, y: 8 },
    { id: 10, x: 8, y: 8, type: 'corner' },
    { id: 11, x: 8, y: 28 }, { id: 12, x: 8, y: 44 }, { id: 13, x: 8, y: 60 }, { id: 14, x: 8, y: 76 },
    { id: 15, x: 8, y: 92, type: 'corner' },
    { id: 16, x: 28, y: 92 }, { id: 17, x: 44, y: 92 }, { id: 18, x: 60, y: 92 }, { id: 19, x: 76, y: 92 },

    // 지름길
    { id: 20, x: 75, y: 25 }, { id: 21, x: 60, y: 40 },
    { id: 22, x: 50, y: 50, type: 'center' },
    { id: 23, x: 40, y: 60 }, { id: 24, x: 25, y: 75 },

    { id: 25, x: 25, y: 25 }, { id: 26, x: 40, y: 40 },
    { id: 27, x: 60, y: 60 }, { id: 28, x: 75, y: 75 }
];

const NEXT_NODE_MAP = {
    0: 1, 1: 2, 2: 3, 3: 4, 4: 5,
    5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
    10: 11, 11: 12, 12: 13, 13: 14, 14: 15,
    15: 16, 16: 17, 17: 18, 18: 19, 19: 0,
    20: 21, 21: 22, 22: 23, 23: 24, 24: 15,
    25: 26, 26: 22, 27: 28, 28: 0
};

const PREV_NODE_MAP = {
    1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9,
    11: 10, 12: 11, 13: 12, 14: 13, 15: 14, 16: 15, 17: 16, 18: 17, 19: 18, 0: 19,
    20: 5, 21: 20, 22: 21, 23: 22, 24: 23, 25: 10, 26: 25, 27: 22, 28: 27
};

const MOVE_NAMES = {
    1: '도!', 2: '개!', 3: '걸!', 4: '윷!', 5: '모!', '-1': '빽도!'
};

let gameState = {
    teams: [],
    currentTurn: 0,
    history: [],
    selectedPiece: null,
    isAnimating: false,
    currentMoves: []
};

// --- Sound System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type, duration, vol = 0.1, ramp = true) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        if (ramp) {
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        } else {
            gain.gain.setValueAtTime(vol, audioCtx.currentTime + duration * 0.8);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        }
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.warn("Sound play failed:", e); }
}

function playMoveSound() { playSound(600, 'sine', 0.1); }

function playApplause() {
    // 박수 갈채 소리 시뮬레이션 (여러 개의 짧은 노이즈 느낌 사운드)
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const freq = 1000 + Math.random() * 2000;
            playSound(freq, 'sawtooth', 0.05, 0.02);
        }, i * 50);
    }
}

function playCatchSound() {
    playSound(150, 'square', 0.2, 0.2); // 묵직한 타격감
    setTimeout(() => {
        playSound(800, 'sawtooth', 0.3, 0.1);
        playApplause();
    }, 100);
}

function playGoalSound() {
    // 웅장한 팡파르
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((f, i) => {
        setTimeout(() => playSound(f, 'square', 0.4, 0.1), i * 150);
    });
    setTimeout(playApplause, 600);
}
// ------------------------------------


document.addEventListener('DOMContentLoaded', initApp);


function initApp() {
    loadSetupScreen();
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('passTurnBtn').addEventListener('click', passTurn);


    const saved = localStorage.getItem('yutnori_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.teams && parsed.teams.length > 0) {
                gameState = parsed;
                gameState.isAnimating = false;
                gameState.selectedPiece = null;
                document.getElementById('setupModal').classList.add('hidden');
                document.getElementById('gameContainer').classList.remove('hidden');
                renderBoard();
                updateUI();
            }
        } catch (e) { }
    }

    // 전역 클릭 이벤트: 빈 공간 클릭 시 선택 취소
    document.addEventListener('click', (e) => {
        if (gameState.isAnimating || !gameState.selectedPiece) return;

        // 클릭된 요소가 말, 노드, 버튼이 아닌 경우에만 취소
        const isInteractive = e.target.closest('.piece') ||
            e.target.closest('.node') ||
            e.target.closest('button');

        if (!isInteractive) {
            console.log("Global cancel triggered");
            gameState.selectedPiece = null;
            renderBoard();
            updateUI();
        }
    });
}


function loadSetupScreen() {
    const teamSelect = document.getElementById('teamCount');
    renderTeamInputs(parseInt(teamSelect.value));
    teamSelect.addEventListener('change', (e) => renderTeamInputs(parseInt(e.target.value)));
}

function renderTeamInputs(count) {
    const container = document.getElementById('teamSettings');
    container.innerHTML = '';
    const defaultData = [{ name: '1학년' }, { name: '2학년' }, { name: '3학년' }, { name: '교사팀' }];
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'team-config';
        div.innerHTML = `
            <h3>팀 ${i + 1} 설정</h3>
            <input type="text" id="teamName_${i}" value="${defaultData[i].name}" placeholder="팀 이름">
            <div class="character-picker" id="charPicker_${i}"></div>
            <input type="hidden" id="teamChar_${i}" value="${CHARACTERS[i]}">
        `;
        container.appendChild(div);
        const picker = div.querySelector('.character-picker');
        CHARACTERS.forEach((char) => {
            const span = document.createElement('span');
            span.className = `char-option ${char === CHARACTERS[i] ? 'selected' : ''}`;
            span.innerText = char;
            span.onclick = function () {
                Array.from(picker.children).forEach(c => c.classList.remove('selected'));
                span.classList.add('selected');
                document.getElementById(`teamChar_${i}`).value = char;
            }
            picker.appendChild(span);
        });
    }
}

function startGame() {
    const teamCount = parseInt(document.getElementById('teamCount').value);
    const pieceCount = parseInt(document.getElementById('pieceCount').value);
    gameState.teams = [];
    for (let i = 0; i < teamCount; i++) {
        const pieces = [];
        for (let pIdx = 0; pIdx < pieceCount; pIdx++) {
            pieces.push({ id: `${i}-${pIdx}`, teamId: i, location: -1, finished: false });
        }
        gameState.teams.push({
            id: i,
            name: document.getElementById(`teamName_${i}`).value,
            character: document.getElementById(`teamChar_${i}`).value,
            pieces: pieces
        });
    }
    gameState.currentTurn = 0;
    gameState.history = [];
    gameState.isAnimating = false;
    gameState.selectedPiece = null;
    saveGame();
    document.getElementById('setupModal').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    renderBoard();
    updateUI();

    // 게임 시작 시 첫 번째 팀 알림
    setTimeout(() => {
        announceTurn(gameState.teams[0].name);
    }, 500);
}


function saveGame() {
    localStorage.setItem('yutnori_state', JSON.stringify(gameState));
}

function pushHistory() {
    gameState.history.push(JSON.stringify({
        teams: JSON.parse(JSON.stringify(gameState.teams)),
        currentTurn: gameState.currentTurn
    }));
}

function undo() {
    if (gameState.isAnimating) return;
    if (gameState.history.length === 0) return;
    const prev = JSON.parse(gameState.history.pop());
    gameState.teams = prev.teams;
    gameState.currentTurn = prev.currentTurn;
    gameState.isAnimating = false;
    gameState.selectedPiece = null;
    saveGame();
    renderBoard();
    updateUI();
}



function resetGame() {
    if (!confirm("첫 화면으로 돌아가시겠습니까?")) return;
    localStorage.removeItem('yutnori_state');
    location.reload();
}

function updateUI() {
    const currentTeam = gameState.teams[gameState.currentTurn];
    const teamNameEl = document.getElementById('currentTeamName');
    if (teamNameEl && currentTeam) {
        teamNameEl.innerText = currentTeam.name;
    }
    renderWaitingArea();
}

function renderBoard() {
    const board = document.getElementById('yutBoard');
    board.innerHTML = '<div class="center-image"></div>';

    BOARD_NODES.forEach((node) => {
        const div = document.createElement('div');
        div.className = `node ${node.type || ''}`;
        div.style.left = `${node.x}%`;
        div.style.top = `${node.y}%`;
        div.dataset.nodeId = node.id;
        div.onclick = (e) => {
            e.stopPropagation();
            handleNodeClick(node.id);
        };
        board.appendChild(div);
    });
    renderPieces();
}



function renderPieces() {
    const board = document.getElementById('yutBoard');
    document.querySelectorAll('.piece:not(.waiting)').forEach(p => p.remove());

    const locationMap = {};
    gameState.teams.forEach(team => {
        team.pieces.forEach(p => {
            if (!p.finished && p.location !== -1) {
                if (!locationMap[p.location]) locationMap[p.location] = [];
                locationMap[p.location].push({ ...p, char: team.character });
            }
        });
    });

    Object.keys(locationMap).forEach(loc => {
        const pieces = locationMap[loc];
        pieces.forEach((p, idx) => {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'piece';
            if (gameState.selectedPiece && gameState.selectedPiece.id === p.id) {
                pieceEl.style.filter = 'drop-shadow(0 0 10px white) brightness(1.3)';
                pieceEl.style.transform = 'scale(1.1)';
            }

            pieceEl.id = `piece-visual-${p.id}`;
            pieceEl.innerText = p.char;

            const node = BOARD_NODES.find(n => n.id == loc);
            if (!node) return;
            const offsetX = idx * 6;
            const offsetY = idx * -6;
            pieceEl.style.left = `calc(${node.x}% + ${offsetX}px)`;
            pieceEl.style.top = `calc(${node.y}% + ${offsetY}px)`;
            // 말의 기본 Z-index는 하이라이트(100)보다 높지만, 클릭이 필요한 경우를 위해 적절히 조정
            pieceEl.style.zIndex = 500 + idx;



            if (idx === pieces.length - 1 && pieces.length > 1) {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.innerText = `x${pieces.length}`;
                pieceEl.appendChild(badge);
            }

            if (p.teamId === gameState.currentTurn && !gameState.isAnimating) {
                pieceEl.classList.add('movable-piece');
                pieceEl.style.cursor = 'pointer';
                pieceEl.onclick = (e) => {
                    e.stopPropagation();
                    handlePieceClick(p);
                };
            }

            board.appendChild(pieceEl);
        });
    });
}

function renderWaitingArea() {
    const area = document.getElementById('waitingArea');
    area.innerHTML = '';

    gameState.teams.forEach((team, idx) => {
        const teamDiv = document.createElement('div');
        teamDiv.className = `team-waiting ${idx === gameState.currentTurn ? 'active' : ''}`;

        const title = document.createElement('h4');
        title.innerText = team.name;
        teamDiv.appendChild(title);

        const piecesContainer = document.createElement('div');
        piecesContainer.className = 'waiting-pieces';
        teamDiv.appendChild(piecesContainer);

        const waiting = team.pieces.filter(p => !p.finished && p.location === -1);
        waiting.forEach(p => {
            const span = document.createElement('div');
            span.className = 'piece waiting';
            if (gameState.selectedPiece && gameState.selectedPiece.id === p.id) {
                span.style.filter = 'drop-shadow(0 0 8px white) brightness(1.3)';
                span.style.transform = 'scale(1.2)';
            }
            span.id = `piece-visual-${p.id}`;
            span.innerText = team.character;

            if (idx === gameState.currentTurn && !gameState.isAnimating) {
                span.classList.add('movable-piece');
                span.style.cursor = 'pointer';
                span.onclick = (e) => {
                    e.stopPropagation();
                    handlePieceClick(p);
                };
            }

            piecesContainer.appendChild(span);
        });

        const finishedCount = team.pieces.filter(p => p.finished).length;
        if (finishedCount > 0) {
            const trophyDiv = document.createElement('div');
            trophyDiv.style.marginTop = '5px';
            trophyDiv.style.fontSize = '1.2rem';
            trophyDiv.innerText = `🏆 ${finishedCount * 100}`;

            teamDiv.appendChild(trophyDiv);
        }
        area.appendChild(teamDiv);
    });
}

function handlePieceClick(piece) {
    if (gameState.isAnimating) return;
    if (piece.teamId !== gameState.currentTurn) return;

    gameState.selectedPiece = piece;

    // 렌더링 먼저 수행 (이전 상태 정리 및 강조 적용)
    renderBoard();
    updateUI();

    const moves = [];
    const stepsOptions = [-1, 1, 2, 3, 4, 5];

    stepsOptions.forEach(i => {
        const calc = calculatePath(piece.location, i);
        if (calc) {
            moves.push({ result: calc.destination, path: calc.path, dist: i });
        }
    });

    gameState.currentMoves = moves;

    // 렌더링 직후에 하이라이트 추가 (DOM 재생성 시점 고려)
    moves.forEach(m => {
        let nId = (m.result === 'finished') ? 0 : m.result;
        const el = document.querySelector(`.node[data-node-id="${nId}"]`);
        if (el) el.classList.add('possible-move');
    });
}

function calculatePath(currentLoc, steps) {
    if (currentLoc === -1) {
        if (steps < 1) return null;
        const path = [];
        for (let i = 1; i <= steps; i++) path.push(i);
        return { destination: steps, path: path };
    }

    let path = [];
    let curr = currentLoc;

    if (steps === -1) {
        if (PREV_NODE_MAP[curr] !== undefined) {
            curr = PREV_NODE_MAP[curr];
            path.push(curr);
            return { destination: curr, path: path };
        } else return null;
    }

    if (curr === 5) curr = 20;
    else if (curr === 10) curr = 25;
    else if (curr === 22) curr = 27;
    else {
        if (NEXT_NODE_MAP[curr] !== undefined) curr = NEXT_NODE_MAP[curr];
        else return null;
    }
    path.push(curr);

    for (let i = 1; i < steps; i++) {
        if (curr === 0) return { destination: 'finished', path: path };
        if (curr === 22) {
            const prev = path.length >= 2 ? path[path.length - 2] : currentLoc;
            if (prev === 21 || prev === 20 || prev === 5) curr = 23;
            else curr = 27;
        } else { curr = NEXT_NODE_MAP[curr]; }
        path.push(curr);
    }
    if (curr === 0) return { destination: 'finished', path: path };
    return { destination: curr, path: path };
}

function handleNodeClick(nodeId) {
    if (gameState.isAnimating || !gameState.selectedPiece) return;
    const node = document.querySelector(`.node[data-node-id="${nodeId}"]`);
    if (!node || !node.classList.contains('possible-move')) return;

    const move = gameState.currentMoves.find(m =>
        m.result === nodeId || (m.result === 'finished' && nodeId === 0)
    );

    if (move) {
        pushHistory();
        startMoveAnimation(gameState.selectedPiece, move);
    }
}

async function startMoveAnimation(piece, move) {
    gameState.isAnimating = true;
    document.querySelectorAll('.possible-move').forEach(el => el.classList.remove('possible-move'));

    // 골인이 아닐 때만 이동 명칭(도, 개 등) 표시
    if (move.result !== 'finished') {
        const moveName = MOVE_NAMES[move.dist] || '이동!';
        showMessage(moveName);
        await new Promise(r => setTimeout(r, 600));
    }

    const team = gameState.teams[piece.teamId];

    let movingPieces = team.pieces.filter(p => !p.finished && p.location === piece.location);
    if (piece.location === -1) movingPieces = [team.pieces.find(p => p.id === piece.id)];

    const path = move.path;
    for (let i = 0; i < path.length; i++) {
        await animateStep(movingPieces, path[i]);
        movingPieces.forEach(p => p.location = path[i]);
        renderBoard();
    }

    movePieceExec(piece.teamId, movingPieces.map(p => p.id), move.result, move.dist);
}

function animateStep(pieces, targetNodeId) {
    return new Promise(resolve => {
        const clones = [];
        let targetNodeIdFix = (targetNodeId === 'finished') ? 0 : targetNodeId;
        const targetNode = document.querySelector(`.node[data-node-id="${targetNodeIdFix}"]`);
        if (!targetNode) { resolve(); return; }
        const targetRect = targetNode.getBoundingClientRect();

        pieces.forEach((p, idx) => {
            const el = document.getElementById(`piece-visual-${p.id}`);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const clone = el.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.zIndex = 1000 + idx;
            clone.style.transition = 'all 0.3s ease-in-out';
            document.body.appendChild(clone);
            clones.push(clone);
            el.style.opacity = '0';

            requestAnimationFrame(() => {
                const offsetX = idx * 6;
                const offsetY = idx * -6;
                clone.style.left = (targetRect.left + (targetRect.width / 2 - rect.width / 2) + offsetX) + 'px';
                clone.style.top = (targetRect.top + (targetRect.height / 2 - rect.height / 2) + offsetY) + 'px';
                clone.style.transform = `scale(1.3)`;
                playMoveSound();
            });

        });

        setTimeout(() => {
            clones.forEach(c => c.remove());
            resolve();
        }, 300);
    });
}

function movePieceExec(teamId, movingPieceIds, targetLoc, dist) {
    try {
        const team = gameState.teams[teamId];
        let caught = false;
        let goalHappened = false;

        const actualMovingPieces = team.pieces.filter(p => movingPieceIds.includes(p.id));

        if (targetLoc === 'finished') {
            actualMovingPieces.forEach(p => {
                p.finished = true;
                p.location = 'goal';
            });
            goalHappened = true;
        } else {
            actualMovingPieces.forEach(p => p.location = targetLoc);
            gameState.teams.forEach(t => {
                if (t.id !== teamId) {
                    t.pieces.forEach(enemy => {
                        if (!enemy.finished && enemy.location === targetLoc) {
                            enemy.location = -1;
                            caught = true;
                        }
                    });
                }
            });
        }

        if (goalHappened) {
            showMessage("골인! 🎉");
            playGoalSound();
        } else if (caught) {
            showMessage("잡았다! 😆\n한 번 더!");
            playCatchSound();
        } else if (dist === 4 || dist === 5) {
            showMessage("한 번 더! ✨");
        }


        const hasExtraTurn = (dist === 4 || dist === 5 || caught) && !team.pieces.every(p => p.finished);

        if (!hasExtraTurn) {
            gameState.currentTurn = (gameState.currentTurn + 1) % gameState.teams.length;
            let count = 0;
            while (gameState.teams[gameState.currentTurn].pieces.every(p => p.finished) && count < gameState.teams.length) {
                gameState.currentTurn = (gameState.currentTurn + 1) % gameState.teams.length;
                count++;
            }
            // 일반적인 턴 전환 시 알림
            announceTurn(gameState.teams[gameState.currentTurn].name);
        }

    } finally {
        gameState.isAnimating = false;
        gameState.selectedPiece = null;
        saveGame();
        renderBoard();
        updateUI();
    }
}

function passTurn() {
    if (gameState.isAnimating) return;
    if (!confirm("차례를 넘기시겠습니까?")) return;

    console.log("Passing turn for team:", gameState.currentTurn);
    pushHistory();

    // 다음 턴 결정 로직
    gameState.currentTurn = (gameState.currentTurn + 1) % gameState.teams.length;
    let count = 0;
    while (gameState.teams[gameState.currentTurn].pieces.every(p => p.finished) && count < gameState.teams.length) {
        gameState.currentTurn = (gameState.currentTurn + 1) % gameState.teams.length;
        count++;
    }

    gameState.selectedPiece = null;
    saveGame();
    renderBoard();
    updateUI();
    showMessage("차례를 넘겼습니다.");

    // 명시적인 차례 넘기기 후 알림
    announceTurn(gameState.teams[gameState.currentTurn].name);
}


function showMessage(text) {
    const overlay = document.getElementById('messageOverlay');
    const textEl = document.getElementById('overlayText');
    if (overlay && textEl) {
        textEl.classList.remove('turn-announce'); // 일반 메시지일 경우 턴 스타일 제거
        textEl.innerText = text;
        overlay.classList.remove('hidden');
        if (overlay._hideTimeout) clearTimeout(overlay._hideTimeout);
        overlay._hideTimeout = setTimeout(() => {
            overlay.classList.add('hidden');
        }, 1500);
    }
}

function announceTurn(teamName) {
    const overlay = document.getElementById('messageOverlay');
    const textEl = document.getElementById('overlayText');
    if (overlay && textEl) {
        textEl.innerText = `${teamName} 팀 차례! 🎲`;
        textEl.classList.add('turn-announce'); // 턴 전용 화려한 스타일 적용
        overlay.classList.remove('hidden');

        if (overlay._hideTimeout) clearTimeout(overlay._hideTimeout);
        overlay._hideTimeout = setTimeout(() => {
            overlay.classList.add('hidden');
            textEl.classList.remove('turn-announce');
        }, 1200); // 애니메이션 시간(1.2s)에 맞춤
    }
}

