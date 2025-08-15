// Vitrine helpers: persistence + admin reset
(function(){
  // --- Persistence hook for setRoom ---
  function hookSetRoom(){
    if (typeof window.setRoom !== 'function' || window.setRoom.__wrapped) return;
    const __orig = window.setRoom;
    function wrapped(room){
      try {
        var saved = localStorage.getItem('nomSalle');
        if (saved) {
          room = saved; // verrouille sur la valeur déjà enregistrée
        } else if (room) {
          localStorage.setItem('nomSalle', room); // 1er enregistrement
        }
      } catch(e){ /* ignore */ }
      return __orig.call(this, room);
    }
    wrapped.__wrapped = true;
    window.setRoom = wrapped;
  }

  // Hook au plus tôt
  hookSetRoom();
  // Et à nouveau après chargement (si setRoom défini plus tard)
  document.addEventListener('DOMContentLoaded', hookSetRoom);

  // Auto-restore au chargement
  document.addEventListener('DOMContentLoaded', function(){
    try{
      var savedRoom = localStorage.getItem('nomSalle');
      if (savedRoom && typeof window.setRoom === 'function') {
        window.setRoom(savedRoom);
      }
    }catch(e){}
  });

  // --- Admin overlay ---
  var ADMIN_CODE = 'adminsav';
  function ensureOverlayStyles() {
    if (document.getElementById('admin-reset-styles')) return;
    var st = document.createElement('style');
    st.id = 'admin-reset-styles';
    st.textContent = [
      '.admin-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.45);z-index:9999;}',
      '.admin-modal{background:#fff;max-width:480px;width:92%;border-radius:14px;',
      'box-shadow:0 20px 60px rgba(0,0,0,.25);padding:20px 20px 16px;',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}',
      '[data-theme="dark"] .admin-modal{background:#1f2937;color:#e5e7eb;}',
      '.admin-title{font-size:18px;font-weight:700;margin:0 0 6px;}',
      '.admin-sub{font-size:13px;color:#6b7280;margin:0 0 14px;}',
      '[data-theme="dark"] .admin-sub{color:#9ca3af;}',
      '.admin-input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;',
      'font-size:15px;background:#fff;color:#111827;outline:none;}',
      '[data-theme="dark"] .admin-input{background:#111827;color:#e5e7eb;border-color:#374151;}',
      '.admin-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;}',
      '.admin-btn{padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;cursor:pointer;font-weight:600;}',
      '.admin-btn.primary{background:#3b82f6;border-color:#2563eb;color:#fff;}',
      '.admin-error{color:#dc2626;font-size:13px;margin-top:8px;display:none;}'
    ].join('');
    document.head.appendChild(st);
  }

  function showAdminPrompt() {
    ensureOverlayStyles();
    var ov = document.createElement('div');
    ov.className = 'admin-overlay';
    ov.innerHTML = ''
      + '<div class="admin-modal">'
      + '  <h3 class="admin-title">Accès administrateur</h3>'
      + '  <p class="admin-sub">Entrez le mot de passe pour réinitialiser la salle sur ce poste.</p>'
      + '  <input type="password" class="admin-input" id="admin-pass" placeholder="Mot de passe">'
      + '  <div class="admin-error" id="admin-error">Mot de passe incorrect.</div>'
      + '  <div class="admin-actions">'
      + '    <button class="admin-btn" id="admin-cancel">Annuler</button>'
      + '    <button class="admin-btn primary" id="admin-ok">Valider</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(ov);

    var input = ov.querySelector('#admin-pass');
    var err = ov.querySelector('#admin-error');
    var cancel = ov.querySelector('#admin-cancel');
    var ok = ov.querySelector('#admin-ok');

    function close() { ov.remove(); }
    function submit() {
      var v = input.value || '';
      if (v === ADMIN_CODE) {
        try { localStorage.removeItem('nomSalle'); } catch(e) {}
        location.reload();
      } else {
        err.style.display = 'block';
        input.select(); input.focus();
      }
    }

    cancel.addEventListener('click', close);
    ok.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') close();
    });
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    setTimeout(function(){ input.focus(); }, 50);
  }

  // --- Secret shortcuts ---
  // A) MAJ + F8 (Shift+F8). Attention : si DevTools est ouvert, F8 est intercepté.
  document.addEventListener('keydown', function(e){
    if (e.shiftKey && e.key === 'F8') {
      e.preventDefault(); e.stopPropagation();
      showAdminPrompt();
    }
  }, true);

  // B) Fallback : Ctrl+Shift+S (utile si DevTools est ouvert)
  document.addEventListener('keydown', function(e){
    if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); e.stopPropagation();
      showAdminPrompt();
    }
  }, true);

  // C) Fallback souris : 5 clics en haut-gauche (80x80) dans 2s
  (function(){
    var cornerClicks = 0, timer = null;
    document.addEventListener('click', function(e){
      if (e.clientX < 80 && e.clientY < 80) {
        cornerClicks++;
        if (cornerClicks === 1) {
          timer = setTimeout(function(){ cornerClicks = 0; }, 2000);
        }
        if (cornerClicks >= 5) {
          cornerClicks = 0;
          if (timer) { clearTimeout(timer); timer = null; }
          showAdminPrompt();
        }
      }
    }, true);
  })();
})();
