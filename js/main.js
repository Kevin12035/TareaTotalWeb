(function () {
  'use strict';

  var BANKS = {
    pichincha: {
      name: 'Banco Pichincha',
      channels: 'Transferencia · Mi Vecino',
      type: 'Cuenta de Ahorros',
      number: '2207617983',
      holder: 'Kevin Navarrete',
      id: '1206685032'
    },
    guayaquil: {
      name: 'Banco Guayaquil',
      channels: 'Transferencia · Banco del Barrio',
      type: 'Cuenta de Ahorros',
      number: '0043406944',
      holder: 'Kevin Navarrete',
      id: '1206685032'
    }
  };

  var $ = function (id) { return document.getElementById(id); };

  // Navbar
  var nav = $('nav');
  var toggle = $('navToggle');
  var menu = $('navMenu');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  toggle.addEventListener('click', function () {
    setMenu(!menu.classList.contains('is-open'));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  window.addEventListener('scroll', function () {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  // Animaciones al hacer scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Modal de bancos
  var modal = $('bankModal');
  var copyBtn = $('bankCopy');

  document.querySelectorAll('[data-bank]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.bank;
      var bank = BANKS[key];
      $('bankTitle').textContent = bank.name;
      $('bankChannels').textContent = bank.channels;
      $('bankType').textContent = bank.type;
      $('bankNumber').textContent = bank.number;
      $('bankHolder').textContent = bank.holder;
      $('bankId').textContent = bank.id;
      $('bankLogo').className = 'pay-card__logo pay-card__logo--' + key;
      copyBtn.dataset.copy = bank.number;
      resetCopy(copyBtn);
      modal.showModal();
    });
  });

  modal.addEventListener('click', function (e) {
    // clic fuera del contenido (sobre el backdrop) o en el botón de cerrar
    if (e.target === modal || e.target.closest('[data-close]')) modal.close();
  });

  // Copiar al portapapeles
  function resetCopy(btn) {
    btn.querySelector('span').textContent = btn.dataset.label;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      (modal.open ? modal : document.body).appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      ok ? resolve() : reject();
    });
  }

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var label = btn.querySelector('span');
      copyText(btn.dataset.copy).then(function () {
        label.textContent = '¡Copiado!';
      }, function () {
        label.textContent = 'No se pudo copiar';
      });
      setTimeout(function () { resetCopy(btn); }, 2000);
    });
  });

  $('year').textContent = new Date().getFullYear();
})();
