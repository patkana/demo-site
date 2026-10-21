(function(){
  'use strict';
  var s = document.currentScript || (function(){var a=document.getElementsByTagName('script');return a[a.length-1];})();
  var cid = (s.getAttribute('data-client')||'').trim().toLowerCase();
  if (!cid) { console.error('[IQBot] data-client attribute is required'); return; }
  var lang = (s.getAttribute('data-lang')||'bg').toLowerCase();
  var pos = (s.getAttribute('data-position')||'right').toLowerCase();
  var accent = s.getAttribute('data-accent')||'#00e5ff';
  var accent2 = s.getAttribute('data-accent2')||'#7c4dff';
  var glass = (s.getAttribute('data-theme')||'').toLowerCase() === 'glass';
  var scene = (s.getAttribute('data-scene')||'').replace(/\/+$/,'');
  var launcher = glass ? (s.getAttribute('data-launcher')||'') : '';
  var promoSite = (s.getAttribute('data-promo-site')||'').replace(/\/+$/,'');
  var promoName = s.getAttribute('data-promo-name')||'';
  var promoPhone = (s.getAttribute('data-promo-phone')||'').replace(/[^+\d]/g,'');
  var promoViber = (s.getAttribute('data-promo-viber')||promoPhone).replace(/[^+\d]/g,'');
  var T = function(k, bg){ return window.nikoT ? window.nikoT(k, bg) : bg; };
  var attr = function(n, fb){ return s.getAttribute(n) || fb; };
  var txt = {
    title: function(){ return T('js.chat.title', attr('data-title','Как да помогна?')); },
    greeting: function(){ return T('js.chat.greeting', attr('data-greeting','Здравейте! Как да помогна днес?')); },
    placeholder: function(){ return T('js.chat.placeholder', attr('data-placeholder','Напиши въпрос...')); },
    powered: function(){ return T('js.chat.powered','Задвижвано от IQBot'); },
    status: function(){ return T('js.chat.status','Онлайн'); },
    disclaimer: function(){ return T('js.chat.disclaimer','AI асистент. Може да сбърка, важното уточни по телефона.'); },
    copy: function(){ return T('js.chat.copy','Копирай'); },
    copied: function(){ return T('js.chat.copied','Копирано'); },
    share: function(){ return T('js.chat.share','Сподели'); },
    speak: function(){ return T('js.chat.speak','Прочети на глас'); },
    retry: function(){ return T('js.chat.retry','Питай пак'); },
    mic: function(){ return T('js.chat.mic','Говори'); },
    close: function(){ return T('js.chat.close','Затвори чата'); },
    more: function(){ return T('js.chat.more','Бързи въпроси'); },
    send: function(){ return T('js.chat.send','Изпрати'); },
    chips: function(){ return T('js.chat.chips', attr('data-chips','')); },
    promo: function(){ return T('js.chat.promo', attr('data-promo','')); }
  };
  var apiBase = (s.getAttribute('data-api')||'https://iqbotbg.pro').replace(/\/+$/,'');
  var apiLocal = s.getAttribute('data-api-local');
  if (apiLocal && /^(localhost|127\.|\[::1\]|::1$)/.test(location.hostname)) apiBase = apiLocal.replace(/\/+$/,'');
  var voiceOn = (s.getAttribute('data-voice')||'').toLowerCase() === 'saratts';
  var voiceName = s.getAttribute('data-voice-name') || 'F5';
  var ttsBase = (s.getAttribute('data-tts')||apiBase).replace(/\/+$/,'');
  var ttsLocal = s.getAttribute('data-tts-local');
  if (ttsLocal && /^(localhost|127\.|\[::1\]|::1$)/.test(location.hostname)) ttsBase = ttsLocal.replace(/\/+$/,'');
  var wsUrl = (s.getAttribute('data-ws')||'').replace(/\/+$/,'');
  var wsLocal = s.getAttribute('data-ws-local');
  if (wsLocal && /^(localhost|127\.|\[::1\]|::1$)/.test(location.hostname)) wsUrl = wsLocal.replace(/\/+$/,'');
  if (!wsUrl && voiceOn && window.WebSocket) wsUrl = location.origin.replace(/^http/,'ws') + '/ws/voice';

  if (window.__IQBOT_LOADED__) return; window.__IQBOT_LOADED__ = true;

  var host = document.createElement('div');
  host.setAttribute('data-iqbot-host','1');
  host.style.cssText = 'all:initial;position:fixed;bottom:20px;'+(pos==='left'?'left':'right')+':20px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  (document.body||document.documentElement).appendChild(host);
  var root = host.attachShadow ? host.attachShadow({mode:'open'}) : host;

  var css = [
  '*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
  '.bubble{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,'+accent+','+accent2+');cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.25),0 0 24px '+accent+'40;transition:transform .25s;position:relative}',
  '.bubble:hover{transform:scale(1.08)}',
  '.bubble svg{width:30px;height:30px;stroke:#fff;fill:none}',
  '.bubble{border:1px solid rgba(255,236,190,.55)}',
  '.live{position:absolute;top:4px;right:4px;width:13px;height:13px;border-radius:50%;background:#46D37B;border:2.5px solid rgba(12,14,18,.9);box-shadow:0 0 0 0 rgba(70,211,123,.65);animation:iqlive 2.2s infinite}',
  '@keyframes iqlive{0%{box-shadow:0 0 0 0 rgba(70,211,123,.6)}70%{box-shadow:0 0 0 10px rgba(70,211,123,0)}100%{box-shadow:0 0 0 0 rgba(70,211,123,0)}}',
  '.nudge{position:absolute;bottom:6px;'+(pos==='left'?'left':'right')+':66px;display:flex;flex-direction:column;align-items:'+(pos==='left'?'flex-start':'flex-end')+';gap:3px;white-space:nowrap;padding:8px 13px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.34);box-shadow:0 8px 24px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.3);-webkit-backdrop-filter:blur(7px) saturate(1.15);backdrop-filter:blur(7px) saturate(1.15);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 10px rgba(0,0,0,.6);font-size:12.5px;letter-spacing:.02em;line-height:1.25;text-align:'+(pos==='left'?'left':'right')+';opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .45s,transform .45s}',
  '.nudge .n1{display:flex;align-items:center;gap:7px;font-weight:600;color:#fff}',
  '.nudge .n2{color:rgba(255,255,255,.82);font-size:12px;font-weight:500}',
  '.nudge.on{opacity:1;transform:translateY(0)}',
  '.nudge .nd{width:8px;height:8px;border-radius:50%;background:#fff;flex:0 0 auto;box-shadow:0 0 8px rgba(255,255,255,.8)}',
  '.bubble .pulse{position:absolute;inset:0;border-radius:50%;background:'+accent+';opacity:.4;animation:iqp 2s infinite}',
  '@keyframes iqp{0%{transform:scale(1);opacity:.4}100%{transform:scale(1.5);opacity:0}}',
  '.badge{position:absolute;top:-4px;right:-4px;background:#ff3366;color:#fff;border-radius:10px;font-size:10px;padding:2px 6px;font-weight:700}',
  '.panel{position:absolute;bottom:80px;'+(pos==='left'?'left':'right')+':0;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 25px 80px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;transform:translateY(20px) scale(.95);opacity:0;transition:all .3s cubic-bezier(.2,.9,.2,1)}',
  '.panel.open{display:flex;transform:translateY(0) scale(1);opacity:1}',
  '.header{background:linear-gradient(135deg,'+accent+','+accent2+');color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:center}',
  '.header .t{font-size:15px;font-weight:600}',
  '.header .st{font-size:11px;opacity:.85;margin-top:2px;display:flex;align-items:center;gap:6px}',
  '.header .st::before{content:"";width:6px;height:6px;background:#00ff9d;border-radius:50%;box-shadow:0 0 8px #00ff9d;animation:iqbl 1.5s infinite}',
  '@keyframes iqbl{50%{opacity:.4}}',
  '.close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .2s}',
  '.close:hover{background:rgba(255,255,255,.35)}',
  '.msgs{flex:1;overflow-y:auto;padding:18px;background:#f7f9fc;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
  '.msgs::-webkit-scrollbar{width:5px}',
  '.msgs::-webkit-scrollbar-thumb{background:#cbd5e0;border-radius:3px}',
  '.msg{max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;animation:iqin .25s;word-wrap:break-word}',
  '@keyframes iqin{from{opacity:0;transform:translateY(6px)}to{opacity:1}}',
  '.msg.u{align-self:flex-end;background:linear-gradient(135deg,'+accent+','+accent2+');color:#fff;border-bottom-right-radius:4px}',
  '.msg.b{align-self:flex-start;background:#fff;color:#1a202c;border:1px solid #e2e8f0;border-bottom-left-radius:4px}',
  '.msg.b.err{background:#fff5f5;color:#c53030;border-color:#feb2b2}',
  '.msg .tm{font-size:10px;opacity:.6;margin-top:4px}',
  '.type{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;padding:12px 16px;border-radius:14px;display:flex;gap:4px}',
  '.type span{width:6px;height:6px;background:'+accent+';border-radius:50%;animation:iqty 1.2s infinite}',
  '.type span:nth-child(2){animation-delay:.15s}',
  '.type span:nth-child(3){animation-delay:.3s}',
  '@keyframes iqty{0%,60%,100%{opacity:.3}30%{opacity:1;transform:translateY(-3px)}}',
  '.input{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#fff}',
  '.input input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;transition:border-color .2s;background:#f7f9fc;color:#1a202c}',
  '.input input:focus{border-color:'+accent+';background:#fff}',
  '.send{width:40px;height:40px;border:none;background:linear-gradient(135deg,'+accent+','+accent2+');color:#fff;border-radius:10px;cursor:pointer;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s}',
  '.send:hover{transform:scale(1.05)}',
  '.send:disabled{opacity:.4;cursor:not-allowed;transform:none}',
  '.foot{text-align:center;font-size:10px;color:#a0aec0;padding:6px 0;background:#fff;border-top:1px solid #e2e8f0}',
  '.foot a{color:#a0aec0;text-decoration:none}',
  '.foot a:hover{color:'+accent+'}',
  '@media(max-width:480px){.panel{width:calc(100vw - 20px);height:calc(100svh - 110px);height:calc(100dvh - 110px);max-height:none;bottom:80px;'+(pos==='left'?'left:10px':'right:10px')+'}.nudge{bottom:13px;'+(pos==='left'?'left:76px':'right:76px')+'}}'
  ];

  var SH = 'text-shadow:0 1px 1px rgba(0,0,0,.95),0 2px 10px rgba(0,0,0,.75),0 0 26px rgba(0,0,0,.5)';
  var INK = '#FBF6EA', GOLD = '#F7E7B4';
  if (glass) css = css.concat([
  '.panel.g{width:400px;height:660px;max-height:calc(100vh - 110px);background:#05070a;border-radius:22px;border:1px solid rgba(217,182,95,.45);box-shadow:0 30px 90px rgba(0,0,0,.6),inset 0 1px 0 rgba(247,231,180,.25);color:'+INK+'}',
  '.g,.g *{font-family:Manrope,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
  '.panel.g.full{position:fixed;left:0;right:auto;top:0;bottom:auto;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;border-radius:0;border:0;transform:none;transition:opacity .25s}',
  '.g .scene,.g .gl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
  '.g .scene{object-fit:cover;filter:brightness(.74) saturate(1.05)}',
  '.g.gpu .scene{display:none}',
  '.g>.header,.g>.msgs,.g>.dock{position:relative;z-index:1}',
  '.g .header{background:linear-gradient(180deg,rgba(6,8,11,.72),rgba(6,8,11,.42));border-bottom:1px solid rgba(217,182,95,.3);padding:10px 12px 10px 16px;padding-top:calc(env(safe-area-inset-top) + 10px);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}',
  '.g.gpu .header{background:rgba(6,8,11,.18);border-bottom-color:transparent;-webkit-backdrop-filter:none;backdrop-filter:none}',
  '.g .brand{display:flex;align-items:center;gap:11px;min-width:0}',
  '.g .ic{width:38px;height:38px;border-radius:50%;flex:0 0 auto;background:radial-gradient(circle at 35% 30%,#F7E7B4,#D9B65F 45%,#8C6B2A 80%);box-shadow:0 0 0 1px rgba(247,231,180,.6),0 4px 14px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}',
  '.g .ic svg{width:20px;height:20px;stroke:#1a1306;fill:none;stroke-width:2}',
  '.g .header .t{font-family:"Cormorant Garamond",Georgia,serif;font-size:21px;font-weight:600;color:'+GOLD+';'+SH+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.g .header .st{font-size:12.5px;opacity:1;color:'+INK+';'+SH+'}',
  '.g .header .st::before{background:#46D37B;box-shadow:0 0 8px #46D37B}',
  '.g .close{width:46px;height:46px;flex:0 0 auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff7a7a,#e0302f 55%,#9e1212);border:1px solid rgba(255,214,206,.7);box-shadow:0 6px 18px rgba(224,48,47,.5),inset 0 1px 0 rgba(255,255,255,.4)}',
  '.g .close:hover{background:radial-gradient(circle at 35% 30%,#ff8f8f,#ec3b3a 55%,#ad1616)}',
  '.g .close svg{width:18px;height:18px;stroke:#fff;stroke-width:2.8;fill:none;stroke-linecap:round;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}',
  '.g .msgs{background:transparent;padding:18px 14px 10px;gap:12px;overscroll-behavior:contain;scroll-behavior:auto}',
  '.g .msgs::-webkit-scrollbar-thumb{background:rgba(217,182,95,.4)}',
  '.g .msg{max-width:100%;font-size:16.5px;line-height:1.58;color:'+INK+';'+SH+';border-radius:18px;padding:14px 16px;letter-spacing:.005em}',
  '.g .msg.b{align-self:stretch;background:linear-gradient(160deg,rgba(9,11,15,.7),rgba(5,6,9,.78));border:1px solid rgba(217,182,95,.3);box-shadow:inset 0 1px 0 rgba(247,231,180,.14);border-bottom-left-radius:18px;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}',
  '.g .msg.u{align-self:flex-end;max-width:84%;background:linear-gradient(150deg,rgba(217,182,95,.5),rgba(140,107,42,.46));border:1px solid rgba(247,231,180,.55);border-bottom-right-radius:6px;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}',
  '.g.gpu .msg.b{background:rgba(5,6,9,.26);border-color:transparent;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}',
  '.g.gpu .msg.u{background:rgba(70,52,16,.22);border-color:transparent;-webkit-backdrop-filter:none;backdrop-filter:none}',
  '.g .msg.b.err{color:#FFD7D2;border-color:rgba(255,120,110,.5)}',
  '.g .msg .tm{display:none}',
  '.g .md strong{color:'+GOLD+';font-weight:700}',
  '.g .md p{margin:0 0 .65em}.g .md p:last-child{margin:0}',
  '.g .md ul,.g .md ol{margin:.2em 0 .7em 1.25em}.g .md li{margin:.3em 0;padding-left:.15em}',
  '.g .md li::marker{color:#D9B65F}',
  '.g .acts{display:flex;gap:2px;margin:-4px 0 2px 6px}',
  '.g .acts button{width:42px;height:42px;border:0;border-radius:12px;background:transparent;color:#EAD9A4;cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.95)) drop-shadow(0 0 8px rgba(0,0,0,.6))}',
  '.g .acts button:hover{background:rgba(217,182,95,.14)}',
  '.g .acts button.on{color:#7BE3A0}',
  '.g .acts svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
  '.g .type{background:rgba(5,6,9,.45);border:1px solid rgba(217,182,95,.3)}',
  '.g .type span{background:#D9B65F}',
  '.g .dock{padding:8px 12px 10px;padding-bottom:calc(env(safe-area-inset-bottom) + 10px)}',
  '.g .chips{display:none;flex-wrap:wrap;gap:8px;margin:0 2px 10px}',
  '.g .chips.on{display:flex}',
  '.g .chips button{min-height:44px;padding:10px 15px;border-radius:999px;background:rgba(6,8,11,.62);border:1px solid rgba(217,182,95,.5);color:'+INK+';font-size:14.5px;cursor:pointer;'+SH+';-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}',
  '.g .input{border:1px solid rgba(217,182,95,.42);border-top:1px solid rgba(217,182,95,.42);border-radius:28px;padding:6px;gap:6px;align-items:flex-end;background:linear-gradient(160deg,rgba(9,11,15,.74),rgba(5,6,9,.82));-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}',
  '.g.gpu .input{background:rgba(5,6,9,.28);border-color:transparent;-webkit-backdrop-filter:none;backdrop-filter:none}',
  '.g .input textarea{flex:1;min-width:0;resize:none;border:0;outline:none;background:transparent;color:'+INK+';font-size:16.5px;line-height:1.42;padding:11px 6px;max-height:150px;'+SH+'}',
  '.g .input textarea::placeholder{color:rgba(241,236,224,.7)}',
  '.g .input textarea{scrollbar-width:none}.g .input textarea::-webkit-scrollbar{display:none}',
  '.g .plus,.g .mic,.g .send{width:44px;height:44px;flex:0 0 auto;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center}',
  '.g .plus{background:rgba(255,255,255,.07);border:1px solid rgba(217,182,95,.4);color:'+GOLD+'}',
  '.g .plus.on{background:rgba(217,182,95,.24)}',
  '.g .mic{background:transparent;color:'+GOLD+'}',
  '.g .mic.rec{background:#e0302f;color:#fff;animation:iqrec 1.2s infinite}',
  '@keyframes iqrec{50%{box-shadow:0 0 0 8px rgba(224,48,47,.25)}}',
  '.g .send{background:linear-gradient(135deg,#F7E7B4,#D9B65F 45%,#8C6B2A);color:#140f05;font-size:0;box-shadow:0 4px 14px rgba(0,0,0,.5)}',
  '.g .send:hover{transform:none}',
  '.g .hide{display:none}',
  '.g svg.i{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
  '.g .foot{background:transparent;border:0;color:rgba(241,236,224,.78);font-size:11.5px;line-height:1.4;padding:8px 6px 0;'+SH+'}',
  '.g .foot a{color:#D9B65F}',
  '.bubble.gem{width:56px;height:56px;border:1px solid rgba(255,255,255,.7);background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.22),rgba(255,255,255,0) 46%);box-shadow:inset 0 1px 3px rgba(255,255,255,.7),inset 0 -1px 2px rgba(255,255,255,.25),0 6px 18px rgba(0,0,0,.28);-webkit-backdrop-filter:blur(1px) saturate(1.1);backdrop-filter:blur(1px) saturate(1.1);overflow:visible}',
  '.bubble.gem .pulse{display:none}',
  '.bubble.gem::before{content:"";position:absolute;left:11px;right:11px;top:3px;height:34%;border-radius:50% 50% 46% 46%/62% 62% 38% 38%;background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,0));pointer-events:none;z-index:2}',
  '.bubble.gem .gemimg{position:relative;z-index:1;width:36px;height:36px;margin-top:3px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.55)) brightness(1.1) contrast(1.05)}',
  '.bubble.gem .glint{position:absolute;z-index:3;left:32px;top:15px;width:12px;height:12px;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,1) 0,rgba(255,255,255,.8) 18%,rgba(255,255,255,0) 60%),linear-gradient(90deg,transparent 44%,rgba(255,255,255,.95) 50%,transparent 56%),linear-gradient(0deg,transparent 44%,rgba(255,255,255,.95) 50%,transparent 56%);opacity:0;animation:iqgl 3.6s infinite}',
  '@keyframes iqgl{0%,72%,100%{opacity:0;transform:scale(.4) rotate(0)}80%{opacity:1;transform:scale(1.15) rotate(45deg)}88%{opacity:0;transform:scale(.6) rotate(90deg)}}',
  '.bubble.gem .pulse{background:rgba(255,255,255,.4)}',
  '.bubble.gem:hover{transform:scale(1.06)}',
  '@media(prefers-reduced-motion:reduce){.bubble.gem .glint{animation:none}}',
  '.g .promo{margin-top:3px;font-size:11.5px;line-height:1.5;color:'+INK+';'+SH+'}',
  '.g .promo a.ps{color:'+GOLD+';font-weight:700;text-decoration:none}',
  '.g .promo .pn{color:'+GOLD+';font-weight:600;white-space:nowrap}',
  '.g .promo a.vb{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;margin:-10px -8px -10px -4px;vertical-align:middle}',
  '.g .promo a.vb svg{width:19px;height:19px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.9))}',
  '.promo{margin-top:4px}.promo a{color:inherit}.promo a.vb svg{width:16px;height:16px;vertical-align:middle}'
  ]);
  css = css.join('');

  var ICON = {
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    speak: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
    retry: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    mic: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    send: '<svg class="i" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    roof: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M6 10v9h12v-9"/></svg>',
    viber: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="#7360F2"/><path fill="#fff" d="M8.7 6.6c.4-.3 1-.2 1.3.2l1.1 1.6c.3.4.2 1-.2 1.3l-.7.5c.5 1.3 1.5 2.3 2.8 2.8l.5-.7c.3-.4.9-.5 1.3-.2l1.6 1.1c.4.3.5.9.2 1.3l-.6.9c-.5.6-1.3.8-2 .6-2.8-1-5-3.2-6-6-.2-.7 0-1.5.6-2z"/></svg>'
  };

  var promoHtml = '';
  if (promoSite || promoPhone) {
    promoHtml = '<div class="promo"><span class="pt">'+esc(txt.promo())+'</span> '
      + (promoSite ? '<a class="ps" href="'+esc(promoSite)+'/?from='+encodeURIComponent(cid)+'" target="_blank" rel="noopener">'+esc(promoSite.replace(/^https?:\/\//,''))+'</a>' : '')
      + (promoName ? ' <span class="pn">'+esc(promoName)+'</span>' : '')
      + (promoViber ? '<a class="vb" href="viber://chat?number='+encodeURIComponent(promoViber)+'" title="Viber" aria-label="Viber '+esc(promoName)+'">'+ICON.viber+'</a>' : '')
      + '</div>';
  }
  var head = glass
    ? '<div class="header" data-glass="clear"><div class="brand"><span class="ic">'+ICON.roof+'</span><div style="min-width:0"><div class="t">'+esc(txt.title())+'</div><div class="st">'+esc(txt.status())+'</div></div></div>'
      + '<button class="close" aria-label="'+esc(txt.close())+'">'+ICON.close+'</button></div>'
    : '<div class="header"><div><div class="t">'+esc(txt.title())+'</div><div class="st">online</div></div><button class="close" aria-label="Close">×</button></div>';
  var dock = glass
    ? '<div class="dock"><div class="chips"></div>'
      + '<div class="input" data-glass="frost"><button class="plus" aria-label="'+esc(txt.more())+'" aria-expanded="false">'+ICON.plus+'</button>'
      + '<textarea rows="1" maxlength="500" placeholder="'+esc(txt.placeholder())+'"></textarea>'
      + '<button class="mic hide" aria-label="'+esc(txt.mic())+'">'+ICON.mic+'</button>'
      + '<button class="send" aria-label="'+esc(txt.send())+'">'+ICON.send+'</button></div>'
      + '<div class="foot"><span class="dis">'+esc(txt.disclaimer())+'</span>'+(promoHtml || ' <a href="https://iqbotbg.pro" target="_blank" rel="noopener">'+esc(txt.powered())+'</a>')+'</div></div>'
    : '<div class="input"><input type="text" placeholder="'+esc(txt.placeholder())+'" maxlength="500"><button class="send" aria-label="Send">▸</button></div>'
      + '<div class="foot"><a href="https://iqbotbg.pro" target="_blank" rel="noopener">'+esc(txt.powered())+' ⚡</a></div>';

  var html = '<style>'+css+'</style>'
    + '<div class="nudge" aria-hidden="true"><span class="n1"><span class="nd"></span><span class="nt"></span></span><span class="n2"></span></div>'
    + '<div class="bubble'+(launcher?' gem':'')+'" role="button" aria-label="Open chat">'
    +   '<div class="pulse"></div>'
    +   (launcher ? '<img class="gemimg" src="'+esc(launcher)+'" alt="" width="48" height="48" decoding="async"><span class="glint"></span>' : '')
    +   '<svg'+(launcher?' style="display:none"':'')+' viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">'
    +     '<path d="M27 6H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v5l6-5h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/>'
    +     '<path d="M9.5 17.5 16 11.5l6.5 6"/>'
    +   '</svg>'
    +   '<span class="live"></span>'
    + '</div>'
    + '<div class="panel'+(glass?' g':'')+'" role="dialog" aria-modal="'+(glass?'true':'false')+'" aria-label="Chat">'
    +   (glass ? '<video class="scene" muted loop playsinline preload="none" aria-hidden="true"></video><canvas class="gl" aria-hidden="true"></canvas>' : '')
    +   head
    +   '<div class="msgs" role="log" aria-live="polite"></div>'
    +   dock
    + '</div>';

  if (root.innerHTML !== undefined) { root.innerHTML = html; }
  else { root.appendChild(document.createElement('div')).outerHTML = html; }

  var bubble = root.querySelector('.bubble');
  var panel = root.querySelector('.panel');
  var msgs = root.querySelector('.msgs');
  var input = root.querySelector('.input textarea') || root.querySelector('.input input');
  var send = root.querySelector('.send');
  var close = root.querySelector('.close');
  var mic = root.querySelector('.mic');
  var plus = root.querySelector('.plus');
  var chipsBox = root.querySelector('.chips');
  var sceneVid = root.querySelector('.scene');
  var canvas = root.querySelector('.gl');
  var opened = false, pushed = false, lastAsk = '', savedOverflow = '';
  var turns = [], voiceTurn = false, player = null, speakJob = 0, speakCtl = null, speakBtn = null;

  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function time(){ var d=new Date(),p=function(n){return String(n).padStart(2,'0');}; return p(d.getHours())+':'+p(d.getMinutes()); }

  function inline(t){ return esc(t).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>'); }
  function md(text){
    var out = [], list = null;
    var flush = function(){ if (list) { out.push('</'+list+'>'); list = null; } };
    String(text).replace(/\r/g,'').split(/\n/).forEach(function(line){
      var l = line.trim(), m;
      if (!l) { flush(); return; }
      if ((m = l.match(/^[-*•]\s+(.*)$/))) { if (list !== 'ul') { flush(); out.push('<ul>'); list = 'ul'; } out.push('<li>'+inline(m[1])+'</li>'); return; }
      if ((m = l.match(/^\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { flush(); out.push('<ol>'); list = 'ol'; } out.push('<li>'+inline(m[1])+'</li>'); return; }
      flush(); out.push('<p>'+inline(l)+'</p>');
    });
    flush();
    return out.join('');
  }

  var phone = function(){ return !!(window.matchMedia && matchMedia('(max-width: 760px)').matches); };
  var langTag = function(){ var a = activeLang(); return a === 'en' ? 'en-US' : a === 'de' ? 'de-DE' : 'bg-BG'; };

  function act(icon, label, fn){
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = ICON[icon];
    b.addEventListener('click', function(){ fn(b); });
    return b;
  }

  function actions(text){
    var row = document.createElement('div');
    row.className = 'acts';
    row.appendChild(act('copy', txt.copy(), function(b){
      var done = function(){ b.classList.add('on'); b.innerHTML = ICON.ok; b.setAttribute('aria-label', txt.copied()); setTimeout(function(){ b.classList.remove('on'); b.innerHTML = ICON.copy; b.setAttribute('aria-label', txt.copy()); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function(){});
    }));
    row.appendChild(act('share', txt.share(), function(){
      if (navigator.share) navigator.share({ text: text, title: txt.title(), url: location.href }).catch(function(){});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + '\n' + location.href).catch(function(){});
    }));
    if (voiceOn || (window.speechSynthesis && window.SpeechSynthesisUtterance)) {
      row._speak = act('speak', txt.speak(), function(b){
        if (speakBtn === b) { stopSpeech(); return; }
        unlockAudio();
        speak(text, b);
      });
      row.appendChild(row._speak);
    }
    row.appendChild(act('retry', txt.retry(), function(){ if (lastAsk) ask(lastAsk, true); }));
    return row;
  }

  function scrollEnd(){ msgs.scrollTop = msgs.scrollHeight; }

  function silentWav(){
    var n = 441, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    var w = function(o, str){ for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0,'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8,'WAVE'); w(12,'fmt ');
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
    v.setUint32(24,44100,true); v.setUint32(28,88200,true); v.setUint16(32,2,true); v.setUint16(34,16,true);
    w(36,'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }

  function unlockAudio(){
    if (!voiceOn || player) return;
    player = new Audio();
    player.preload = 'auto';
    player.src = silentWav();
    var r = player.play(); if (r && r.catch) r.catch(function(){});
  }

  function speakDone(job){
    if (job !== speakJob) return;
    if (speakBtn) speakBtn.innerHTML = ICON.speak;
    speakBtn = null; speakCtl = null;
  }

  function stopSpeech(){
    if (wsJob === speakJob && sock && sock.readyState === 1) { try { sock.send('{"t":"stop"}'); } catch (e) {} }
    wsJob = -1;
    speakJob++;
    if (speakCtl) { try { speakCtl.abort(); } catch (e) {} speakCtl = null; }
    if (player) { player.onended = player.onerror = null; try { player.pause(); } catch (e) {} }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (speakBtn) speakBtn.innerHTML = ICON.speak;
    speakBtn = null;
  }

  function browserSpeak(text, job){
    if (job !== speakJob) return;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return speakDone(job);
    var u = new SpeechSynthesisUtterance(String(text).replace(/\*\*/g,''));
    u.lang = langTag();
    u.onend = u.onerror = function(){ speakDone(job); };
    speechSynthesis.speak(u);
  }

  function speak(text, btn){
    stopSpeech();
    var job = speakJob;
    speakBtn = btn || null;
    if (speakBtn) speakBtn.innerHTML = ICON.stop;
    if (!voiceOn || activeLang() !== 'bg' || !player || !window.fetch || !window.AbortController) return browserSpeak(text, job);
    var ctl = speakCtl = new AbortController(), total = 1;
    var part = function(i){
      return fetch(ttsBase + '/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ text: text, part: i, voice: voiceName })
      }).then(function(r){
        if (!r.ok) throw new Error('tts ' + r.status);
        total = parseInt(r.headers.get('X-TTS-Parts'), 10) || 1;
        return r.blob();
      });
    };
    var play = function(i, pending){
      pending.then(function(blob){
        if (job !== speakJob) return;
        var next = i + 1 < total ? part(i + 1) : null;
        if (next) next.catch(function(){});
        var url = URL.createObjectURL(blob);
        var after = function(){ URL.revokeObjectURL(url); if (job !== speakJob) return; if (next) play(i + 1, next); else speakDone(job); };
        player.onended = after;
        player.onerror = after;
        player.src = url;
        var r = player.play(); if (r && r.catch) r.catch(function(){ if (job === speakJob) { stopSpeech(); } });
      }).catch(function(e){
        if (job !== speakJob || (e && e.name === 'AbortError')) return;
        if (i === 0) browserSpeak(text, job); else speakDone(job);
      });
    };
    play(0, part(0));
  }

  function addMsg(text, who, isErr, withActs){
    var div = document.createElement('div');
    div.className = 'msg '+who+(isErr?' err':'');
    if (glass) div.setAttribute('data-glass', who === 'u' ? 'gold' : 'frost');
    var t = document.createElement('div');
    if (glass && who === 'b') { t.className = 'md'; t.innerHTML = md(text); }
    else t.textContent = text;
    div.appendChild(t);
    var tm = document.createElement('div');
    tm.className='tm'; tm.textContent = time();
    div.appendChild(tm);
    msgs.appendChild(div);
    if (glass && who === 'b' && withActs && !isErr) { var row = actions(text); t._speak = row._speak; msgs.appendChild(row); }
    scrollEnd();
    return t;
  }

  function typing(on){
    var t = root.getElementById ? root.getElementById('iq-typing') : root.querySelector('#iq-typing');
    if (on && !t){
      t = document.createElement('div');
      t.id='iq-typing'; t.className='type';
      t.innerHTML='<span></span><span></span><span></span>';
      msgs.appendChild(t);
      scrollEnd();
    } else if (!on && t){ t.remove(); }
  }

  function fit(){
    if (!opened || !panel.classList.contains('full') || !window.visualViewport) return;
    var vv = window.visualViewport;
    panel.style.height = Math.floor(vv.height) + 'px';
    panel.style.transform = 'translateY(' + Math.floor(vv.offsetTop) + 'px)';
  }

  function glassEvent(on){
    if (!glass) return false;
    var detail = { root: root, panel: panel, canvas: canvas, open: on, claimed: false };
    dispatchEvent(new CustomEvent('iqbot:glass', { detail: detail }));
    return detail.claimed;
  }

  function startScene(){
    if (!sceneVid || !scene || panel.classList.contains('gpu')) return;
    var src = scene + (panel.clientHeight > panel.clientWidth * 1.15 ? '-phone' : '-desk');
    if (sceneVid.getAttribute('data-src') !== src) {
      sceneVid.setAttribute('data-src', src);
      sceneVid.poster = src + '.webp';
      if (!(navigator.connection && navigator.connection.saveData)) { sceneVid.preload = 'auto'; sceneVid.src = src + '.mp4'; }
    }
    var r = sceneVid.play && sceneVid.src ? sceneVid.play() : null; if (r && r.catch) r.catch(function(){});
  }

  function open(){
    if (opened) return;
    opened = true;
    hideNudge();
    if (glass && phone()) {
      panel.classList.add('full');
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      try { history.pushState({ iqchat: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    }
    panel.classList.add('open');
    if (!glassEvent(true)) startScene();
    fit();
    if (!msgs.children.length) greetNode = addMsg(txt.greeting(), 'b');
    if (!phone()) setTimeout(function(){ input.focus(); }, 300);
  }
  function shut(fromPop){
    if (!opened) return;
    opened = false;
    panel.classList.remove('open');
    if (panel.classList.contains('full')) {
      panel.classList.remove('full');
      panel.style.height = ''; panel.style.transform = '';
      document.documentElement.style.overflow = savedOverflow;
      if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) {} }
      pushed = false;
    }
    glassEvent(false);
    if (sceneVid && sceneVid.pause) sceneVid.pause();
    stopSpeech();
    if (rec) try { rec.abort(); } catch (e) {}
    showNudge();
  }

  var nudge = root.querySelector('.nudge');
  var nudgeText = root.querySelector('.nt');
  var quiet = false;
  function showNudge(){ if (nudge) nudge.classList.toggle('on', !opened && document.documentElement.classList.contains('hero-summer')); }
  function hideNudge(){ if (nudge) nudge.classList.remove('on'); }
  (function(){ var tick = 0; addEventListener('scroll', function(){ if (tick) return; tick = requestAnimationFrame(function(){ tick = 0; showNudge(); }); }, { passive: true }); setInterval(showNudge, 1500); })();
  var NUDGE = { bg: ['Питай на глас или с текст, 24/7', 'нашият AI помощник'], en: ['Ask by voice or text, 24/7', 'our AI assistant'], de: ['Frag per Sprache oder Text, 24/7', 'unser KI-Assistent'] };
  var nudge2 = root.querySelector('.n2');
  function activeLang(){ return (document.documentElement.lang || lang || 'bg').slice(0,2); }
  function nudgeLang(){ return NUDGE[activeLang()] || NUDGE.bg; }
  var greetNode = null;
  function chips(){
    if (!chipsBox) return;
    chipsBox.innerHTML = '';
    txt.chips().split('|').map(function(c){ return c.trim(); }).filter(Boolean).forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c;
      b.addEventListener('click', function(){ toggleChips(false); ask(c); });
      chipsBox.appendChild(b);
    });
    if (plus) plus.classList.toggle('hide', !chipsBox.children.length);
  }
  function syncLang(){
    var h = root.querySelector('.header .t'); if (h) h.textContent = txt.title();
    var st = glass && root.querySelector('.header .st'); if (st) st.textContent = txt.status();
    if (input) input.placeholder = txt.placeholder();
    var f = root.querySelector('.foot > a'); if (f) f.textContent = txt.powered() + (glass ? '' : ' ⚡');
    var pt = root.querySelector('.promo .pt'); if (pt) pt.textContent = txt.promo();
    var d = root.querySelector('.foot .dis'); if (d) d.textContent = txt.disclaimer();
    if (close && glass) close.setAttribute('aria-label', txt.close());
    if (nudgeText) nudgeText.textContent = nudgeLang()[0];
    if (nudge2) nudge2.textContent = nudgeLang()[1];
    if (greetNode) greetNode.textContent = txt.greeting();
    chips();
  }
  syncLang();
  addEventListener('langchange', syncLang);
  setTimeout(showNudge, 700);
  if (window.matchMedia && matchMedia('(max-width:480px)').matches) {
    var calm = function(){};
    setTimeout(calm, 6700);
    addEventListener('scroll', function once(){ if (scrollY > 120) { calm(); removeEventListener('scroll', once); } }, { passive: true });
  }
  bubble.addEventListener('click', function(){ opened ? shut() : open(); });
  close.addEventListener('click', function(){ shut(); });
  addEventListener('popstate', function(){ if (opened && panel.classList.contains('full')) shut(true); });
  addEventListener('keydown', function(e){ if (e.key === 'Escape' && opened) shut(); });
  if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }

  function toggleChips(on){
    if (!chipsBox) return;
    var v = on === undefined ? !chipsBox.classList.contains('on') : on;
    chipsBox.classList.toggle('on', v);
    if (plus) { plus.classList.toggle('on', v); plus.setAttribute('aria-expanded', String(v)); }
  }
  if (plus) plus.addEventListener('click', function(){ toggleChips(); });

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  function toolState(){
    if (!glass) return;
    var has = !!input.value.trim();
    send.classList.toggle('hide', !has && !!SR && !rec);
    if (mic) mic.classList.toggle('hide', has || !SR);
  }
  if (mic && SR) {
    mic.addEventListener('click', function(){
      if (rec) { try { rec.stop(); } catch (e) {} return; }
      stopSpeech();
      unlockAudio();
      rec = new SR();
      rec.lang = langTag(); rec.interimResults = true; rec.continuous = false;
      var base = input.value ? input.value.replace(/\s*$/, ' ') : '';
      var heard = false, ended = false;
      rec.onresult = function(ev){
        var t = '';
        for (var i = 0; i < ev.results.length; i++) { t += ev.results[i][0].transcript; if (ev.results[i].isFinal) heard = true; }
        input.value = base + t; grow();
      };
      var finish = function(ok){
        if (ended) return;
        ended = true;
        mic.classList.remove('rec'); rec = null; toolState();
        if (ok && voiceOn && heard && input.value.trim()) { voiceTurn = true; sendMsg(); }
      };
      rec.onerror = function(){ finish(false); };
      rec.onend = function(){ finish(true); };
      mic.classList.add('rec');
      try { rec.start(); } catch (e) { mic.classList.remove('rec'); rec = null; }
    });
  }
  function grow(){
    if (!glass) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    toolState();
  }
  if (glass) { input.addEventListener('input', grow); toolState(); }

  var sock = null, sockReady = null, wsTurn = 0, wsJob = -1;
  function wsOpen(){
    if (sock && sock.readyState === 1) return Promise.resolve(sock);
    if (sockReady) return sockReady;
    sockReady = new Promise(function(res, rej){
      var w;
      try { w = new WebSocket(wsUrl); } catch (e) { sockReady = null; return rej(e); }
      w.binaryType = 'arraybuffer';
      var to = setTimeout(function(){ try { w.close(); } catch (e) {} rej(new Error('ws timeout')); }, 4000);
      w.onopen = function(){ clearTimeout(to); sock = w; sockReady = null; res(w); };
      w.onerror = function(){ clearTimeout(to); sockReady = null; rej(new Error('ws error')); };
      w.onclose = function(){ if (sock === w) sock = null; sockReady = null; };
    });
    return sockReady;
  }
  function askWs(payload, text, spoken, mark){
    var my = ++wsTurn;
    return wsOpen().then(function(w){
      return new Promise(function(res, rej){
        var node = null, body = null, acc = '', queue = [], playing = false, finished = false, job = 0, gotAudio = false;
        var fail = function(e){ if (my !== wsTurn) return; w.onmessage = null; rej(e || new Error('ws')); };
        var playNext = function(){
          if (job !== speakJob || !queue.length) { playing = false; if (!queue.length && finished && job === speakJob) speakDone(job); return; }
          playing = true;
          var blob = queue.shift(), url = URL.createObjectURL(blob);
          var after = function(){ URL.revokeObjectURL(url); playNext(); };
          player.onended = after; player.onerror = after; player.src = url;
          var r = player.play(); if (r && r.catch) r.catch(function(){ if (job === speakJob) stopSpeech(); });
        };
        w.onmessage = function(ev){
          if (my !== wsTurn) return;
          if (ev.data instanceof ArrayBuffer) {
            if (!spoken || !opened) return;
            if (!gotAudio) { if (mark !== speakJob) return; gotAudio = true; stopSpeech(); job = speakJob; wsJob = job; if (node && node._speak) { speakBtn = node._speak; speakBtn.innerHTML = ICON.stop; } }
            if (job !== speakJob) return;
            queue.push(new Blob([ev.data], { type: 'audio/mpeg' }));
            if (!playing) playNext();
            return;
          }
          var d; try { d = JSON.parse(ev.data); } catch (e) { return; }
          if (d.t === 'text') {
            if (!node) { typing(false); node = addMsg('', 'b', false, false); body = node; }
            acc += d.d;
            body.textContent = acc;
            scrollEnd();
          } else if (d.t === 'done') {
            w.onmessage = null;
            finished = true;
            var reply = d.reply || acc;
            if (!node) { typing(false); node = addMsg('', 'b', false, false); body = node; }
            if (glass) { body.className = 'md'; body.innerHTML = md(reply); } else body.textContent = reply;
            if (glass && !node._speak) { var row = actions(reply); node._speak = row._speak; msgs.appendChild(row); if (gotAudio && job === speakJob) { speakBtn = row._speak; speakBtn.innerHTML = ICON.stop; } }
            scrollEnd();
            if (gotAudio && !playing && !queue.length && job === speakJob) speakDone(job);
            res({ reply: reply, spokenByWs: gotAudio });
          } else if (d.t === 'error') {
            fail(new Error(d.e || 'ws error'));
          }
        };
        w.onclose = function(){ sock = null; if (!finished) fail(new Error('ws closed')); };
        try { w.send(JSON.stringify(payload)); } catch (e) { fail(e); }
      });
    });
  }

  function ask(text, again){
    text = String(text || '').trim();
    if (!text) return;
    lastAsk = text;
    var spoken = voiceTurn; voiceTurn = false;
    if (again && turns.length >= 2 && turns[turns.length - 2].text === text) turns.splice(-2, 2);
    var past = turns.slice(-6);
    if (!again) addMsg(text, 'u');
    stopSpeech();
    var mark = speakJob;
    send.disabled = true;
    typing(true);
    var payload = { restaurant_id: cid, message: text, lang: activeLang(), history: past };
    if (spoken) payload.voice = true;
    if (wsUrl && window.WebSocket && player) {
      payload.voice_name = voiceName;
      askWs(payload, text, spoken, mark).then(function(j){
        turns.push({ role: 'user', text: text }, { role: 'bot', text: j.reply });
        if (turns.length > 12) turns.splice(0, turns.length - 12);
        send.disabled = false;
      }).catch(function(){
        if (wsTurn && sock) { try { sock.close(); } catch (e) {} }
        askHttp(payload, text, spoken, mark);
      });
      return;
    }
    askHttp(payload, text, spoken, mark);
  }

  function askHttp(payload, text, spoken, mark){
    fetch(apiBase + '/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })
    .then(function(r){ return r.json(); })
    .then(function(j){
      typing(false);
      if (j && j.reply) {
        turns.push({ role: 'user', text: text }, { role: 'bot', text: j.reply });
        if (turns.length > 12) turns.splice(0, turns.length - 12);
        var node = addMsg(j.reply, 'b', false, true);
        if (spoken && opened && mark === speakJob) speak(j.reply, node && node._speak);
      }
      else if (j && j.error) addMsg(j.error, 'b', true);
      else addMsg(T('js.chat.error','Техническа грешка, опитай пак.'), 'b', true);
    })
    .catch(function(){
      typing(false);
      addMsg(lang==='en'?'Connection error, please try again.':T('js.chat.neterror','Грешка при връзка, опитай пак.'), 'b', true);
    })
    .finally(function(){ send.disabled = false; if (!phone()) input.focus(); });
  }

  function sendMsg(){
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    grow();
    toggleChips(false);
    ask(text);
  }

  send.addEventListener('click', sendMsg);
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey && !(glass && phone())) { e.preventDefault(); sendMsg(); }
  });
})();
