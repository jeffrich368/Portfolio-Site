/*
 File: script.js
 Purpose: UX enhancements for the portfolio site
 - Smooth in-page scrolling
 - Accessible mobile nav focus-trap + Esc to close
 - Contact form client-side validation + simulated submit
 - Active section highlighting (intersection observer)
 - Lazy-load images (best-effort)
*/

(function () {
    'use strict';

    // Utils
    var qa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
    var q = function (sel, ctx) { return (ctx || document).querySelector(sel); };

    // Elements
    var menuToggle = q('#menu-toggle');
    var mainNav = q('#main-nav');
    var navLinks = qa('.nav-links a', mainNav);
    var focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    var previouslyFocused = null;

    // Focus trap when mobile nav opens (watch aria-expanded)
    if (menuToggle) {
        var mo = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.attributeName === 'aria-expanded') {
                    var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
                    if (expanded) trapFocusInNav();
                    else releaseFocusFromNav();
                }
            });
        });
        mo.observe(menuToggle, { attributes: true });
    }

    function trapFocusInNav() {
        previouslyFocused = document.activeElement;
        // focus first focusable inside nav
        var focusables = qa(focusableSelector, mainNav);
        if (focusables.length) focusables[0].focus();
        // keydown handler to keep focus inside
        document.addEventListener('keydown', handleNavKeydown);
        // allow click on nav background to close (mobile overlay)
        mainNav.addEventListener('click', handleNavOverlayClick);
    }

    function releaseFocusFromNav() {
        document.removeEventListener('keydown', handleNavKeydown);
        mainNav.removeEventListener('click', handleNavOverlayClick);
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        previouslyFocused = null;
    }

    function handleNavKeydown(e) {
        if (e.key === 'Escape') {
            // dispatch a click on the toggle to close (inline script will update aria-expanded)
            if (menuToggle) menuToggle.click();
        } else if (e.key === 'Tab') {
            // keep focus inside nav
            var focusables = qa(focusableSelector, mainNav);
            if (!focusables.length) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    function handleNavOverlayClick(e) {
        // close when clicking on the nav backdrop area (nav itself) but not when clicking links or controls
        // nav has inner .nav-links; if click target is nav (or nav direct background), close
        if (e.target === mainNav) {
            if (menuToggle) menuToggle.click();
        }
    }

    // Smooth scrolling for in-page links
    qa('a[href^="#"]').forEach(function (a) {
        // skip empty anchors and those that don't point to sections
        var href = a.getAttribute('href');
        if (!href || href === '#' || href === '#0') return;
        a.addEventListener('click', function (ev) {
            var targetId = href.slice(1);
            var target = document.getElementById(targetId);
            if (target) {
                ev.preventDefault();
                // close mobile nav if open
                if (menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') menuToggle.click();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // update history hash without jumping
                try { history.pushState(null, '', '#' + targetId); } catch (e) { /* noop */ }
            }
        });
    });

    // Active section highlighting using IntersectionObserver
    (function () {
        var sectionIds = qa('main section[id]').map(function (s) { return s.id; });
        if (!sectionIds.length) return;

        var linkMap = {};
        navLinks.forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (href.charAt(0) === '#') linkMap[href.slice(1)] = a;
        });

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var id = entry.target.id;
                    // clear others
                    qa('.nav-links a.active').forEach(function (el) { el.classList.remove('active'); el.removeAttribute('aria-current'); });
                    var link = linkMap[id];
                    if (link) {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'true');
                    }
                }
            });
        }, { root: null, rootMargin: '0px 0px -35% 0px', threshold: 0.15 });

        sectionIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) observer.observe(el);
        });
    }());

    // Contact form: basic validation + simulated async submit
    (function () {
        var form = q('#contact-form');
        if (!form) return;

        // create an aria-live region for status messages
        var status = document.createElement('div');
        status.setAttribute('aria-live', 'polite');
        status.className = 'form-status';
        status.style.marginTop = '8px';
        status.style.fontSize = '14px';
        form.appendChild(status);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            status.textContent = '';
            var name = q('#c-name', form).value.trim();
            var email = q('#c-email', form).value.trim();
            var message = q('#c-message', form).value.trim();

            // simple client-side checks
            if (!name || !email || !message) {
                status.textContent = 'Please fill out name, email and message.';
                status.style.color = '#b53939';
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                status.textContent = 'Please provide a valid email address.';
                status.style.color = '#b53939';
                return;
            }

            // simulate sending
            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }
            status.textContent = 'Sending message...';
            status.style.color = '#04464a';

            // Replace this setTimeout block with an actual fetch to your backend when ready.
            setTimeout(function () {
                status.textContent = 'Thanks! Your message was sent — I will be in touch.';
                status.style.color = '#0a6b61';
                form.reset();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                }
            }, 900);
        });
    }());

    // Lazy-load images and add decoding attribute where missing
    (function () {
        qa('img').forEach(function (img) {
            if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        });
    }());

    // Small accessibility improvement: show outline for keyboard users only
    (function () {
        function handleFirstTab(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('user-is-tabbing');
                window.removeEventListener('keydown', handleFirstTab);
            }
        }
        window.addEventListener('keydown', handleFirstTab);
    }());

})();