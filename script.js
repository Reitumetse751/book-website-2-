/* ================================================================
   The Book Nook - script.js
   Vanilla JavaScript, no frameworks. Loaded with "defer" on every page.

   Sections
   0. Settings
   1. Helpers
   2. Site-wide: menu, scroll reveal, back to top, toast, modal
   3. Shopping cart (header button + cart window)
   4. Products page: search, sort, add to cart
   5. Lightbox (book covers)
   6. FAQ accordion
   7. Form validation (shared)
   8. Enquiry form (AJAX + response)
   9. Contact form (compiled into an email) + open/closed status
  10. Interactive map (Leaflet)
   ================================================================ */
(function () {
  "use strict";

  /* ---------- 0. SETTINGS ---------- */
  var SETTINGS = {
    recipientEmail: "info@thebooknook.co.za",                 // contact form emails go here
    ajaxEndpoint: "https://jsonplaceholder.typicode.com/posts", // free test API for the AJAX demo
    cartKey: "booknook-cart",
    timezone: "Africa/Johannesburg",
    mapLat: -33.9249,                                         // Long Street, Cape Town
    mapLng: 18.4241
  };

  document.documentElement.classList.add("js");

  /* ---------- 1. HELPERS ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return "R" + Number(n).toLocaleString("en-ZA"); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }   // textContent is safe against HTML injection
    return e;
  }

  /* ---------- 2. SITE-WIDE ---------- */
  function initMenu() {
    var toggle = $(".menu-toggle");
    var list = $("nav ul");
    if (!toggle || !list) { return; }
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    var icon = $("i", toggle);

    function setOpen(open) {
      list.classList.toggle("show", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (icon) { icon.className = open ? "fas fa-times" : "fas fa-bars"; }
    }
    toggle.addEventListener("click", function () { setOpen(!list.classList.contains("show")); });
    toggle.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!list.classList.contains("show")); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && list.classList.contains("show")) { setOpen(false); toggle.focus(); }
    });
    $all("a", list).forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
  }

  function initReveal() {
    var items = $all(".hero-content, .category-card, .value-card, .team-card, .product-card, .story-layout, .detail-item, .form-section form, .contact-form form");
    items.forEach(function (i) { i.classList.add("reveal"); });
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (i) { i.classList.add("visible"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    items.forEach(function (i) { obs.observe(i); });
  }

  function initBackToTop() {
    var b = el("button", "back-to-top", "\u2191");
    b.type = "button";
    b.setAttribute("aria-label", "Back to top");
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(b);
    window.addEventListener("scroll", function () { b.classList.toggle("show", window.scrollY > 500); }, { passive: true });
  }

  var toastTimer;
  function showToast(msg) {
    var t = $(".toast");
    if (!t) {
      t = el("div", "toast");
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2500);
  }

  // Generic modal window (used by the cart). Returns {body, close}.
  function openModal(title) {
    var opener = document.activeElement;
    var overlay = el("div", "modal-overlay");
    var box = el("div", "modal-box");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", title);
    var head = el("div", "modal-head");
    head.appendChild(el("h3", "", title));
    var x = el("button", "modal-close", "\u00d7");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    head.appendChild(x);
    var body = el("div", "modal-body");
    box.appendChild(head); box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    x.focus();

    function close() {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      document.body.style.overflow = "";
      if (opener && opener.focus) { opener.focus(); }
    }
    function onKey(e) { if (e.key === "Escape") { close(); } }
    document.addEventListener("keydown", onKey);
    x.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { close(); } });
    return { body: body, close: close };
  }

  /* ---------- 3. SHOPPING CART ---------- */
  var cart = [];                       // [{title, author, price, qty}]
  try { cart = JSON.parse(localStorage.getItem(SETTINGS.cartKey)) || []; } catch (e) { cart = []; }
  if (!Array.isArray(cart)) { cart = []; }

  function saveCart() { try { localStorage.setItem(SETTINGS.cartKey, JSON.stringify(cart)); } catch (e) { /* storage blocked: cart still works on this page */ } }
  function cartCount() { return cart.reduce(function (n, i) { return n + i.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (n, i) { return n + i.qty * i.price; }, 0); }
  function updateBadge() {
    var b = $(".cart-count");
    if (b) { b.textContent = cartCount(); b.classList.toggle("has-items", cartCount() > 0); }
  }

  function addToCart(item) {
    var found = cart.filter(function (c) { return c.title === item.title; })[0];
    if (found) { found.qty += 1; } else { cart.push({ title: item.title, author: item.author, price: item.price, qty: 1 }); }
    saveCart(); updateBadge();
    showToast("Added \u201c" + item.title + "\u201d to your cart");
  }

  function initCart() {
    var bar = $("header .container");
    if (!bar) { return; }
    var btn = el("button", "cart-btn");
    btn.type = "button";
    btn.setAttribute("aria-label", "Open cart");
    var ic = el("i", "fas fa-shopping-cart"); ic.setAttribute("aria-hidden", "true");
    btn.appendChild(ic);
    btn.appendChild(el("span", "cart-count", "0"));
    var toggle = $(".menu-toggle", bar);
    bar.insertBefore(btn, toggle || null);
    btn.addEventListener("click", showCart);
    updateBadge();
  }

  function showCart() {
    var m = openModal("Your cart");
    function draw() {
      m.body.textContent = "";
      if (!cart.length) {
        m.body.appendChild(el("p", "", "Your cart is empty. Browse our books on the Products page."));
        return;
      }
      cart.forEach(function (item, idx) {
        var row = el("div", "cart-row");
        var info = el("div", "cart-info");
        info.appendChild(el("strong", "", item.title));
        info.appendChild(el("span", "", item.author + " \u00b7 " + money(item.price)));
        row.appendChild(info);

        var qty = el("div", "cart-qty");
        var minus = el("button", "", "\u2212"); minus.type = "button"; minus.setAttribute("aria-label", "One less " + item.title);
        var num = el("span", "", String(item.qty));
        var plus = el("button", "", "+"); plus.type = "button"; plus.setAttribute("aria-label", "One more " + item.title);
        qty.appendChild(minus); qty.appendChild(num); qty.appendChild(plus);
        row.appendChild(qty);

        var sub = el("span", "cart-sub", money(item.price * item.qty));
        row.appendChild(sub);

        minus.addEventListener("click", function () {
          item.qty -= 1;
          if (item.qty <= 0) { cart.splice(idx, 1); }
          saveCart(); updateBadge(); draw();
        });
        plus.addEventListener("click", function () { item.qty += 1; saveCart(); updateBadge(); draw(); });
        m.body.appendChild(row);
      });
      m.body.appendChild(el("p", "cart-total", "Total: " + money(cartTotal())));
      var actions = el("div", "cart-actions");
      var clear = el("button", "btn-secondary", "Clear cart"); clear.type = "button";
      clear.addEventListener("click", function () { cart = []; saveCart(); updateBadge(); draw(); });
      var go = el("a", "btn-primary", "Send order enquiry"); go.href = "enquiry.html?order=1";
      actions.appendChild(clear); actions.appendChild(go);
      m.body.appendChild(actions);
    }
    draw();
  }

  /* ---------- 4. PRODUCTS PAGE ---------- */
  function initProducts() {
    var grid = $(".product-grid");
    if (!grid) { return; }
    var cards = $all(".product-card", grid);

    // read the data from the cards that are already in the HTML
    cards.forEach(function (c, i) {
      var title = $("h3", c).textContent.trim();
      var author = $(".author", c) ? $(".author", c).textContent.trim() : "";
      var price = parseInt(($(".price", c).textContent.match(/\d+/) || ["0"])[0], 10);
      c._data = { title: title, author: author, price: price, order: i };
    });

    // build the search / sort bar with JavaScript
    var tools = el("div", "product-tools");
    var sLabel = el("label", "visually-hidden", "Search books"); sLabel.setAttribute("for", "book-search");
    var search = el("input"); search.type = "search"; search.id = "book-search"; search.placeholder = "Search by title or author"; search.autocomplete = "off";
    var oLabel = el("label", "visually-hidden", "Sort books"); oLabel.setAttribute("for", "book-sort");
    var sort = el("select"); sort.id = "book-sort";
    [["default", "Sort: featured"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["title", "Title: A to Z"], ["author", "Author: A to Z"]].forEach(function (o) {
      var op = el("option", "", o[1]); op.value = o[0]; sort.appendChild(op);
    });
    var count = el("p", "result-count"); count.setAttribute("aria-live", "polite");
    [sLabel, search, oLabel, sort].forEach(function (n) { tools.appendChild(n); });
    grid.parentNode.insertBefore(tools, grid);
    grid.parentNode.insertBefore(count, grid);

    var empty = el("p", "empty-state", "No books match your search. Try another title or author.");
    empty.style.display = "none";
    grid.parentNode.appendChild(empty);

    function render() {
      var q = search.value.trim().toLowerCase();
      var shown = cards.filter(function (c) {
        var ok = !q || (c._data.title + " " + c._data.author).toLowerCase().indexOf(q) !== -1;
        c.style.display = ok ? "" : "none";
        return ok;
      });
      shown.sort(function (a, b) {
        var x = a._data, y = b._data;
        switch (sort.value) {
          case "price-asc":  return x.price - y.price;
          case "price-desc": return y.price - x.price;
          case "title":      return x.title.localeCompare(y.title);
          case "author":     return x.author.localeCompare(y.author);
          default:           return x.order - y.order;
        }
      });
      shown.forEach(function (c) { grid.appendChild(c); });      // re-order on the page
      empty.style.display = shown.length ? "none" : "";
      count.textContent = shown.length + (shown.length === 1 ? " book" : " books") + " shown";
    }
    search.addEventListener("input", render);
    sort.addEventListener("change", render);
    render();

    // "Add to Cart" buttons
    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".btn-secondary");
      if (!btn) { return; }
      e.preventDefault();
      addToCart(btn.closest(".product-card")._data);
    });
  }

  /* ---------- 5. LIGHTBOX (book covers) ---------- */
  function initLightbox() {
    var imgs = $all(".product-card img");
    if (!imgs.length) { return; }
    var box = el("div", "lightbox");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Book cover viewer");
    var pic = el("img");
    var cap = el("p", "lightbox-caption");
    var close = el("button", "lb-close", "\u00d7"); close.type = "button"; close.setAttribute("aria-label", "Close image");
    var prev = el("button", "lb-prev", "\u2039");   prev.type = "button"; prev.setAttribute("aria-label", "Previous book");
    var next = el("button", "lb-next", "\u203a");   next.type = "button"; next.setAttribute("aria-label", "Next book");
    [close, prev, next, pic, cap].forEach(function (n) { box.appendChild(n); });
    document.body.appendChild(box);

    var group = [], index = 0, opener = null;
    function show(i) {
      index = (i + group.length) % group.length;
      var im = group[index], d = im.closest(".product-card")._data;
      pic.src = im.src; pic.alt = im.alt;
      cap.textContent = d.title + " by " + d.author + " - " + money(d.price);
    }
    function open(im) {
      opener = im;
      group = imgs.filter(function (i) { return i.closest(".product-card").style.display !== "none"; });
      show(group.indexOf(im));
      box.classList.add("open");
      document.body.style.overflow = "hidden";
      close.focus();
    }
    function shut() {
      box.classList.remove("open");
      document.body.style.overflow = "";
      if (opener) { opener.focus(); }
    }
    imgs.forEach(function (im) {
      im.classList.add("zoomable");
      im.setAttribute("tabindex", "0");
      im.setAttribute("role", "button");
      im.setAttribute("aria-label", "View larger cover: " + im.alt);
      im.addEventListener("click", function () { open(im); });
      im.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(im); } });
    });
    close.addEventListener("click", shut);
    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) { shut(); } });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("open")) { return; }
      if (e.key === "Escape") { shut(); }
      if (e.key === "ArrowLeft") { show(index - 1); }
      if (e.key === "ArrowRight") { show(index + 1); }
      if (e.key === "Tab") {                      // keep keyboard focus inside the viewer
        var f = [close, prev, next], first = f[0], last = f[2];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- 6. ACCORDION ---------- */
  function initAccordion() {
    $all(".accordion").forEach(function (acc) {
      var triggers = $all(".accordion-trigger", acc);
      triggers.forEach(function (t) {
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.style.maxHeight = "0px";
        t.addEventListener("click", function () {
          var isOpen = t.getAttribute("aria-expanded") === "true";
          triggers.forEach(function (o) {         // only one answer open at a time
            o.setAttribute("aria-expanded", "false");
            document.getElementById(o.getAttribute("aria-controls")).style.maxHeight = "0px";
          });
          if (!isOpen) {
            t.setAttribute("aria-expanded", "true");
            panel.style.maxHeight = panel.scrollHeight + "px";
          }
        });
      });
    });
  }

  /* ---------- 7. FORM VALIDATION (shared) ---------- */
  var PHONE_RE = /^(\+27|0)[1-9][0-9]{8}$/;      // South African numbers (spaces and dashes removed first)
  var NAME_RE = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F '\-]{1,59}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Give each field its rules and an error message area (no extra HTML needed)
  function prepareForm(form, rules) {
    Object.keys(rules).forEach(function (id) {
      var f = document.getElementById(id);
      if (!f) { return; }
      var r = rules[id];
      f.setAttribute("data-label", r.label);
      if (r.rule) { f.setAttribute("data-rule", r.rule); }
      if (r.min) { f.setAttribute("minlength", r.min); }
      if (r.max) { f.setAttribute("maxlength", r.max); }
      var err = el("span", "error-msg"); err.id = id + "-error"; err.setAttribute("role", "alert");
      f.parentNode.appendChild(err);
      if (r.counter) {
        var c = el("span", "char-count"); c.id = id + "-count";
        f.parentNode.insertBefore(c, err);
        var upd = function () { c.textContent = f.value.length + " / " + r.max; };
        f.addEventListener("input", upd); upd();
      }
      f.addEventListener("blur", function () { checkField(f); });
      f.addEventListener("input", function () { if (f.classList.contains("invalid")) { checkField(f); } });
    });
    var summary = el("div", "form-error-summary"); summary.setAttribute("role", "alert");
    form.insertBefore(summary, form.firstChild);
    var hp = el("div", "hp-field"); hp.setAttribute("aria-hidden", "true");   // honeypot: bots fill it, people never see it
    var hpIn = el("input"); hpIn.type = "text"; hpIn.name = "website"; hpIn.tabIndex = -1; hpIn.autocomplete = "off";
    hp.appendChild(hpIn); form.appendChild(hp);
    return hpIn;
  }

  function fieldError(f) {
    var v = f.value.trim();
    var label = f.getAttribute("data-label") || "This field";
    if (f.required && !v) { return label + " is required."; }
    if (!v) { return ""; }
    switch (f.getAttribute("data-rule")) {
      case "name":
        if (!NAME_RE.test(v)) { return "Use letters only (2 to 60 characters)."; }
        break;
      case "email":
        if (!EMAIL_RE.test(v)) { return "Enter a valid email address, e.g. name@example.com."; }
        break;
      case "phone":
        if (!PHONE_RE.test(v.replace(/[\s\-()]/g, ""))) { return "Enter a valid South African number, e.g. 021 123 4567 or +27 82 123 4567."; }
        break;
      case "date":
        var d = new Date(v), today = new Date(); today.setHours(0, 0, 0, 0);
        if (isNaN(d) || d < today) { return "Choose today or a future date."; }
        break;
    }
    var min = Number(f.getAttribute("minlength")), max = Number(f.getAttribute("maxlength"));
    if (min && v.length < min) { return "Please write at least " + min + " characters (now " + v.length + ")."; }
    if (max && v.length > max) { return "Please keep it under " + max + " characters."; }
    return "";
  }

  function checkField(f) {
    var box = document.getElementById(f.id + "-error");
    var msg = fieldError(f);
    f.classList.toggle("invalid", !!msg);
    f.classList.toggle("valid", !msg && !!f.value.trim());
    f.setAttribute("aria-invalid", msg ? "true" : "false");
    if (box) { box.textContent = msg; }
    return !msg;
  }

  function validateForm(form) {
    var fields = $all("input[data-label], select[data-label], textarea[data-label]", form);
    var firstBad = null;
    fields.forEach(function (f) { if (!checkField(f) && !firstBad) { firstBad = f; } });
    var s = $(".form-error-summary", form);
    s.textContent = firstBad ? "Please fix the highlighted fields and try again." : "";
    s.classList.toggle("show", !!firstBad);
    if (firstBad) { firstBad.focus(); }
    return !firstBad;
  }

  // AJAX: send the data in the background, the page does not reload
  function sendAjax(data) {
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, 10000);
    return fetch(SETTINGS.ajaxEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) { throw new Error("Server answered " + res.status); }
      return res.json();
    }).then(function (json) { return "BN-" + String(json.id || Date.now().toString(36)).toUpperCase(); });
  }

  /* ---------- 8. ENQUIRY FORM ---------- */
  var SUBJECT_REPLIES = {
    "book-club": "A team member will confirm the next book club meeting and how to join.",
    "author-event": "We will check our events calendar and confirm whether your preferred date is available.",
    "reading-session": "We will confirm the children's reading session times and spaces.",
    "general": "Thank you for getting in touch. We will answer your question as soon as we can.",
    "product": "We will check stock for the books you mention and reply with availability."
  };

  function initEnquiry() {
    var form = $("form.enquiry-form");
    if (!form) { return; }
    var honey = prepareForm(form, {
      "name":    { label: "Your name", rule: "name", min: 2, max: 60 },
      "email":   { label: "Your email", rule: "email" },
      "phone":   { label: "Phone number", rule: "phone" },
      "subject": { label: "Subject" },
      "preferred-date": { label: "Preferred date", rule: "date" },
      "message": { label: "Message", min: 10, max: 500, counter: true }
    });
    var dateEl = $("#preferred-date");
    var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    dateEl.min = t.toISOString().slice(0, 10);

    // coming from the cart: fill in the order for the visitor
    if (new URLSearchParams(location.search).get("order") && cart.length) {
      $("#subject").value = "product";
      $("#message").value = "I would like to order:\n" + cart.map(function (i) { return i.qty + " x " + i.title + " (" + money(i.price) + ")"; }).join("\n") + "\nTotal: " + money(cartTotal());
      $("#message").dispatchEvent(new Event("input"));
    }

    var panel = el("section", "result-panel"); panel.setAttribute("aria-live", "polite");
    form.parentNode.appendChild(panel);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      panel.classList.remove("show");
      if (honey.value) { return; }
      if (!validateForm(form)) { return; }
      var data = {
        name: $("#name").value.trim(), email: $("#email").value.trim(), phone: $("#phone").value.trim(),
        subject: $("#subject").value, preferredDate: dateEl.value, message: $("#message").value.trim()
      };
      var btn = $("button[type=submit]", form), label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending...";

      sendAjax(data).then(function (ref) {
        var subj = $("#subject");
        showReply(panel, data, ref, subj.options[subj.selectedIndex].text);
        form.reset();
        $all(".valid, .invalid", form).forEach(function (f) { f.classList.remove("valid", "invalid"); });
        $("#message-count").textContent = "0 / 500";
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }).catch(function () {
        var s = $(".form-error-summary", form);
        s.textContent = "We could not send your enquiry (check your connection). Your answers are still here, please try again.";
        s.classList.add("show");
      }).then(function () { btn.disabled = false; btn.textContent = label; });
    });
  }

  function showReply(panel, d, ref, subjectText) {
    panel.textContent = "";
    panel.appendChild(el("h3", "", "Thank you, " + d.name.split(" ")[0] + "!"));
    panel.appendChild(el("p", "", "Your enquiry was sent. Your reference number is " + ref + "."));
    var list = el("ul", "reply-list");
    [["Subject", subjectText],
     ["What happens next", SUBJECT_REPLIES[d.subject] || SUBJECT_REPLIES.general],
     ["Preferred date", d.preferredDate || "Not given"],
     ["We will reply to", d.email + " (Mon-Fri 9:00-18:00, Sat-Sun 10:00-16:00)"]].forEach(function (r) {
      var li = el("li"); li.appendChild(el("strong", "", r[0] + ": ")); li.appendChild(document.createTextNode(r[1])); list.appendChild(li);
    });
    panel.appendChild(list);
    panel.classList.add("show");
  }

  /* ---------- 9. CONTACT FORM + OPEN STATUS ---------- */
  function initContact() {
    var form = $(".contact-form form");
    if (!form) { return; }
    var honey = prepareForm(form, {
      "name":    { label: "Your name", rule: "name", min: 2, max: 60 },
      "email":   { label: "Your email", rule: "email" },
      "subject": { label: "Subject", min: 3, max: 80 },
      "message": { label: "Message", min: 10, max: 1000, counter: true }
    });

    var panel = el("section", "result-panel"); panel.setAttribute("aria-live", "polite");
    panel.appendChild(el("h3", "", "Your email is ready"));
    panel.appendChild(el("p", "", "Check the text below, then open it in your email app or copy it."));
    var body = el("textarea"); body.readOnly = true; body.setAttribute("aria-label", "Email text");
    var row = el("div", "cart-actions");
    var open = el("a", "btn-primary", "Open in my email app"); open.href = "#";
    var copy = el("button", "btn-secondary", "Copy email text"); copy.type = "button";
    row.appendChild(open); row.appendChild(copy);
    var note = el("p", "form-note"); note.setAttribute("role", "status");
    [body, row, note].forEach(function (n) { panel.appendChild(n); });
    form.parentNode.appendChild(panel);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (honey.value) { return; }
      if (!validateForm(form)) { return; }
      var subject = "[The Book Nook website] " + $("#subject").value.trim();
      var main = "Name: " + $("#name").value.trim() + "\nEmail: " + $("#email").value.trim() + "\n\n" + $("#message").value.trim();
      body.value = "To: " + SETTINGS.recipientEmail + "\nSubject: " + subject + "\n\n" + main;
      open.href = "mailto:" + SETTINGS.recipientEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(main);
      note.textContent = "";
      panel.classList.add("show");
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    copy.addEventListener("click", function () {
      body.select();
      var done = function () { note.textContent = "Email text copied."; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body.value).then(done, function () { document.execCommand("copy"); done(); });
      } else { document.execCommand("copy"); done(); }
    });

    showOpenStatus();
  }

  // "Open now / Closed now" using the opening hours on the page (Mon-Fri 9-6, Sat-Sun 10-4)
  function showOpenStatus() {
    var heads = $all(".detail-item h3").filter(function (h) { return /business hours/i.test(h.textContent); });
    if (!heads.length) { return; }
    var parts = new Intl.DateTimeFormat("en-US", { timeZone: SETTINGS.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    var get = function (type) { return parts.filter(function (p) { return p.type === type; })[0].value; };
    var weekend = get("weekday") === "Sat" || get("weekday") === "Sun";
    var mins = (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10);
    var from = (weekend ? 10 : 9) * 60, to = (weekend ? 16 : 18) * 60;
    var isOpen = mins >= from && mins < to;
    var tag = el("p", "open-status " + (isOpen ? "is-open" : "is-closed"), isOpen ? "We are open right now" : "We are closed right now");
    heads[0].parentNode.appendChild(tag);
  }

  /* ---------- 10. INTERACTIVE MAP (Leaflet + OpenStreetMap) ---------- */
  function initMap() {
    var holder = $(".map-placeholder");
    if (!holder || typeof window.L === "undefined") { return; }   // if Leaflet cannot load, the original box stays
    var map = el("div"); map.id = "map";
    map.setAttribute("role", "region");
    map.setAttribute("aria-label", "Map showing The Book Nook on Long Street, Cape Town");
    holder.parentNode.replaceChild(map, holder);
    var m = L.map("map", { scrollWheelZoom: false }).setView([SETTINGS.mapLat, SETTINGS.mapLng], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
    L.marker([SETTINGS.mapLat, SETTINGS.mapLng]).addTo(m)
      .bindPopup("<strong>The Book Nook</strong><br>45 Long Street, Cape Town")
      .openPopup();
  }

  /* ---------- START ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initCart();
    initProducts();
    initLightbox();
    initAccordion();
    initEnquiry();
    initContact();
    initMap();
    initReveal();
    initBackToTop();
  });
})();
