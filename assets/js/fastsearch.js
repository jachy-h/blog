import * as params from '@params';

const els = {
    input: document.getElementById('searchInput'),
    form: document.getElementById('searchForm'),
    clear: document.getElementById('searchClear'),
    kbd: document.getElementById('searchKbd'),
    filters: document.getElementById('searchFilters'),
    status: document.getElementById('searchStatus'),
    results: document.getElementById('searchResults'),
    idle: document.getElementById('searchIdle'),
    recent: document.getElementById('searchRecent'),
    recentSection: document.getElementById('searchRecentSection'),
};

const RECENT_KEY = 'jachy-search-recent';
const MAX_RECENT = 6;

const state = {
    fuse: null,
    data: [],
    query: '',
    category: '',
    results: [],
};

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));

const readOption = (key, fallback) => {
    const options = params.fuseOpts || {};
    const lower = key.toLowerCase();
    return options[key] ?? options[lower] ?? fallback;
};

const buildFuseOptions = () => ({
    isCaseSensitive: readOption('isCaseSensitive', false),
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: readOption('minMatchCharLength', 1),
    shouldSort: readOption('shouldSort', true),
    findAllMatches: false,
    keys: readOption('keys', [
        { name: 'title', weight: 0.6 },
        { name: 'summary', weight: 0.25 },
        { name: 'content', weight: 0.15 },
    ]),
    location: readOption('location', 0),
    threshold: readOption('threshold', 0.4),
    distance: readOption('distance', 1000),
    ignoreLocation: readOption('ignoreLocation', true),
    limit: readOption('limit', 30),
});

const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
    };
};

const mergeIndices = (indices) => {
    if (!Array.isArray(indices) || indices.length === 0) {
        return [];
    }
    const sorted = indices
        .map(([start, end]) => [start, Math.max(start, end)])
        .sort((a, b) => a[0] - b[0]);
    const merged = [sorted[0]];
    for (const [start, end] of sorted.slice(1)) {
        const last = merged[merged.length - 1];
        if (start <= last[1] + 1) {
            last[1] = Math.max(last[1], end);
        } else {
            merged.push([start, end]);
        }
    }
    return merged;
};

const highlight = (text, indices) => {
    const source = String(text ?? '');
    const merged = mergeIndices(indices);
    if (merged.length === 0) {
        return escapeHtml(source);
    }
    let html = '';
    let cursor = 0;
    for (const [start, end] of merged) {
        if (start > cursor) {
            html += escapeHtml(source.slice(cursor, start));
        }
        html += `<mark>${escapeHtml(source.slice(start, end + 1))}</mark>`;
        cursor = end + 1;
    }
    html += escapeHtml(source.slice(cursor));
    return html;
};

const snippetFor = (item, matches) => {
    const matchFor = (key) => (matches || []).find((match) => match.key === key && match.indices?.length);

    const summaryMatch = matchFor('summary');
    if (summaryMatch) {
        return { text: item.summary || '', indices: summaryMatch.indices };
    }

    const contentMatch = matchFor('content');
    const rawContent = String(item.content || '').replace(/[\n\r\t]/g, ' ');
    if (contentMatch) {
        const [first, last] = contentMatch.indices[0];
        const start = Math.max(0, first - 60);
        const end = Math.min(rawContent.length, Math.max(last + 100, start + 140));
        const text = rawContent.slice(start, end);
        const offset = start;
        const indices = contentMatch.indices
            .filter(([a, b]) => b >= start && a <= end)
            .map(([a, b]) => [Math.max(0, a - offset), Math.min(end, b + 1) - offset - 1]);
        return {
            text: `${start > 0 ? '…' : ''}${text}${end < rawContent.length ? '…' : ''}`,
            indices: indices.map(([a, b]) => [a + (start > 0 ? 1 : 0), b + (start > 0 ? 1 : 0)]),
        };
    }

    return { text: (item.summary || rawContent).slice(0, 160), indices: [] };
};

const loadRecent = () => {
    try {
        const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch {
        return [];
    }
};

const remember = (query) => {
    const value = String(query || '').trim();
    if (!value) {
        return;
    }
    const next = [value, ...loadRecent().filter((item) => item !== value)].slice(0, MAX_RECENT);
    try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        /* localStorage may be unavailable */
    }
    renderRecent();
};

const renderRecent = () => {
    if (!els.recent || !els.recentSection) {
        return;
    }
    const recent = loadRecent();
    els.recent.innerHTML = '';
    els.recentSection.hidden = recent.length === 0;
    for (const query of recent) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-recent-item';
        button.textContent = query;
        button.addEventListener('click', () => {
            els.input.value = query;
            state.category = '';
            updateChips();
            performSearch();
            els.input.focus();
        });
        els.recent.appendChild(button);
    }
};

