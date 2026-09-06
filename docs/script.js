/**
 * Smart Commit Landing Page Script
 * Retro-Tech Early-2000s Developer Software Aesthetic
 * Vanilla JS, lightweight, zero dependencies, accessible.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Navigation Toggle ---
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isExpanded));
      navMenu.classList.toggle("active");
    });

    // Close menu when clicking any nav link
    const navLinks = navMenu.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.setAttribute("aria-expanded", "false");
        navMenu.classList.remove("active");
      });
    });
  }

  // --- Copy to Clipboard Utility ---
  function copyTextToClipboard(text, triggerBtn, successText = "COPIED!") {
    if (!navigator.clipboard) {
      // Fallback for non-secure contexts or older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        showCopyFeedback(triggerBtn, successText);
      } catch (err) {
        console.error("Smart Commit: Copy fallback failed", err);
      }
      document.body.removeChild(textarea);
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => showCopyFeedback(triggerBtn, successText),
      (err) => console.error("Smart Commit: Clipboard write error:", err)
    );
  }

  function showCopyFeedback(btn, feedbackText) {
    if (!btn) return;

    const originalHtml = btn.innerHTML;
    const btnTextSpan = btn.querySelector(".btn-text");

    btn.classList.add("copied");

    if (btnTextSpan) {
      const originalText = btnTextSpan.textContent;
      btnTextSpan.textContent = `✔ ${feedbackText}`;
      setTimeout(() => {
        btnTextSpan.textContent = originalText;
        btn.classList.remove("copied");
      }, 2000);
    } else {
      btn.textContent = `✔ ${feedbackText}`;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.classList.remove("copied");
      }, 2000);
    }
  }

  // --- Attach Copy Listeners to All Data-Copy Buttons ---
  const copyElements = document.querySelectorAll("[data-copy]");
  copyElements.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const text = el.getAttribute("data-copy");
      if (text) {
        copyTextToClipboard(text, el);
      }
    });
  });

  // --- Retro Window Buttons Interaction (Playful Micro-Interactions) ---
  const winClose = document.querySelector(".win-btn-close");
  const winMin = document.querySelector(".win-btn-min");
  const winMax = document.querySelector(".win-btn-max");
  const heroTerminal = document.getElementById("heroTerminal");

  if (winMin && heroTerminal) {
    winMin.addEventListener("click", () => {
      if (heroTerminal.style.display === "none") {
        heroTerminal.style.display = "block";
      } else {
        heroTerminal.style.display = "none";
      }
    });
  }

  if (winMax && heroTerminal) {
    winMax.addEventListener("click", () => {
      if (heroTerminal.style.maxHeight === "none") {
        heroTerminal.style.maxHeight = "";
      } else {
        heroTerminal.style.maxHeight = "none";
      }
    });
  }

  if (winClose && heroTerminal) {
    winClose.addEventListener("click", () => {
      const originalContent = heroTerminal.innerHTML;
      heroTerminal.innerHTML = `
        <div class="terminal-line"><span class="t-orange">[!] Process terminated by user signal (SIGTERM).</span></div>
        <div class="terminal-line"><span class="t-dim">Session closed. Click here to restart terminal session...</span></div>
      `;
      heroTerminal.style.cursor = "pointer";
      const restartHandler = () => {
        heroTerminal.innerHTML = originalContent;
        heroTerminal.style.cursor = "default";
        heroTerminal.removeEventListener("click", restartHandler);
      };
      heroTerminal.addEventListener("click", restartHandler);
    });
  }
});
