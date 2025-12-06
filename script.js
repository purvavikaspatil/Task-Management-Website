// Selectors

const ADD_BTN = document.getElementById('addBtn');
const CLEAR_BTN = document.getElementById('clearBtn');
const POPUP = document.getElementById('popup');
const CLOSE_POPUP = document.getElementById('closePopup');
const CANCEL_BTN = document.getElementById('cancelBtn');
const CREATE_BTN = document.getElementById('createTaskBtn');
const TASK_TEXT = document.getElementById('taskText');
const PRIO_BTNS = document.querySelectorAll('.prio-btn');
const FILTERS = document.querySelectorAll('.filter.pill');
const BOARD = document.getElementById('board');

let tasks = JSON.parse(localStorage.getItem('taskflow.tasks') || '[]');
let selectedPriority = 'high';
let activeFilter = 'all';

// small id
const uid = () => 't_' + Math.random().toString(36).slice(2, 9);


ADD_BTN.addEventListener('click', () => {
    TASK_TEXT.value = '';
    PRIO_BTNS.forEach(b => b.classList.remove('active'));
    document.querySelector('.prio-btn[data-priority="high"]').classList.add('active');
    selectedPriority = 'high';
    POPUP.classList.remove('hidden');
    POPUP.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEsc);
    POPUP.addEventListener('click', handleBackdropClick);
    TASK_TEXT.focus();
});
CLOSE_POPUP?.addEventListener('click', closePopup);
CANCEL_BTN.addEventListener('click', closePopup);

function closePopup() {
    POPUP.classList.add('hidden');
    POPUP.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEsc);
    POPUP.removeEventListener('click', handleBackdropClick);
}


function handleBackdropClick(e) {
    if (e.target === POPUP) closePopup();
}

PRIO_BTNS.forEach(btn => {
    btn.addEventListener('click', () => {
        PRIO_BTNS.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.dataset.priority;
    });
});

CREATE_BTN.addEventListener('click', () => {
    const text = TASK_TEXT.value.trim();
    if (!text) { alert('Please write a task.'); TASK_TEXT.focus(); return; }

    const newTask = { id: uid(), text, priority: selectedPriority, done: false, created: Date.now() };
    tasks.unshift(newTask);
    saveAndRender();
    closePopup();
});

CLEAR_BTN.addEventListener('click', () => {
    if (tasks.length === 0) return;
    if (confirm('Delete ALL tasks?')) {
        tasks = [];
        saveAndRender();
    }
});

FILTERS.forEach(f => {
    f.addEventListener('click', () => {
        FILTERS.forEach(x => x.classList.remove('active'));
        f.classList.add('active');
        activeFilter = f.dataset.priority;
        render();
    });
});

function persist() {
    localStorage.setItem('taskflow.tasks', JSON.stringify(tasks));
}

function saveAndRender() {
    persist();
    render();
}

function render() {
    BOARD.innerHTML = '';
    const list = activeFilter && activeFilter !== 'all' ? tasks.filter(t => t.priority === activeFilter) : tasks;

    if (list.length === 0) {
        const info = document.createElement('div');
        info.className = 'card';
        info.innerHTML = `<div class="small-muted">No tasks here — add one to get momentum ✨</div>`;
        BOARD.appendChild(info);
        return;
    }

    list.forEach(task => {
        const card = document.createElement('div');
        card.className = 'card enter';
        card.classList.add(`prio-${task.priority}`);
        const ribbon = document.createElement('div');
        ribbon.className = `priority-ribbon priority-${task.priority}`;
        card.appendChild(ribbon);

        const meta = document.createElement('div');
        meta.className = 'meta';
        const idSpan = document.createElement('div');
        idSpan.className = 'small-muted';
        idSpan.textContent = new Date(task.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        meta.appendChild(idSpan);

        const icons = document.createElement('div');
        icons.className = 'icons';

        // play sound + animate slide-away then remove when task is completed

        const completeBtn = document.createElement('button');
        completeBtn.className = 'icon-btn';
        completeBtn.title = 'Complete task';
        completeBtn.innerHTML = '◻️';
        completeBtn.addEventListener('click', () => {
            playCompleteSound();
            card.classList.add('dismiss');
            setTimeout(() => {
                tasks = tasks.filter(t => t.id !== task.id);
                saveAndRender();
            }, 380);
        });
        icons.appendChild(completeBtn);

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'Edit';
        editBtn.innerHTML = '✏️';
        icons.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.title = 'Delete';
        delBtn.innerHTML = '🗑️';
        delBtn.addEventListener('click', () => {
            if (confirm('Delete this task?')) {
                tasks = tasks.filter(t => t.id !== task.id);
                saveAndRender();
            }
        });
        icons.appendChild(delBtn);

        meta.appendChild(icons);
        card.appendChild(meta);

        const p = document.createElement('p');
        p.className = 'task-text';
        p.textContent = task.text;
        p.contentEditable = false;
        if (task.done) card.classList.add('done');
        card.appendChild(p);

        let inEdit = false;
        editBtn.addEventListener('click', () => {
            inEdit = !inEdit;
            if (inEdit) {
                p.contentEditable = true;
                p.focus();
                editBtn.innerHTML = '💾';
            } else {
                p.contentEditable = false;
                task.text = p.textContent.trim() || task.text;
                editBtn.innerHTML = '✏️';
                saveAndRender();
            }
        });

        BOARD.appendChild(card);

        setTimeout(() => card.classList.remove('enter'), 320);
    });
}

render();


// ----- Audio: completion sound (prefer ding.mp3 via WebAudio buffer for instant playback) -----
let _audioCtx = null;
let _dingBuffer = null;
const COMPLETE_AUDIO = new Audio('ding.mp3');
COMPLETE_AUDIO.preload = 'auto';
COMPLETE_AUDIO.volume = 0.9;

function initAudioOnce() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
        if (!_audioCtx) _audioCtx = new AudioCtx();
        fetch('ding.mp3').then(r => {
            if (!r.ok) return Promise.reject('no-file');
            return r.arrayBuffer();
        }).then(arr => _audioCtx.decodeAudioData(arr)).then(buf => {
            _dingBuffer = buf;
        }).catch(() => {
            _dingBuffer = null;
        });
    } catch (e) {
        // ignore
    }
}

document.addEventListener('pointerdown', initAudioOnce, { once: true, passive: true });

function playCompleteSound() {
    if (_dingBuffer && _audioCtx) {
        try {
            const src = _audioCtx.createBufferSource();
            src.buffer = _dingBuffer;
            const g = _audioCtx.createGain();
            g.gain.value = 0.95;
            src.connect(g);
            g.connect(_audioCtx.destination);
            src.start(0);
            return;
        } catch (e) {
            console.warn('buffer playback failed', e);
        }
    }

    try {
        COMPLETE_AUDIO.currentTime = 0;
        const p = COMPLETE_AUDIO.play();
        if (p && p.catch) p.catch(() => _playOscillator());
        return;
    } catch (e) {
        _playOscillator();
    }
}

function _playOscillator() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!_audioCtx) _audioCtx = new AudioCtx();
        const now = _audioCtx.currentTime;
        const o = _audioCtx.createOscillator();
        const g = _audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(880, now);
        o.connect(g);
        g.connect(_audioCtx.destination);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.48, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        o.start(now);
        o.stop(now + 0.26);
    } catch (e) {
        console.warn('Audio play failed', e);
    }
}