const setStatus = (text) => {
    if (els.status) {
        els.status.textContent = text;
    }
};

const showIdle = (show) => {
    if (els.idle) {
        els.idle.hidden = !show;
    }
};

const updateUrl = () => {
    const url = new URL(window.location.href);
    if (state.query) {
        url.searchParams.set('q', state.query);
    } else {
        url.searchParams.delete('q');
    }
    if (state.category) {
        url.searchParams.set('c', state.category);
    } else {
        url.searchParams.delete('c');
    }
    window.history.replaceState(null, '', url);
};

const resultCountLabel = (count) => {
    if (state.category) {
        return `在「${state.category}」中找到 ${count} 条结果`;
    }
    return `找到 ${count} 条结果`;
};

const renderResults = () => {
    if (!els.results) {
        return;
    }
    els.results.innerHTML = '';

    if (!state.query && !state.category) {
        setStatus('');
        showIdle(true);
        if (els.filters) {
            els.filters.hidden = true;
        }
        return;
    }

    showIdle(false);
    if (els.filters) {
        els.filters.hidden = els.filters.children.length <= 1;
    }

    if (state.results.length === 0) {
        const item = document.createElement('li');
        item.className = 'search-empty';
        item.innerHTML = state.query
            ? `<p>${state.category ? `在「${escapeHtml(state.category)}」中` : ''}没有找到与「${escapeHtml(state.query)}」相关的内容</p>
               <p class="search-empty-hint">试试更短的关键词，或换个分类浏览。</p>`
            : '<p>这个分类下暂时没有文章</p>';
        els.results.appendChild(item);
        setStatus(state.query ? `没有找到与「${state.query}」相关的内容` : '这个分类下暂时没有文章');
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const { item, matches } of state.results) {
        const titleMatch = (matches || []).find((match) => match.key === 'title');
        const snippet = snippetFor(item, matches);
        const categories = (item.categories || []).slice(0, 2);
        const restCount = Math.max(0, (item.categories || []).length - categories.length);

        const meta = [
            ...categories.map((category) => `<span class="search-result-cat">${escapeHtml(category)}</span>`),
            ...(restCount > 0 ? [`<span class="search-result-more">+${restCount}</span>`] : []),
            ...(item.date ? [`<span>${escapeHtml(item.date)}</span>`] : []),
        ].join('');

        const anchor = document.createElement('a');
        anchor.className = 'search-result';
        anchor.href = item.permalink;
        anchor.innerHTML = [
            `<h2>${highlight(item.title, titleMatch?.indices)}</h2>`,
            snippet.text
                ? `<p class="search-result-snippet">${highlight(snippet.text, snippet.indices)}</p>`
                : '',
            meta ? `<div class="search-result-meta">${meta}</div>` : '',
        ].join('');
        anchor.addEventListener('click', () => remember(state.query));

        const row = document.createElement('li');
        row.appendChild(anchor);
        fragment.appendChild(row);
    }

    els.results.appendChild(fragment);
    setStatus(resultCountLabel(state.results.length));
};

const updateChips = () => {
    if (!els.filters) {
        return;
    }
    for (const chip of els.filters.querySelectorAll('.search-chip')) {
        chip.setAttribute('aria-pressed', String(chip.dataset.value === state.category));
    }
};

const buildFilters = () => {
    if (!els.filters) {
        return;
    }
    const counts = new Map();
    for (const item of state.data) {
        for (const category of item.categories || []) {
            counts.set(category, (counts.get(category) || 0) + 1);
        }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));

    els.filters.innerHTML = '';
    const makeChip = (label, value, count) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'search-chip';
        chip.dataset.value = value;
        chip.setAttribute('aria-pressed', String(state.category === value));
        chip.innerHTML = `<span>${escapeHtml(label)}</span><span class="search-chip-count">${count}</span>`;
        chip.addEventListener('click', () => {
            state.category = value;
            updateChips();
            performSearch();
        });
        return chip;
    };

    const shown = sorted.slice(0, 7);
    if (state.category && !shown.some(([category]) => category === state.category)) {
        const active = sorted.find(([category]) => category === state.category);
        if (active) {
            shown.unshift(active);
        }
    }

    els.filters.appendChild(makeChip('全部', '', state.data.length));
    for (const [category, count] of shown) {
        els.filters.appendChild(makeChip(category, category, count));
    }
    els.filters.hidden = sorted.length === 0;
};

const allInCategory = () => state.data
    .filter((item) => !state.category || (item.categories || []).includes(state.category))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((item) => ({ item, matches: [] }));

const exactIndices = (text, tokens) => {
    const haystack = String(text || '').toLowerCase();
    const indices = [];
    for (const token of tokens) {
        if (!token) {
            continue;
        }
        let position = haystack.indexOf(token);
        while (position !== -1) {
            indices.push([position, position + token.length - 1]);
            position = haystack.indexOf(token, position + token.length);
        }
    }
    return indices;
};

