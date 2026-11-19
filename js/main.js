(() => {
  "use strict";

  const navbar = document.querySelector(".navbar");
  const siteHeader = document.querySelector(".site-header");
  const navigation = document.querySelector("#mainNavigation");
  const navigationLinks = [...document.querySelectorAll(".nav-link")];
  const sections = [...document.querySelectorAll("main section[id]")];
  const revealElements = [...document.querySelectorAll(".reveal")];
  const yearElement = document.querySelector("#currentYear");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  const setScrolledNavigation = () => {
    const isScrolled = window.scrollY > 24;
    navbar.classList.toggle("scrolled", isScrolled);
    siteHeader.classList.toggle("is-scrolled", isScrolled);
  };

  const setActiveNavigation = (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navigationLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  };

  const closeMobileNavigation = () => {
    if (window.innerWidth < 992 && navigation.classList.contains("show")) {
      bootstrap.Collapse.getOrCreateInstance(navigation).hide();
    }
  };

  const initializeRevealAnimations = () => {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach((element) => revealObserver.observe(element));
  };

  const updateCursorGlow = (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    root.style.setProperty("--cursor-x", `${event.clientX}px`);
    root.style.setProperty("--cursor-y", `${event.clientY}px`);
    root.style.setProperty("--cursor-glow", "0.28");
  };

  const hideCursorGlow = () => {
    root.style.setProperty("--cursor-glow", "0");
  };

  window.addEventListener("scroll", setScrolledNavigation, { passive: true });
  window.addEventListener("pointermove", updateCursorGlow, { passive: true });
  window.addEventListener("blur", hideCursorGlow);
  navigationLinks.forEach((link) => link.addEventListener("click", closeMobileNavigation));
  setScrolledNavigation();

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(setActiveNavigation, {
      rootMargin: "-30% 0px -60% 0px",
      threshold: 0
    });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  initializeRevealAnimations();
  yearElement.textContent = new Date().getFullYear();
})();
