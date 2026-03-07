/**
 * 모든 페이지에 로드되어 공통 내비게이션 UI를 주입하는 스크립트
 */
(function () {
    const pages = [
        { name: '라이브러리', url: 'index.html', icon: '🏠' },
        { name: '카운트다운', url: 'countdown.html', icon: '⏳' },
        { name: '플레이리스트', url: 'bgm.html', icon: '🎶' },
        { name: '미니 윷놀이', url: 'yutnori.html', icon: '🎲' }
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    function initNavigation() {
        const navHtml = `
            <nav class="global-nav">
                <div class="nav-dropdown">
                    <div class="nav-trigger" title="전체 메뉴">☰</div>
                    <div class="nav-menu">
                        ${pages.map(page => `
                            <a href="${page.url}" class="${currentPath === page.url ? 'active' : ''}">
                                <i>${page.icon}</i>
                                <span>${page.name}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </nav>
        `;

        document.body.insertAdjacentHTML('afterbegin', navHtml);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }
})();
