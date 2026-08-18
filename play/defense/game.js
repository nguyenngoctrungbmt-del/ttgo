(function(){
  const canvas = document.getElementById('def-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  const waveNode = document.getElementById('def-wave');
  const enemiesNode = document.getElementById('def-enemies');
  const moneyNode = document.getElementById('def-money');
  const hpNode = document.getElementById('def-hp');
  const startBtn = document.getElementById('def-start');
  const shopEl = document.getElementById('def-shop');

  const BALANCE = {
    spawnIntervalMs: 1150,
    bulletTtl: 320,
    bulletSpeed: 8,
    waveCount: (w) => Math.min(24, 5 + Math.floor(w * 2.5)),
    specialMinWave: 2,
    bossMinWave: 5
  };

  let wave = 1, enemiesLeft = 0, money = 0, goldMultiplier = 1;
  let turret = {
    x: cx, y: cy, hp: 100, maxHp: 100,
    damage: 26, bulletPower: 1, atkSpeed: 1.6, range: 185, bulletSize: 7,
    crit: 0.12, pierce: 0, explosion: false, double: false
  };
  let bullets = [], enemies = [], lastShot = 0, lastTime = 0, spawning = false;
  let particles = [], rings = [], audioCtx = null;
  const shopLevels = {};

  const SHOP = [
    { id:'damage', emoji:'⚔️', label:'Damage +20%', baseCost:25, costScale:1.35, apply:()=>{ turret.damage *= 1.2; }},
    { id:'bulletpwr', emoji:'🔋', label:'Bullet Power +25%', baseCost:30, costScale:1.4, apply:()=>{ turret.bulletPower *= 1.25; }},
    { id:'atkspd', emoji:'⚡', label:'Atk Speed +15%', baseCost:28, costScale:1.38, apply:()=>{ turret.atkSpeed *= 1.15; }},
    { id:'range', emoji:'🎯', label:'Range +15%', baseCost:22, costScale:1.3, apply:()=>{ turret.range *= 1.15; }},
    { id:'bulletsz', emoji:'💥', label:'Bullet Size +', baseCost:20, costScale:1.25, apply:()=>{ turret.bulletSize += 3; }},
    { id:'crit', emoji:'🔥', label:'Critical +10%', baseCost:35, costScale:1.45, apply:()=>{ turret.crit += 0.10; }},
    { id:'pierce', emoji:'🌀', label:'Pierce +1', baseCost:40, costScale:1.5, apply:()=>{ turret.pierce += 1; }},
    { id:'hp', emoji:'❤️', label:'Turret +20 HP', baseCost:30, costScale:1.35, apply:()=>{ turret.hp += 20; turret.maxHp += 20; }},
    { id:'goldbonus', emoji:'💰', label:'Kill Gold +15%', baseCost:45, costScale:1.5, apply:()=>{ goldMultiplier *= 1.15; }},
    { id:'explosion', emoji:'💣', label:'Explosion', baseCost:80, costScale:1, maxLevel:1, apply:()=>{ turret.explosion = true; }},
    { id:'double', emoji:'🔫', label:'Double Shot', baseCost:100, costScale:1, maxLevel:1, apply:()=>{ turret.double = true; }}
  ];

  function goldForKill(e){
    const base = { fast:8, tank:18, ranged:12, split:10, boss:35, normal:6 };
    return Math.round((base[e.type] || base.normal) * goldMultiplier);
  }

  function getCost(item){
    const lvl = shopLevels[item.id] || 0;
    return Math.round(item.baseCost * Math.pow(item.costScale, lvl));
  }

  function isMaxed(item){
    const lvl = shopLevels[item.id] || 0;
    return !!(item.maxLevel && lvl >= item.maxLevel);
  }

  function addGold(amount){
    money += amount;
    updateMoneyHud();
    refreshShopButtons();
  }

  function updateMoneyHud(){
    if(moneyNode) moneyNode.textContent = String(money);
  }

  function buyUpgrade(item){
    if(isMaxed(item) || money < getCost(item)) return;
    money -= getCost(item);
    shopLevels[item.id] = (shopLevels[item.id] || 0) + 1;
    item.apply();
    updateMoneyHud();
    refreshShopButtons();
    if(hpNode) hpNode.textContent = String(turret.hp);
    playSfx('buy');
  }

  function buildShop(){
    if(!shopEl) return;
    shopEl.innerHTML = '';
    for(const item of SHOP){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'def-shop-btn';
      btn.dataset.id = item.id;
      btn.addEventListener('click', () => buyUpgrade(item));
      shopEl.appendChild(btn);
    }
    refreshShopButtons();
  }

  function refreshShopButtons(){
    if(!shopEl) return;
    for(const item of SHOP){
      const btn = shopEl.querySelector('[data-id="' + item.id + '"]');
      if(!btn) continue;
      const lvl = shopLevels[item.id] || 0;
      const cost = getCost(item);
      const maxed = isMaxed(item);
      btn.textContent = maxed
        ? item.emoji + ' ' + item.label + ' (MAX)'
        : item.emoji + ' ' + item.label + ' · ' + cost + 'g';
      btn.disabled = maxed || money < cost;
      btn.classList.toggle('is-maxed', maxed);
      btn.classList.toggle('is-affordable', !maxed && money >= cost);
      if(lvl > 0 && !maxed) btn.dataset.level = String(lvl);
      else delete btn.dataset.level;
    }
  }

  function enemyFactory(type){
    const angle = Math.random() * Math.PI * 2;
    const r = Math.max(W, H) / 2 + 40;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const obj = { x, y, angle, type, dead: false };
    const scale = 1 + Math.max(0, wave - 1) * 0.08;
    switch(type){
      case 'fast': obj.hp = 16 * scale; obj.speed = 1.45; obj.size = 8; break;
      case 'tank': obj.hp = 110 * scale; obj.speed = 0.45; obj.size = 14; break;
      case 'ranged': obj.hp = 32 * scale; obj.speed = 0.6; obj.size = 10; obj.ranged = true; obj.fireCD = 1600; obj.lastFire = 0; break;
      case 'split': obj.hp = 24 * scale; obj.speed = 0.85; obj.size = 9; obj.split = true; break;
      case 'boss': obj.hp = 380 * scale; obj.speed = 0.5; obj.size = 20; break;
      default: obj.hp = 34 * scale; obj.speed = 0.85; obj.size = 10; break;
    }
    return obj;
  }

  function pickEnemyType(){
    const r = Math.random();
    if(wave >= BALANCE.bossMinWave && wave % 5 === 0 && r < 0.12) return 'boss';
    if(wave < BALANCE.specialMinWave) return r < 0.18 ? 'fast' : 'normal';
    if(r < 0.14) return 'fast';
    if(r < 0.24) return 'tank';
    if(r < 0.34) return 'ranged';
    if(r < 0.40) return 'split';
    return 'normal';
  }

  function spawnWave(){
    const count = BALANCE.waveCount(wave);
    enemiesLeft = count;
    if(enemiesNode) enemiesNode.textContent = String(enemiesLeft);
    let created = 0;
    spawning = true;
    const iv = setInterval(() => {
      if(created >= count){ clearInterval(iv); spawning = false; return; }
      enemies.push(enemyFactory(pickEnemyType()));
      created++;
      if(enemiesNode) enemiesNode.textContent = String(Math.max(0, enemiesLeft));
    }, BALANCE.spawnIntervalMs);
  }

  function distance(a, b){
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onEnemyKilled(e){
    e.dead = true;
    enemiesLeft--;
    addGold(goldForKill(e));
    spawnExplosion(e.x, e.y, e.size);
    playSfx('pop');
    if(turret.explosion){
      const radius = Math.max(40, e.size * 4);
      const baseDamage = Math.max(18, Math.round(turret.damage * turret.bulletPower * 1.2));
      applyExplosionDamage(e.x, e.y, radius, baseDamage);
    }
    if(e.split && wave >= BALANCE.specialMinWave){
      enemies.push(enemyFactory('fast'));
    }
  }

  function update(dt){
    for(const e of enemies){
      if(e.dead) continue;
      const ang = Math.atan2(cy - e.y, cx - e.x);
      e.x += Math.cos(ang) * e.speed * dt;
      e.y += Math.sin(ang) * e.speed * dt;
      if(e.ranged){
        e.lastFire += dt * 16;
        if(e.lastFire > e.fireCD){
          e.lastFire = 0;
          turret.hp -= 4;
          if(turret.hp < 0) turret.hp = 0;
        }
      }
      if(distance(e, { x: cx, y: cy }) < 18){
        turret.hp -= 6;
        e.dead = true;
        enemiesLeft--;
      }
    }

    for(const b of bullets){
      b.x += Math.cos(b.a) * b.speed * dt;
      b.y += Math.sin(b.a) * b.speed * dt;
      b.ttl -= dt;
      for(const e of enemies){
        if(e.dead) continue;
        if(distance(b, e) < (e.size + b.size)){
          const crit = Math.random() < turret.crit;
          e.hp -= b.damage * (crit ? 1.5 : 1);
          if(!b.pierced){
            if(turret.pierce > 0) b.pierced = 1;
            else b.ttl = -1;
          }
          if(e.hp <= 0) onEnemyKilled(e);
        }
      }
    }

    bullets = bullets.filter(b => b.ttl > 0 && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50);
    enemies = enemies.filter(e => !e.dead);

    lastShot += dt * 16;
    if(lastShot > 1000 / turret.atkSpeed){
      lastShot = 0;
      shoot();
    }
  }

  function shoot(){
    let target = null, mind = 9e9;
    for(const e of enemies){
      if(e.dead) continue;
      const d = distance(e, { x: cx, y: cy });
      if(d < turret.range && d < mind){ mind = d; target = e; }
    }
    if(!target) return;
    const a = Math.atan2(target.y - cy, target.x - cx);
    const bulletDmg = turret.damage * turret.bulletPower;
    const base = {
      x: cx, y: cy, a,
      speed: BALANCE.bulletSpeed,
      size: turret.bulletSize,
      damage: bulletDmg,
      pierced: false,
      ttl: BALANCE.bulletTtl
    };
    function fireOne(offset){
      const b = Object.assign({}, base);
      b.a = a + offset;
      b.x = cx + Math.cos(b.a) * 18;
      b.y = cy + Math.sin(b.a) * 18;
      bullets.push(b);
    }
    if(turret.double){ fireOne(-0.06); fireOne(0.06); }
    else fireOne(0);
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#cfcfce';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd97d';
    for(const b of bullets){
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for(const e of enemies){
      if(e.dead) continue;
      ctx.fillStyle = e.type === 'fast' ? '#6fe6a5'
        : e.type === 'tank' ? '#d98d8d'
        : e.type === 'ranged' ? '#8ec7ff' : '#ffd1a6';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for(const p of particles){
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.ttl--;
    }
    particles = particles.filter(p => p.ttl > 0);
    for(const r of rings){
      ctx.strokeStyle = 'rgba(255,200,120,' + r.a + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      r.r += r.v;
      r.a -= 0.02;
      r.ttl--;
    }
    rings = rings.filter(r => r.ttl > 0 && r.a > 0);
    if(hpNode) hpNode.textContent = String(turret.hp);
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.fillText('HP:' + turret.hp + '/' + turret.maxHp, 10, 14);
  }

  function loop(ts){
    if(!lastTime) lastTime = ts;
    const dt = (ts - lastTime) / 16;
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function spawnExplosion(x, y, size){
    const count = Math.min(18, Math.round(size * 2));
    const colors = ['#ffd97d', '#ffb36b', '#ff6b6b', '#ffd1a6'];
    for(let i = 0; i < count; i++){
      const ang = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        ttl: 30
      });
    }
  }

  function applyExplosionDamage(x, y, radius, baseDamage){
    rings.push({ x, y, r: 8, v: 3, a: 0.9, ttl: 40 });
    for(const e of enemies){
      if(e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if(d <= radius){
        const factor = 1 - (d / radius);
        e.hp -= Math.max(1, Math.round(baseDamage * factor));
        if(e.hp <= 0) onEnemyKilled(e);
      }
    }
  }

  function ensureAudio(){
    if(audioCtx) return;
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ audioCtx = null; }
  }

  function playSfx(name){
    if(!audioCtx) try{ ensureAudio(); }catch(e){}
    if(!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = name === 'buy' ? 520 : 250 + Math.random() * 300;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.08);
  }

  startBtn.addEventListener('click', () => {
    spawnWave();
    if(waveNode) waveNode.textContent = String(wave);
    wave++;
  });

  const autoBtn = document.getElementById('def-autostart');
  let autoStart = false;
  if(autoBtn){
    autoBtn.addEventListener('click', () => {
      autoStart = !autoStart;
      autoBtn.setAttribute('aria-pressed', String(autoStart));
      autoBtn.textContent = 'Auto-start: ' + (autoStart ? 'On' : 'Off');
      if(autoStart && !spawning && enemies.length === 0){
        spawnWave();
        if(waveNode) waveNode.textContent = String(wave);
        wave++;
      }
    });
  }

  function init(){
    if(waveNode) waveNode.textContent = String(wave);
    updateMoneyHud();
    if(hpNode) hpNode.textContent = String(turret.hp);
    buildShop();
    requestAnimationFrame(loop);
  }
  init();

})();