const exactResults = () => {
    const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return [];
    }

    const rankOf = (item) => {
        const title = String(item.title || '').toLowerCase();
        const summary = String(item.summary || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();
        if (!tokens.every((token) => title.includes(token) || summary.includes(token) || content.includes(token))) {
            return null;
        }
        if (tokens.every((token) => title.includes(token))) {
            return 0;
        }
        if (tokens.every((token) => summary.includes(token))) {
            return 1;
        }
        return 2;
    };

    return state.data
        .map((item) => ({ item, rank: rankOf(item) }))
        .filter((entry) => entry.rank !== null
            && (!state.category || (entry.item.categories || []).includes(state.category)))
        .sort((a, b) => a.rank - b.rank || String(b.item.date || '').localeCompare(String(a.item.date || '')))
        .map(({ item }) => {
            const matches = ['title', 'summary', 'content']
                .map((key) => ({ key, indices: exactIndices(item[key], tokens) }))
                .filter((match) => match.indices.length > 0);
            return { item, matches, exact: true };
        });
};

const performSearch = () => {
    state.query = els.input.value.trim();
    if (els.clear) {
        els.clear.hidden = state.query.length === 0;
    }
    updateUrl();

    if (!state.query) {
        state.results = state.category ? allInCategory() : [];
        renderResults();
        return;
    }

    if (!state.fuse) {
        state.results = [];
        renderResults();
        return;
    }

    const limit = state.category ? 200 : readOption('limit', 30);
    const exact = exactResults().slice(0, limit);

    if (exact.length === 0) {
        const fuzzy = state.fuse.search(state.query, { limit: limit * 2 })
            .filter(({ item }) => !state.category || (item.categories || []).includes(state.category))
            .slice(0, limit);
        exact.push(...fuzzy);
    }

    state.results = exact;
    renderResults();
};

const resetSearch = () => {
    els.input.value = '';
    state.category = '';
    updateChips();
    performSearch();
    els.input.focus();
};

const initSearch = async () => {
    if (!els.input || !els.results) {
        return;
    }

    els.input.disabled = false;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        els.input.focus();
    }
    renderRecent();
    setStatus('正在载入搜索索引…');

    if (els.kbd) {
        els.kbd.textContent = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';
    }

    try {
        const response = await fetch('../index.json');
        if (!response.ok) {
            throw new Error(`Search index load failed: ${response.status}`);
        }
        state.data = await response.json();
        state.fuse = new Fuse(state.data, buildFuseOptions());

        const searchParams = new URLSearchParams(window.location.search);
        const query = searchParams.get('q') || '';
        const category = searchParams.get('c') || '';
        const knownCategories = new Set(state.data.flatMap((item) => item.categories || []));
        state.category = knownCategories.has(category) ? category : '';
        if (query) {
            els.input.value = query;
        }

        buildFilters();
        updateChips();
        setStatus('');
        performSearch();
    } catch (error) {
        console.error(error);
        setStatus('搜索索引加载失败，请刷新页面重试。');
        els.input.disabled = true;
    }
};

els.form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const first = els.results?.querySelector('.search-result');
    if (first) {
        first.click();
    }
});

els.input?.addEventListener('input', debounce(performSearch, 140));

els.input?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
        const first = els.results?.querySelector('.search-result');
        if (first) {
            event.preventDefault();
            first.focus();
        }
    } else if (event.key === 'Enter') {
        const first = els.results?.querySelector('.search-result');
        if (first) {
            event.preventDefault();
            remember(state.query);
            window.location.href = first.href;
        }
    } else if (event.key === 'Escape') {
        resetSearch();
    }
});

els.clear?.addEventListener('click', () => {
    els.input.value = '';
    performSearch();
    els.input.focus();
});

els.results?.addEventListener('keydown', (event) => {
    const link = event.target instanceof Element ? event.target.closest('.search-result') : null;
    if (!link) {
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = link.parentElement?.nextElementSibling?.querySelector('.search-result');
        (next || link).focus();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const previous = link.parentElement?.previousElementSibling?.querySelector('.search-result');
        (previous || els.input).focus();
    } else if (event.key === 'Escape') {
        els.input.focus();
    }
});

document.addEventListener('keydown', (event) => {
    const target = document.activeElement;
    const isTyping = target instanceof HTMLElement
        && (target.matches('input, textarea, select') || target.isContentEditable);

    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        els.input.focus();
        els.input.select();
        return;
    }

    if (event.key === '/' && !isTyping) {
        event.preventDefault();
        els.input.focus();
    }
});

window.addEventListener('load', initSearch);
