(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    root.classList.add('js');

    /* ---------- Theme ---------- */

    var themeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-toggle]'));
    var themeMetas = Array.prototype.slice.call(document.querySelectorAll('meta[name="theme-color"]'));
    var themeLabel = document.querySelector('[data-theme-label]');

    function storedTheme() {
        try {
            var value = localStorage.getItem('pref-theme');
            return value === 'dark' || value === 'light' ? value : null;
        } catch (error) {
            return null;
        }
    }

    function syncThemeChrome() {
        var dark = root.dataset.theme === 'dark';
        var color = dark ? '#0d0e0f' : '#f4f1ea';
        themeMetas.forEach(function (meta) {
            meta.setAttribute('content', color);
        });
        themeButtons.forEach(function (button) {
            button.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
        });
        if (themeLabel) {
            themeLabel.textContent = dark ? '切换到浅色模式' : '切换到深色模式';
        }
    }

    themeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
            root.dataset.theme = next;
            try {
                localStorage.setItem('pref-theme', next);
            } catch (error) {
                /* localStorage may be unavailable */
            }
            syncThemeChrome();
        });
    });

    syncThemeChrome();

    if (window.matchMedia) {
        var scheme = window.matchMedia('(prefers-color-scheme: dark)');
        var onScheme = function (event) {
            if (!storedTheme()) {
                root.dataset.theme = event.matches ? 'dark' : 'light';
                syncThemeChrome();
            }
        };
        if (scheme.addEventListener) {
            scheme.addEventListener('change', onScheme);
        } else if (scheme.addListener) {
            scheme.addListener(onScheme);
        }
    }

    /* ---------- Mobile menu ---------- */

    var menuToggle = document.querySelector('[data-menu-toggle]');
    var menuPanel = document.getElementById('site-panel');
    var menuCloseButtons = Array.prototype.slice.call(document.querySelectorAll('[data-menu-close]'));
    var lastFocus = null;

    function menuIsOpen() {
        return menuPanel && menuPanel.classList.contains('is-open');
    }

    function openMenu() {
        if (!menuPanel || !menuToggle) return;
        lastFocus = document.activeElement;
        menuPanel.classList.add('is-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', '关闭菜单');
        document.body.classList.add('nav-open');
        var first = menuPanel.querySelector('a[href], button:not([disabled])');
        if (first) {
            window.setTimeout(function () {
                first.focus();
            }, 40);
        }
    }

    function closeMenu(restoreFocus) {
        if (!menuPanel || !menuToggle) return;
        menuPanel.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', '打开菜单');
        document.body.classList.remove('nav-open');
        if (restoreFocus !== false) {
            (lastFocus || menuToggle).focus();
        }
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            if (menuIsOpen()) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    menuCloseButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            closeMenu();
        });
    });

    if (menuPanel) {
        menuPanel.querySelectorAll('.panel-nav a').forEach(function (link) {
            link.addEventListener('click', function () {
                closeMenu(false);
            });
        });
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && menuIsOpen()) {
            closeMenu();
        }
    });

    if (menuPanel) {
        menuPanel.addEventListener('keydown', function (event) {
            if (event.key !== 'Tab' || !menuIsOpen()) return;
            var focusable = Array.prototype.slice.call(menuPanel.querySelectorAll('a[href], button:not([disabled])'));
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    if (window.matchMedia) {
        var wide = window.matchMedia('(min-width: 901px)');
        var onWide = function (event) {
            if (event.matches) closeMenu(false);
        };
        if (wide.addEventListener) {
            wide.addEventListener('change', onWide);
        } else if (wide.addListener) {
            wide.addListener(onWide);
        }
    }

    /* ---------- Code blocks ---------- */

    function fallbackCopy(text) {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.appendChild(area);
        area.select();
        try {
            document.execCommand('copy');
        } catch (error) {
            /* ignore */
        }
        document.body.removeChild(area);
    }

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(function () {
                fallbackCopy(text);
            });
        }
        fallbackCopy(text);
        return Promise.resolve();
    }

    document.querySelectorAll('.highlight').forEach(function (block) {
        if (root.dataset.codeCopy === 'false') return;
        var code = block.querySelector('pre code');
        if (!code) return;

        var language = code.getAttribute('data-lang') || '';
        if (!language) {
            var match = (code.className || '').match(/language-([\w-]+)/);
            language = match ? match[1] : 'text';
        }

        var toolbar = document.createElement('div');
        toolbar.className = 'code-toolbar';

        var label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = language === 'text' ? 'TEXT' : language.toUpperCase();

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'code-copy';
        button.textContent = '复制';
        button.setAttribute('aria-label', '复制代码');

        button.addEventListener('click', function () {
            var text = code.innerText.replace(/\n$/, '');
            copyText(text).then(function () {
                button.textContent = '已复制';
                button.setAttribute('data-copied', 'true');
                window.setTimeout(function () {
                    button.textContent = '复制';
                    button.removeAttribute('data-copied');
                }, 1800);
            }).catch(function () {
                button.textContent = '复制失败';
                window.setTimeout(function () {
                    button.textContent = '复制';
                }, 1800);
            });
        });

        toolbar.appendChild(label);
        toolbar.appendChild(button);
        block.insertBefore(toolbar, block.firstChild);
        block.classList.add('has-toolbar');
    });

    /* ---------- Share ---------- */

    document.querySelectorAll('[data-copy-url]').forEach(function (button) {
        button.addEventListener('click', function () {
            var url = button.getAttribute('data-url') || window.location.href;
            var row = button.closest('.share-row');
            var status = row ? row.querySelector('.share-status') : null;
            copyText(url).then(function () {
                if (!status) return;
                status.textContent = '链接已复制';
                window.setTimeout(function () {
                    status.textContent = '';
                }, 2200);
            }).catch(function () {
                if (!status) return;
                status.textContent = '复制失败，请手动复制';
                window.setTimeout(function () {
                    status.textContent = '';
                }, 2200);
            });
        });
    });

    /* ---------- TOC current section ---------- */

    var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.article-toc a[href^="#"], .article-toc-mobile a[href^="#"]'));
    var headings = Array.prototype.slice.call(document.querySelectorAll('.prose h2[id], .prose h3[id]'));

    if (tocLinks.length && headings.length) {
        var linksById = {};
        tocLinks.forEach(function (link) {
            var id = decodeURIComponent(link.getAttribute('href').slice(1));
            (linksById[id] = linksById[id] || []).push(link);
        });

        var setCurrent = function (id) {
            tocLinks.forEach(function (link) {
                link.classList.remove('is-current');
                link.removeAttribute('aria-current');
            });
            (linksById[id] || []).forEach(function (link) {
                link.classList.add('is-current');
                link.setAttribute('aria-current', 'true');
            });
        };

        var headerHeight = parseInt(getComputedStyle(root).getPropertyValue('--header-h'), 10) || 72;
        var ticking = false;

        var updateToc = function () {
            var offset = headerHeight + 48;
            var current = headings[0] ? headings[0].id : '';
            headings.forEach(function (heading) {
                if (heading.getBoundingClientRect().top <= offset) {
                    current = heading.id;
                }
            });
            setCurrent(current);
            ticking = false;
        };

        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(updateToc);
                ticking = true;
            }
        }, { passive: true });

        updateToc();
    }

    /* ---------- Search shortcut from any page ---------- */

    var searchInput = document.getElementById('searchInput');
    var searchLink = document.querySelector('.primary-nav a[href*="/search/"]');
    if (searchLink && !searchInput) {
        document.addEventListener('keydown', function (event) {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
            var target = document.activeElement;
            var isTyping = target instanceof HTMLElement
                && (target.matches('input, textarea, select') || target.isContentEditable);
            if (isTyping || document.body.classList.contains('nav-open')) return;
            event.preventDefault();
            window.location.href = searchLink.href;
        });
    }

    /* ---------- Closing moment ---------- */

    var moment = document.querySelector('[data-moment]');
    if (moment) {
        var reveal = function () {
            moment.classList.add('is-in');
        };

        if (reduceMotion.matches || !('IntersectionObserver' in window)) {
            reveal();
        } else {
            var observer = new IntersectionObserver(function (entries, observerInstance) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        reveal();
                        observerInstance.disconnect();
                    }
                });
            }, { threshold: 0.24 });
            observer.observe(moment);
            window.setTimeout(reveal, 4000);
        }

        if (reduceMotion.addEventListener) {
            reduceMotion.addEventListener('change', function (event) {
                if (event.matches) reveal();
            });
        }
    }
})();
