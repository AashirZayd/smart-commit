/**
 * Smart Commit Landing Page Vanilla JavaScript
 * Lightweight, zero dependencies, accessible.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Toggle
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

  // Copy to Clipboard Utility
  function copyTextToClipboard(text, triggerBtn, successText = "Copied!") {
    if (!navigator.clipboard) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showCopyFeedback(triggerBtn, successText);
      } catch (err) {
        console.error("Copy failed", err);
      }
      document.body.removeChild(textarea);
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => showCopyFeedback(triggerBtn, successText),
      (err) => console.error("Clipboard write error:", err)
    );
  }

  function showCopyFeedback(btn, feedbackText) {
    const originalHtml = btn.innerHTML;
    const originalText = btn.querySelector(".copy-text");

    if (originalText) {
      originalText.textContent = feedbackText;
      btn.style.color = "var(--color-green)";
      setTimeout(() => {
        originalText.textContent = "Copy";
        btn.style.color = "";
      }, 2000);
    } else {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 2000);
    }
  }

  // Hero Terminal Copy
  const heroCopyBtn = document.getElementById("heroCopyBtn");
  if (heroCopyBtn) {
    heroCopyBtn.addEventListener("click", () => {
      const commands = "git add src/auth/login.js\nsmart-commit";
      copyTextToClipboard(commands, heroCopyBtn);
    });
  }

  // Code Box Copy Buttons
  const copyButtons = document.querySelectorAll(".code-copy-btn");
  copyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const textToCopy = btn.getAttribute("data-copy");
      if (textToCopy) {
        copyTextToClipboard(textToCopy, btn);
      }
    });
  });
});
