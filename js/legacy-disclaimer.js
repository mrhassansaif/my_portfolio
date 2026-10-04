(function () {
  "use strict";

  var NEW_PORTFOLIO_URL = "https://hassansaif.vercel.app/";

  var STORAGE_KEY = "legacyPortfolioFlow";
  var FIRST_COUNTDOWN_SECONDS = 20;
  var STAY_BACKGROUND_MS = 15000;
  var TOAST_VISIBLE_MS = 4500;
  var ANIM_MS = 280;

  var timers = {
    countdown: null,
    stay: null,
    toast: null,
    closeAnim: null
  };

  var previouslyFocused = null;
  var activeDialog = null;
  var flowLocked = false;

  function getNavType() {
    try {
      var entries = performance.getEntriesByType("navigation");
      if (entries && entries.length && entries[0].type) {
        return entries[0].type;
      }
    } catch (e) {}

    if (performance.navigation) {
      if (performance.navigation.type === 1) return "reload";
      if (performance.navigation.type === 2) return "back_forward";
    }

    return "navigate";
  }

  function readState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function clearTimer(name) {
    if (timers[name] !== null) {
      clearTimeout(timers[name]);
      clearInterval(timers[name]);
      timers[name] = null;
    }
  }

  function clearAllTimers() {
    clearTimer("countdown");
    clearTimer("stay");
    clearTimer("toast");
    clearTimer("closeAnim");
  }

  function goToNewPortfolio() {
    if (flowLocked) return;
    flowLocked = true;
    clearAllTimers();
    window.location.href = NEW_PORTFOLIO_URL;
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function trapFocus(event) {
    if (!activeDialog || event.key !== "Tab") return;

    var focusable = getFocusable(activeDialog);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openBackdrop(backdrop, dialog) {
    previouslyFocused = document.activeElement;
    activeDialog = dialog;
    document.body.classList.add("legacy-modal-open");
    backdrop.classList.remove("is-closing");
    backdrop.classList.add("is-open");
    document.addEventListener("keydown", trapFocus);

    var focusable = getFocusable(dialog);
    if (focusable.length) {
      focusable[0].focus();
    } else {
      dialog.focus();
    }
  }

  function closeBackdrop(backdrop, onDone) {
    backdrop.classList.add("is-closing");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("legacy-modal-open");
    document.removeEventListener("keydown", trapFocus);
    activeDialog = null;

    clearTimer("closeAnim");
    timers.closeAnim = setTimeout(function () {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
      if (typeof onDone === "function") onDone();
    }, ANIM_MS);
  }

  function buildModalShell(labelledById) {
    var backdrop = createEl("div", "legacy-backdrop");
    backdrop.setAttribute("data-legacy-backdrop", "true");

    var dialog = createEl("div", "legacy-modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", labelledById);
    dialog.setAttribute("tabindex", "-1");

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    return { backdrop: backdrop, dialog: dialog };
  }

  function showFirstModal() {
    writeState({ phase: "first" });

    var shell = buildModalShell("legacy-modal-title-1");
    var dialog = shell.dialog;
    var backdrop = shell.backdrop;

    dialog.appendChild(createEl("p", "legacy-modal__eyebrow", "Archival notice"));
    dialog.appendChild(
      createEl("h2", "legacy-modal__title", "You're viewing Hassan Saif's legacy portfolio")
    ).id = "legacy-modal-title-1";

    dialog.appendChild(
      createEl(
        "p",
        "legacy-modal__body",
        "This is an archived version of Hassan's earlier portfolio and is preserved for reference. Hassan's current portfolio contains his latest work, technologies, projects, and professional profile."
      )
    );

    dialog.appendChild(
      createEl("p", "legacy-modal__redirect-note", "Redirecting to the latest portfolio in 20 seconds...")
    );

    var countdownWrap = createEl("div", "legacy-countdown");
    countdownWrap.setAttribute("aria-live", "polite");
    countdownWrap.setAttribute("aria-atomic", "true");
    var countdownEl = createEl("span", "legacy-countdown__number", String(FIRST_COUNTDOWN_SECONDS));
    countdownWrap.appendChild(countdownEl);
    dialog.appendChild(countdownWrap);

    var actions = createEl("div", "legacy-modal__actions");
    var stayBtn = createEl(
      "button",
      "legacy-btn legacy-btn--secondary",
      "No, I want to explore Hassan's legacy portfolio"
    );
    stayBtn.type = "button";
    actions.appendChild(stayBtn);
    dialog.appendChild(actions);

    var secondsLeft = FIRST_COUNTDOWN_SECONDS;
    var stayChosen = false;

    function tickCountdown() {
      if (stayChosen || flowLocked) {
        clearTimer("countdown");
        return;
      }

      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearTimer("countdown");
        goToNewPortfolio();
        return;
      }

      countdownEl.classList.add("is-swap");
      setTimeout(function () {
        if (stayChosen || flowLocked) return;
        countdownEl.textContent = String(secondsLeft);
        countdownEl.classList.remove("is-swap");
      }, 120);
    }

    stayBtn.addEventListener("click", function () {
      if (stayChosen || flowLocked) return;
      stayChosen = true;
      clearTimer("countdown");
      closeBackdrop(backdrop, function () {
        beginStayPhase();
      });
    });

    openBackdrop(backdrop, dialog);
    clearTimer("countdown");
    timers.countdown = setInterval(tickCountdown, 1000);
  }

  function beginStayPhase() {
    writeState({
      phase: "staying",
      stayStartedAt: Date.now()
    });
    scheduleSecondModal(STAY_BACKGROUND_MS);
  }

  function scheduleSecondModal(delayMs) {
    clearTimer("stay");
    var wait = Math.max(0, delayMs);
    timers.stay = setTimeout(function () {
      timers.stay = null;
      showSecondModal();
    }, wait);
  }

  function resumeStayPhase(state) {
    var started = typeof state.stayStartedAt === "number" ? state.stayStartedAt : Date.now();
    var elapsed = Date.now() - started;
    var remaining = STAY_BACKGROUND_MS - elapsed;

    if (remaining <= 0) {
      showSecondModal();
    } else {
      scheduleSecondModal(remaining);
    }
  }

  function showSecondModal() {
    writeState({ phase: "second" });

    var shell = buildModalShell("legacy-modal-title-2");
    var dialog = shell.dialog;
    var backdrop = shell.backdrop;

    dialog.appendChild(createEl("p", "legacy-modal__eyebrow", "Still here?"));
    dialog.appendChild(
      createEl("h2", "legacy-modal__title", "Still exploring the legacy build?")
    ).id = "legacy-modal-title-2";

    dialog.appendChild(
      createEl(
        "p",
        "legacy-modal__body",
        "The current portfolio contains Hassan's latest work, projects, technologies, and professional direction."
      )
    );

    dialog.appendChild(
      createEl("p", "legacy-modal__redirect-note", "Ready to see the latest version?")
    );

    var actions = createEl("div", "legacy-modal__actions");

    var yesBtn = createEl(
      "button",
      "legacy-btn legacy-btn--primary",
      "Yes, take me to the latest portfolio"
    );
    yesBtn.type = "button";

    var noBtn = createEl(
      "button",
      "legacy-btn legacy-btn--secondary",
      "No, I'm enjoying the archive"
    );
    noBtn.type = "button";

    actions.appendChild(yesBtn);
    actions.appendChild(noBtn);
    dialog.appendChild(actions);

    yesBtn.addEventListener("click", function () {
      goToNewPortfolio();
    });

    noBtn.addEventListener("click", function () {
      clearAllTimers();
      writeState({ phase: "cleared" });
      closeBackdrop(backdrop, function () {
        showArchiveToast();
      });
    });

    openBackdrop(backdrop, dialog);
  }

  function showArchiveToast() {
    var existing = document.querySelector("[data-legacy-toast]");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var toast = createEl("div", "legacy-toast");
    toast.setAttribute("data-legacy-toast", "true");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    toast.appendChild(
      createEl("p", "legacy-toast__title", "Okay, okay. Fair enough. Have it your way. \uD83D\uDE04")
    );
    toast.appendChild(
      createEl("p", "legacy-toast__body", "You're officially cleared to explore the archive.")
    );

    document.body.appendChild(toast);

    setTimeout(function () {
      toast.classList.add("is-visible");
    }, 20);

    clearTimer("toast");
    timers.toast = setTimeout(function () {
      toast.classList.remove("is-visible");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, ANIM_MS);
    }, TOAST_VISIBLE_MS);
  }

  function init() {
    var navType = getNavType();

    if (navType === "reload") {
      clearState();
      clearAllTimers();
    }

    var state = readState();

    if (!state || !state.phase) {
      showFirstModal();
      return;
    }

    if (state.phase === "cleared") {
      return;
    }

    if (state.phase === "staying") {
      resumeStayPhase(state);
      return;
    }

    if (state.phase === "second") {
      showSecondModal();
      return;
    }

    if (state.phase === "first") {
      showFirstModal();
      return;
    }

    showFirstModal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
