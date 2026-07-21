(function () {
  "use strict";

  const GAME_ID = "microglow-business-empire";
  const GAME_TITLE = "微光商業帝國";
  const ELITE_NET_WORTH = 250000;
  const MAX_LOGS = 8;
  const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const portalStats = window.MicroglowGameStats;

  const TILE_META = {
    income: { label: "收入", icon: "✦" },
    expense: { label: "支出", icon: "◆" },
    stock: { label: "股票", icon: "↗" },
    realEstate: { label: "房產", icon: "⌂" },
    business: { label: "副業", icon: "⚙" },
    risk: { label: "風險", icon: "⚠" },
    loan: { label: "銀行", icon: "▣" },
    learn: { label: "學習", icon: "✧" },
    gate: { label: "躍升門", icon: "⬡" },
    destiny: { label: "命運", icon: "☄" }
  };

  const BASIC_TYPES = [
    "gate", "income", "stock", "expense", "learn", "business", "income", "risk",
    "realEstate", "loan", "income", "stock", "destiny", "expense", "business", "learn",
    "gate", "income", "realEstate", "risk", "stock", "income", "loan", "expense",
    "business", "destiny", "income", "learn", "realEstate", "risk", "stock", "expense"
  ];

  const ELITE_TYPES = [
    "gate", "stock", "risk", "realEstate", "income", "business", "destiny", "expense", "learn", "stock",
    "gate", "realEstate", "risk", "business", "income", "loan", "destiny", "stock", "expense", "learn"
  ];

  const CHARACTERS = [
    {
      id: "starlight-merchant",
      name: "星輝商旅",
      title: "星路遠征隊長",
      artIndex: 0,
      avatar: "🧭",
      perk: "現金充裕，適合穩健累積。",
      detail: "起始 $36,000・薪資 $4,800・支出 $3,000",
      cash: 36000,
      salary: 4800,
      baseExpense: 3000,
      skill: 0
    },
    {
      id: "rune-artisan",
      name: "符文工匠",
      title: "水晶帳冊鍊金師",
      artIndex: 1,
      avatar: "🔮",
      perk: "能力領先，資產買入最多折 10%。",
      detail: "起始 $28,000・薪資 $5,000・能力 2",
      cash: 28000,
      salary: 5000,
      baseExpense: 2900,
      skill: 2
    },
    {
      id: "moon-investor",
      name: "月影投資家",
      title: "夜航商會策略家",
      artIndex: 2,
      avatar: "🌙",
      perk: "支出較低，更快接近財務自由。",
      detail: "起始 $30,000・薪資 $4,500・支出 $2,550",
      cash: 30000,
      salary: 4500,
      baseExpense: 2550,
      skill: 1
    }
  ];

  const BASIC_ASSETS = {
    stock: [
      { id: "aurora-stock", type: "stock", name: "極光通訊股", price: 9000, value: 9000, monthlyIncome: 420, monthlyCost: 0, risk: "中" },
      { id: "mana-fund", type: "stock", name: "魔力指數基金", price: 14000, value: 14000, monthlyIncome: 580, monthlyCost: 0, risk: "低" },
      { id: "drake-tech", type: "stock", name: "飛龍科技股", price: 18000, value: 18000, monthlyIncome: 880, monthlyCost: 0, risk: "高" }
    ],
    realEstate: [
      { id: "lantern-studio", type: "realEstate", name: "燈塔出租套房", price: 15000, value: 60000, loanPrincipal: 45000, monthlyIncome: 1400, monthlyCost: 470, risk: "低" },
      { id: "rune-shop", type: "realEstate", name: "符文商店店面", price: 23000, value: 88000, loanPrincipal: 65000, monthlyIncome: 2100, monthlyCost: 720, risk: "中" },
      { id: "sky-warehouse", type: "realEstate", name: "浮空倉庫", price: 28000, value: 108000, loanPrincipal: 80000, monthlyIncome: 2700, monthlyCost: 930, risk: "中" }
    ],
    business: [
      { id: "potion-cart", type: "business", name: "星露飲品攤", price: 8000, value: 8000, monthlyIncome: 650, monthlyCost: 120, risk: "低" },
      { id: "delivery-guild", type: "business", name: "飛毯外送隊", price: 13500, value: 13500, monthlyIncome: 1100, monthlyCost: 240, risk: "中" },
      { id: "crystal-stream", type: "business", name: "水晶直播坊", price: 18000, value: 18000, monthlyIncome: 1550, monthlyCost: 380, risk: "高" }
    ]
  };

  const ELITE_ASSETS = {
    stock: [
      { id: "phoenix-holdings", type: "stock", name: "鳳凰控股", price: 52000, value: 52000, monthlyIncome: 3500, monthlyCost: 0, risk: "高" },
      { id: "astral-bond", type: "stock", name: "星界能源債", price: 68000, value: 68000, monthlyIncome: 3900, monthlyCost: 0, risk: "中" }
    ],
    realEstate: [
      { id: "cloud-tower", type: "realEstate", name: "雲端商務塔", price: 60000, value: 260000, loanPrincipal: 200000, monthlyIncome: 9200, monthlyCost: 3200, risk: "中" },
      { id: "dragon-harbor", type: "realEstate", name: "龍港物流園", price: 82000, value: 350000, loanPrincipal: 268000, monthlyIncome: 13800, monthlyCost: 4900, risk: "高" }
    ],
    business: [
      { id: "portal-network", type: "business", name: "傳送門連鎖網", price: 48000, value: 48000, monthlyIncome: 4800, monthlyCost: 1100, risk: "中" },
      { id: "golem-factory", type: "business", name: "魔像自動工坊", price: 75000, value: 75000, monthlyIncome: 7900, monthlyCost: 1900, risk: "高" }
    ]
  };

  const INCOME_EVENTS = [
    ["完成王城專案", 5200],
    ["商會分紅入帳", 3800],
    ["收到創作授權金", 4600],
    ["市集旺季獎金", 2800]
  ];

  const EXPENSE_EVENTS = [
    ["飛毯緊急維修", 2400],
    ["商會年度會費", 1800],
    ["魔法設備汰換", 3600],
    ["倉庫能量超支", 2900]
  ];

  const basicTiles = BASIC_TYPES.map((type, index) => ({ ...TILE_META[type], type, index }));
  const eliteTiles = ELITE_TYPES.map((type, index) => ({ ...TILE_META[type], type, index }));

  const elements = {
    basicRing: document.querySelector('[data-ring="basic"]'),
    eliteRing: document.querySelector('[data-ring="elite"]'),
    tokens: document.querySelector("[data-tokens]"),
    dice: document.querySelector("[data-dice]"),
    roll: document.querySelector('[data-action="roll"]'),
    circleLabel: document.querySelector("[data-circle-label]"),
    turnLabel: document.querySelector("[data-turn-label]"),
    goalProgress: document.querySelector("[data-goal-progress]"),
    goalMeter: document.querySelector("[data-goal-meter]"),
    playerPortrait: document.querySelector("[data-player-portrait]"),
    playerName: document.querySelector("[data-player-name]"),
    playerTitle: document.querySelector("[data-player-title]"),
    eventCard: document.querySelector("[data-event-card]"),
    eventIcon: document.querySelector("[data-event-icon]"),
    eventType: document.querySelector(".event-kicker [data-event-type]"),
    eventTitle: document.querySelector("[data-event-title]"),
    eventDescription: document.querySelector("[data-event-description]"),
    offerStats: document.querySelector("[data-offer-stats]"),
    eventActions: document.querySelector("[data-event-actions]"),
    ranking: document.querySelector("[data-ranking]"),
    log: document.querySelector("[data-log]"),
    cashflowPreview: document.querySelector("[data-cashflow-preview]"),
    introModal: document.querySelector("[data-intro-modal]"),
    instructionsModal: document.querySelector("[data-instructions-modal]"),
    assetsModal: document.querySelector("[data-assets-modal]"),
    resultModal: document.querySelector("[data-result-modal]"),
    characterGrid: document.querySelector("[data-character-grid]"),
    assetSummary: document.querySelector("[data-asset-summary]"),
    assetList: document.querySelector("[data-asset-list]"),
    repay: document.querySelector("[data-repay]"),
    resultKicker: document.querySelector("[data-result-kicker]"),
    resultEmblem: document.querySelector("[data-result-emblem]"),
    resultTitle: document.querySelector("[data-result-title]"),
    resultMessage: document.querySelector("[data-result-message]"),
    resultStats: document.querySelector("[data-result-stats]")
  };

  let state = createEmptyState();
  let instanceSequence = 0;

  init();

  function init() {
    portalStats.ensureGame(GAME_ID, GAME_TITLE);
    syncViewportSize();
    renderBoard();
    renderCharacters();
    bindControls();
    renderAll();
    addLog("歡迎來到微光城，請先選擇角色。", false);
    window.__microglowBusinessEmpire = {
      snapshot: () => JSON.parse(JSON.stringify(state)),
      formatMoney,
      ringCoordinates,
      monthlyExpense,
      passiveIncome,
      debtOf,
      netWorth,
      canEnterElite
    };
  }

  function createEmptyState() {
    return {
      started: false,
      busy: false,
      ended: false,
      round: 1,
      actors: [],
      logs: []
    };
  }

  function makeActor(config, overrides = {}) {
    return {
      id: config.id,
      name: config.name,
      avatar: config.avatar,
      title: config.title || "商會競爭者",
      artIndex: Number(config.artIndex) || 0,
      color: overrides.color || "#55e6ff",
      isHuman: Boolean(overrides.isHuman),
      strategy: overrides.strategy || "balanced",
      cash: config.cash,
      salary: config.salary,
      baseExpense: config.baseExpense,
      skill: config.skill || 0,
      bankDebt: 0,
      assets: [],
      position: overrides.position || 0,
      circle: "basic",
      eliminated: false
    };
  }

  function renderCharacters() {
    elements.characterGrid.replaceChildren();
    CHARACTERS.forEach((character, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "character-card";
      button.innerHTML = `
        <span class="character-art art-${index}" aria-hidden="true"></span>
        <strong>${character.name}｜${character.title}</strong>
        <p>${character.perk}</p>
        <small>${character.detail}</small>
      `;
      button.addEventListener("click", () => startGame(character.id));
      elements.characterGrid.append(button);
    });
  }

  function startGame(characterId) {
    const selected = CHARACTERS.find((character) => character.id === characterId) || CHARACTERS[0];
    const conservative = {
      id: "ai-warden",
      name: "銀盾理財師",
      avatar: "🛡️",
      cash: 33000,
      salary: 4800,
      baseExpense: 2850,
      skill: 1
    };
    const aggressive = {
      id: "ai-pioneer",
      name: "赤焰開拓者",
      avatar: "🔥",
      cash: 30000,
      salary: 5200,
      baseExpense: 3300,
      skill: 0
    };

    state = createEmptyState();
    state.started = true;
    state.actors = [
      makeActor(selected, { isHuman: true, color: "#55e6ff", position: 0 }),
      makeActor(conservative, { strategy: "conservative", color: "#7ef7bd", position: 0 }),
      makeActor(aggressive, { strategy: "aggressive", color: "#ff7ac8", position: 0 })
    ];
    elements.introModal.hidden = true;
    elements.resultModal.hidden = true;
    elements.dice.textContent = "◈";
    addLog(`${selected.name}進入微光城，商業冒險開始。`, false);
    showEvent({
      type: "income",
      icon: "✦",
      label: "第一回合",
      title: "能量航線已開啟",
      description: "擲骰前進，落點事件處理完畢後會進行月度現金流結算。"
    });
    setRollEnabled(true);
    renderAll();
  }

  function renderBoard() {
    renderRing(elements.basicRing, basicTiles, 33.6);
    renderRing(elements.eliteRing, eliteTiles, 17.3);
  }

  function renderRing(container, tiles, radius) {
    container.replaceChildren();
    tiles.forEach((tile, index) => {
      const point = circlePoint(index, tiles.length, radius);
      const cell = document.createElement("div");
      cell.className = `tile ${tile.type}`;
      cell.style.setProperty("--x", `${point.left}%`);
      cell.style.setProperty("--y", `${point.top}%`);
      cell.title = tile.label;
      cell.setAttribute("aria-label", `${index + 1}. ${tile.label}`);
      cell.innerHTML = `<span class="tile-icon">${tile.icon}</span><span class="tile-label">${tile.label}</span>`;
      container.append(cell);
    });
  }

  function circlePoint(index, count, radius) {
    const angle = (-90 + (index / count) * 360) * (Math.PI / 180);
    return {
      left: 50 + Math.cos(angle) * radius,
      top: 50 + Math.sin(angle) * radius
    };
  }

  function ringCoordinates(size) {
    const coordinates = [];
    for (let col = 0; col < size; col += 1) coordinates.push({ row: 0, col });
    for (let row = 1; row < size; row += 1) coordinates.push({ row, col: size - 1 });
    for (let col = size - 2; col >= 0; col -= 1) coordinates.push({ row: size - 1, col });
    for (let row = size - 2; row >= 1; row -= 1) coordinates.push({ row, col: 0 });
    return coordinates;
  }

  function renderAll() {
    renderStats();
    renderTokens();
    renderRanking();
    renderLogs();
  }

  function renderStats() {
    const player = human();
    const empty = !player;
    const values = {
      cash: empty ? 0 : player.cash,
      passive: empty ? 0 : passiveIncome(player),
      expense: empty ? 0 : monthlyExpense(player),
      debt: empty ? 0 : debtOf(player),
      worth: empty ? 0 : netWorth(player)
    };
    Object.entries(values).forEach(([key, value]) => {
      const target = document.querySelector(`[data-stat="${key}"]`);
      if (target) target.textContent = formatMoney(value);
    });
    document.querySelector('[data-stat="turn"]').textContent = String(state.round);
    elements.circleLabel.textContent = empty || player.circle === "basic" ? "基礎城區" : "精英內城";
    elements.turnLabel.textContent = state.ended ? "本局已結束" : state.busy ? "商會正在結算" : state.started ? "輪到你擲骰" : "等待選擇角色";
    elements.goalProgress.textContent = `${formatMoney(values.passive)} / ${formatMoney(values.expense)}`;
    elements.goalMeter.style.width = `${Math.min(100, (values.passive / Math.max(1, values.expense)) * 100)}%`;
    elements.cashflowPreview.textContent = `淨現金流 ${formatSigned(empty ? 0 : monthlyCashflow(player))}`;
    elements.playerName.textContent = empty ? "尚未選角" : player.name;
    elements.playerTitle.textContent = empty ? "等待進入微光城" : player.title;
    elements.playerPortrait.className = `player-portrait character-${empty ? 0 : player.artIndex}`;
  }

  function renderTokens() {
    elements.tokens.replaceChildren();
    state.actors.forEach((actor, index) => {
      if (actor.eliminated) return;
      const point = tokenPoint(actor);
      const token = document.createElement("div");
      token.className = "token";
      token.dataset.tokenIndex = String(index);
      token.style.setProperty("--token-color", actor.color);
      token.style.setProperty("--x", `${point.left}%`);
      token.style.setProperty("--y", `${point.top}%`);
      token.innerHTML = "<span></span>";
      token.title = actor.name;
      elements.tokens.append(token);
    });
  }

  function tokenPoint(actor) {
    const isElite = actor.circle === "elite";
    const count = isElite ? eliteTiles.length : basicTiles.length;
    return circlePoint(actor.position % count, count, isElite ? 17.3 : 33.6);
  }

  function renderRanking() {
    elements.ranking.replaceChildren();
    [...state.actors]
      .sort((a, b) => netWorth(b) - netWorth(a))
      .forEach((actor, index) => {
        const item = document.createElement("li");
        item.innerHTML = `<span>${index + 1}</span><span>${actor.avatar} ${actor.name}${actor.eliminated ? "（退場）" : ""}</span><strong>${formatMoney(netWorth(actor))}</strong>`;
        elements.ranking.append(item);
      });
  }

  function renderLogs() {
    elements.log.replaceChildren();
    state.logs.forEach((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      elements.log.append(item);
    });
  }

  function addLog(message, shouldRender = true) {
    state.logs.unshift(`R${state.round}｜${message}`);
    state.logs = state.logs.slice(0, MAX_LOGS);
    if (shouldRender) renderLogs();
  }

  function human() {
    return state.actors.find((actor) => actor.isHuman);
  }

  function passiveIncome(actor) {
    return actor.assets.reduce((total, asset) => total + asset.monthlyIncome, 0);
  }

  function monthlyExpense(actor) {
    const assetCosts = actor.assets.reduce((total, asset) => total + asset.monthlyCost, 0);
    const creditCost = actor.bankDebt > 0 ? Math.ceil(actor.bankDebt / 18000) * 260 : 0;
    return actor.baseExpense + assetCosts + creditCost;
  }

  function debtOf(actor) {
    return actor.bankDebt + actor.assets.reduce((total, asset) => total + (asset.loanPrincipal || 0), 0);
  }

  function netWorth(actor) {
    const assetValue = actor.assets.reduce((total, asset) => total + asset.value, 0);
    return Math.round(actor.cash + assetValue - debtOf(actor));
  }

  function monthlyCashflow(actor) {
    return actor.salary + passiveIncome(actor) - monthlyExpense(actor);
  }

  function canEnterElite(actor) {
    return passiveIncome(actor) >= monthlyExpense(actor) * 0.55 || netWorth(actor) >= ELITE_NET_WORTH || actor.skill >= 4;
  }

  function creditAvailable(actor) {
    return Math.max(0, actor.salary * 10 - actor.bankDebt);
  }

  function discountFor(actor) {
    return Math.min(0.1, actor.skill * 0.02);
  }

  function formatMoney(value) {
    const rounded = Math.round(Math.abs(value));
    const formatted = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(rounded);
    return `${value < 0 ? "−" : ""}$${formatted}`;
  }

  function formatSigned(value) {
    if (value === 0) return "$0";
    return `${value > 0 ? "+" : "−"}$${new Intl.NumberFormat("zh-TW").format(Math.round(Math.abs(value)))}`;
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function showEvent(event, actions = [], stats = []) {
    elements.eventCard.dataset.eventType = event.type || "income";
    elements.eventIcon.textContent = event.icon || TILE_META[event.type]?.icon || "✦";
    elements.eventType.textContent = event.label || TILE_META[event.type]?.label || "城市事件";
    elements.eventTitle.textContent = event.title;
    elements.eventDescription.textContent = event.description;
    elements.offerStats.hidden = stats.length === 0;
    elements.offerStats.replaceChildren();
    stats.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      elements.offerStats.append(item);
    });
    elements.eventActions.replaceChildren();
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.disabled = Boolean(action.disabled);
      button.addEventListener("click", action.run, { once: true });
      elements.eventActions.append(button);
    });
  }

  function setRollEnabled(enabled) {
    elements.roll.disabled = !enabled || !state.started || state.busy || state.ended;
  }

  async function rollHuman() {
    if (!state.started || state.busy || state.ended) return;
    state.busy = true;
    setRollEnabled(false);
    renderStats();
    const player = human();
    const roll = randomInt(1, 6);
    await animateDice(roll);
    addLog(`${player.name}擲出 ${roll}。`);
    await moveActor(player, roll, true);
    const tile = currentTile(player);
    resolveHumanTile(player, tile);
    renderAll();
  }

  async function animateDice(result) {
    elements.dice.classList.add("is-rolling");
    for (let index = 0; index < 7; index += 1) {
      elements.dice.textContent = DICE_FACES[randomInt(1, 6) - 1];
      await sleep(55);
    }
    elements.dice.textContent = DICE_FACES[result - 1];
    elements.dice.setAttribute("aria-label", `骰子結果 ${result}`);
    elements.dice.classList.remove("is-rolling");
  }

  async function moveActor(actor, steps, animate) {
    const length = actor.circle === "basic" ? basicTiles.length : eliteTiles.length;
    for (let step = 0; step < steps; step += 1) {
      actor.position = (actor.position + 1) % length;
      if (animate) {
        renderTokens();
        await sleep(95);
      }
    }
    renderTokens();
  }

  function currentTile(actor) {
    return actor.circle === "elite" ? eliteTiles[actor.position] : basicTiles[actor.position];
  }

  function resolveHumanTile(actor, tile) {
    if (["stock", "realEstate", "business"].includes(tile.type)) {
      presentAssetOffer(actor, tile.type);
      return;
    }

    if (tile.type === "income") {
      const [title, amount] = randomItem(INCOME_EVENTS);
      actor.cash += amount;
      addLog(`${title}，現金 ${formatSigned(amount)}。`);
      presentContinue(tile, title, `機會能量轉為現金，你獲得 ${formatMoney(amount)}。`, [["現金變動", formatSigned(amount)]]);
      return;
    }

    if (tile.type === "expense") {
      const [title, baseAmount] = randomItem(EXPENSE_EVENTS);
      const reduction = Math.min(0.3, actor.skill * 0.04);
      const amount = Math.round(baseAmount * (1 - reduction));
      actor.cash -= amount;
      addLog(`${title}，現金 ${formatSigned(-amount)}。`);
      presentContinue(tile, title, `突發支出已支付${reduction ? "，能力降低了損失" : ""}。`, [["現金變動", formatSigned(-amount)]]);
      return;
    }

    if (tile.type === "risk") {
      const successChance = Math.min(0.75, 0.48 + actor.skill * 0.05);
      const success = Math.random() < successChance;
      const amount = actor.circle === "elite" ? randomInt(7000, 15000) : randomInt(2200, 6200);
      actor.cash += success ? amount : -amount;
      const title = success ? "風險轉為紅利" : "市場能量逆流";
      addLog(`${title}，現金 ${formatSigned(success ? amount : -amount)}。`);
      presentContinue(tile, title, success ? "判斷成功，高風險行動帶來額外報酬。" : "市場走勢反轉，你承擔了這次損失。", [["現金變動", formatSigned(success ? amount : -amount)], ["成功機率", `${Math.round(successChance * 100)}%`]]);
      return;
    }

    if (tile.type === "learn") {
      const cost = actor.circle === "elite" ? 5000 : 2500;
      showEvent({ type: tile.type, title: "商業奧術課程", description: "提升能力會增加風險事件成功率、降低突發支出，並讓資產買入最多享 10% 折扣。" }, [
        { label: `進修 ${formatMoney(cost)}`, disabled: actor.cash < cost, run: () => { actor.cash -= cost; actor.skill += 1; addLog(`${actor.name}進修完成，能力提升至 ${actor.skill}。`); finishHumanTurn(); } },
        { label: "這次跳過", run: finishHumanTurn }
      ], [["目前能力", String(actor.skill)], ["買入折扣", `${Math.round(discountFor(actor) * 100)}%`]]);
      return;
    }

    if (tile.type === "loan") {
      presentBank(actor);
      return;
    }

    if (tile.type === "gate") {
      presentGate(actor);
      return;
    }

    resolveDestiny(actor, tile);
  }

  function presentAssetOffer(actor, type) {
    const source = actor.circle === "elite" ? ELITE_ASSETS : BASIC_ASSETS;
    const template = randomItem(source[type]);
    const discount = discountFor(actor);
    const price = Math.round(template.price * (1 - discount));
    const netIncome = template.monthlyIncome - template.monthlyCost;
    showEvent({
      type,
      title: template.name,
      description: `風險 ${template.risk}。買入後每月收入 ${formatMoney(template.monthlyIncome)}，每月維護 ${formatMoney(template.monthlyCost)}。${discount ? `你的能力使買入價降低 ${Math.round(discount * 100)}%。` : ""}`
    }, [
      { label: `買入 ${formatMoney(price)}`, disabled: actor.cash < price, run: () => { buyAsset(actor, template, price); finishHumanTurn(); } },
      { label: "放棄機會", run: () => { addLog(`${actor.name}放棄 ${template.name}。`); finishHumanTurn(); } }
    ], [
      ["買入現金", formatMoney(price)],
      ["每月淨流入", formatSigned(netIncome)],
      ["資產價值", formatMoney(template.value)],
      ["新增負債", formatMoney(template.loanPrincipal || 0)]
    ]);
  }

  function buyAsset(actor, template, price) {
    actor.cash -= price;
    actor.assets.push({ ...template, paidPrice: price, instanceId: `${template.id}-${instanceSequence += 1}` });
    addLog(`${actor.name}買入「${template.name}」，每月淨流入 ${formatSigned(template.monthlyIncome - template.monthlyCost)}。`);
  }

  function presentBank(actor) {
    const canRepay = actor.bankDebt > 0 && actor.cash >= 5000;
    showEvent({
      type: "loan",
      title: "星鑄銀行",
      description: "可借入 $15,000，帳面負債增加 $18,000，並產生每月信用成本；也可優先償還既有信用貸款。"
    }, [
      { label: "借入 $15,000", disabled: creditAvailable(actor) < 18000, run: () => { actor.cash += 15000; actor.bankDebt += 18000; addLog(`${actor.name}向星鑄銀行借入 $15,000。`); finishHumanTurn(); } },
      { label: "償還 $5,000", disabled: !canRepay, run: () => { repayBankDebt(actor, 5000); finishHumanTurn(); } },
      { label: "離開銀行", run: finishHumanTurn }
    ], [["銀行負債", formatMoney(actor.bankDebt)], ["可用信用", formatMoney(creditAvailable(actor))]]);
  }

  function repayBankDebt(actor, amount) {
    const paid = Math.min(amount, actor.cash, actor.bankDebt);
    actor.cash -= paid;
    actor.bankDebt -= paid;
    addLog(`${actor.name}償還銀行負債 ${formatMoney(paid)}。`);
  }

  function presentGate(actor) {
    if (actor.circle === "elite") {
      actor.cash += 6000;
      presentContinue({ type: "gate" }, "精英議會分紅", "你已在精英圈，議會依本期成果發放紅利。", [["現金變動", "+$6,000"]]);
      return;
    }
    const qualified = canEnterElite(actor);
    showEvent({
      type: "gate",
      title: qualified ? "精英圈通行證已亮起" : "躍升條件尚未完成",
      description: qualified
        ? "你已具備進入精英圈的條件。內圈機會報酬更高，風險與資金需求也會同步提高。"
        : "需達成任一條件：被動收入達支出的 55%、淨資產達 $250,000，或能力達 4。"
    }, qualified ? [
      { label: "進入精英圈", run: () => { actor.circle = "elite"; actor.position = 0; addLog(`${actor.name}通過躍升門，進入精英圈。`); renderTokens(); finishHumanTurn(); } },
      { label: "留在基礎圈", run: finishHumanTurn }
    ] : [
      { label: "繼續累積", run: finishHumanTurn }
    ], [["被動／支出", `${Math.round((passiveIncome(actor) / Math.max(1, monthlyExpense(actor))) * 100)}%`], ["淨資產", formatMoney(netWorth(actor))], ["能力", String(actor.skill)]]);
  }

  function resolveDestiny(actor, tile) {
    const outcomes = actor.circle === "elite"
      ? [
          ["古龍合約提前解鎖", 11000],
          ["跨界商路臨時封閉", -8500],
          ["星港稅務返還", 7200],
          ["合作夥伴退出專案", -6200]
        ]
      : [
          ["遇見神秘天使投資人", 5200],
          ["遺失一批魔法貨物", -3600],
          ["城市祭典帶來訂單", 4300],
          ["供應商臨時漲價", -2800]
        ];
    const [title, amount] = randomItem(outcomes);
    actor.cash += amount;
    addLog(`${title}，現金 ${formatSigned(amount)}。`);
    presentContinue(tile, title, amount > 0 ? "命運之輪轉向你，這次獲得額外資源。" : "命運事件帶來損失，保留現金仍是重要策略。", [["現金變動", formatSigned(amount)]]);
  }

  function presentContinue(tile, title, description, stats) {
    showEvent({ type: tile.type, title, description }, [{ label: "結束回合", run: finishHumanTurn }], stats);
  }

  async function finishHumanTurn() {
    elements.eventActions.replaceChildren();
    const player = human();
    const result = settleActor(player);
    if (result.failed) {
      endGame(false, `${player.name}的現金與可用信用不足，商業帝國在本期結算後破產。`, player);
      return;
    }
    if (hasWon(player)) {
      endGame(true, `${player.name}的被動收入已支付全部每月支出，財務自由達成。`, player);
      return;
    }

    renderAll();
    showEvent({ type: "income", icon: "⌛", label: "對手回合", title: "商會正在推演對手策略", description: "銀盾理財師與赤焰開拓者將依各自風格處理本回合。" });
    await runAiTurns();
    if (state.ended) return;
    state.round += 1;
    state.busy = false;
    renderAll();
    showEvent({ type: "income", icon: "✦", label: `第 ${state.round} 回合`, title: "輪到你行動", description: "觀察現金流與排名，擲骰探索下一個商業事件。" });
    setRollEnabled(true);
  }

  function settleActor(actor) {
    const flow = monthlyCashflow(actor);
    actor.cash += flow;
    addLog(`${actor.name}月結 ${formatSigned(flow)}。`, actor.isHuman);
    if (actor.cash >= 0) return { failed: false, flow };

    const needed = Math.abs(actor.cash);
    const available = creditAvailable(actor);
    if (needed <= available) {
      actor.cash = 0;
      actor.bankDebt += needed;
      addLog(`${actor.name}啟用緊急信用 ${formatMoney(needed)}。`, actor.isHuman);
      return { failed: false, flow, emergencyCredit: needed };
    }
    return { failed: true, flow };
  }

  async function runAiTurns() {
    const opponents = state.actors.filter((actor) => !actor.isHuman && !actor.eliminated);
    for (const actor of opponents) {
      if (state.ended) return;
      const roll = randomInt(1, 6);
      elements.dice.textContent = DICE_FACES[roll - 1];
      elements.dice.setAttribute("aria-label", `骰子結果 ${roll}`);
      addLog(`${actor.name}擲出 ${roll}。`);
      await moveActor(actor, roll, false);
      resolveAiTile(actor, currentTile(actor));
      const settlement = settleActor(actor);
      if (settlement.failed) {
        actor.eliminated = true;
        addLog(`${actor.name}信用斷裂，退出競爭。`);
      } else if (hasWon(actor)) {
        renderAll();
        endGame(false, `${actor.name}率先讓被動收入覆蓋每月支出，贏得本屆微光商會競賽。`, actor);
        return;
      }
      renderAll();
      await sleep(350);
    }
  }

  function resolveAiTile(actor, tile) {
    if (["stock", "realEstate", "business"].includes(tile.type)) {
      const source = actor.circle === "elite" ? ELITE_ASSETS : BASIC_ASSETS;
      const asset = randomItem(source[tile.type]);
      const price = Math.round(asset.price * (1 - discountFor(actor)));
      if (shouldAiBuy(actor, asset, price)) {
        if (actor.cash < price && actor.strategy === "aggressive") {
          const needed = price - actor.cash + 5000;
          const credit = Math.min(creditAvailable(actor), Math.ceil(needed / 15000) * 18000);
          if (credit > 0) {
            actor.bankDebt += credit;
            actor.cash += Math.round(credit * (15000 / 18000));
          }
        }
        if (actor.cash >= price) buyAsset(actor, asset, price);
      } else {
        addLog(`${actor.name}放棄 ${asset.name}。`);
      }
      return;
    }

    if (tile.type === "income") {
      const [, amount] = randomItem(INCOME_EVENTS);
      actor.cash += amount;
      addLog(`${actor.name}取得收入 ${formatMoney(amount)}。`);
      return;
    }

    if (tile.type === "expense") {
      const [, baseAmount] = randomItem(EXPENSE_EVENTS);
      const amount = Math.round(baseAmount * (1 - Math.min(0.3, actor.skill * 0.04)));
      actor.cash -= amount;
      addLog(`${actor.name}支付突發支出 ${formatMoney(amount)}。`);
      return;
    }

    if (tile.type === "risk") {
      const success = Math.random() < Math.min(0.75, 0.48 + actor.skill * 0.05);
      const amount = actor.circle === "elite" ? randomInt(7000, 15000) : randomInt(2200, 6200);
      actor.cash += success ? amount : -amount;
      addLog(`${actor.name}的風險行動${success ? "獲利" : "失利"} ${formatMoney(amount)}。`);
      return;
    }

    if (tile.type === "learn") {
      const cost = actor.circle === "elite" ? 5000 : 2500;
      if (actor.cash > cost + (actor.strategy === "conservative" ? 18000 : 7000)) {
        actor.cash -= cost;
        actor.skill += 1;
        addLog(`${actor.name}進修，能力提升至 ${actor.skill}。`);
      }
      return;
    }

    if (tile.type === "loan") {
      if (actor.bankDebt > 0 && actor.cash > 25000) {
        repayBankDebt(actor, 5000);
      } else if (actor.strategy === "aggressive" && actor.cash < 16000 && creditAvailable(actor) >= 18000) {
        actor.cash += 15000;
        actor.bankDebt += 18000;
        addLog(`${actor.name}借入進攻資金 $15,000。`);
      }
      return;
    }

    if (tile.type === "gate") {
      if (actor.circle === "basic" && canEnterElite(actor)) {
        actor.circle = "elite";
        actor.position = 0;
        addLog(`${actor.name}進入精英圈。`);
      } else if (actor.circle === "elite") {
        actor.cash += 6000;
      }
      return;
    }

    const outcomes = actor.circle === "elite" ? [11000, -8500, 7200, -6200] : [5200, -3600, 4300, -2800];
    const amount = randomItem(outcomes);
    actor.cash += amount;
    addLog(`${actor.name}遇到命運事件 ${formatSigned(amount)}。`);
  }

  function shouldAiBuy(actor, asset, price) {
    const netYield = (asset.monthlyIncome - asset.monthlyCost) / Math.max(1, price);
    if (actor.strategy === "conservative") {
      return actor.cash - price >= 20000 && netYield >= 0.035;
    }
    if (actor.strategy === "aggressive") {
      return netYield >= 0.045 && actor.cash + Math.round(creditAvailable(actor) * (15000 / 18000)) >= price + 4000;
    }
    return actor.cash - price >= 10000 && netYield >= 0.035;
  }

  function hasWon(actor) {
    return !actor.eliminated && passiveIncome(actor) > 0 && passiveIncome(actor) >= monthlyExpense(actor);
  }

  function scoreOf(actor) {
    return Math.max(0, Math.round(netWorth(actor) + passiveIncome(actor) * 18 + actor.skill * 4000));
  }

  function endGame(won, message, focusActor) {
    state.ended = true;
    state.busy = false;
    setRollEnabled(false);
    const player = human();
    const score = scoreOf(player);
    const existingBest = Number(portalStats.readGame(GAME_ID).bestScore) || 0;
    const best = Math.max(existingBest, score);
    portalStats.recordRun(GAME_ID, GAME_TITLE, score, best);
    elements.resultKicker.textContent = won ? "財務自由達成" : "本局挑戰結束";
    elements.resultEmblem.textContent = won ? "♛" : "◇";
    elements.resultTitle.textContent = won ? "微光帝國建成" : `${focusActor.name}主導了結局`;
    elements.resultMessage.textContent = message;
    elements.resultStats.innerHTML = `
      <div><span>本局分數</span><strong>${new Intl.NumberFormat("zh-TW").format(score)}</strong></div>
      <div><span>淨資產</span><strong>${formatMoney(netWorth(player))}</strong></div>
      <div><span>最高分</span><strong>${new Intl.NumberFormat("zh-TW").format(best)}</strong></div>
    `;
    elements.resultModal.hidden = false;
    renderAll();
  }

  function openAssets() {
    if (!state.started) return;
    const player = human();
    elements.assetSummary.innerHTML = `
      <div><span>資產數</span><strong>${player.assets.length}</strong></div>
      <div><span>每月被動收入</span><strong>${formatMoney(passiveIncome(player))}</strong></div>
      <div><span>銀行負債</span><strong>${formatMoney(player.bankDebt)}</strong></div>
    `;
    elements.assetList.replaceChildren();
    if (!player.assets.length) {
      const empty = document.createElement("div");
      empty.className = "empty-assets";
      empty.textContent = "目前沒有資產。探索股票、房產與副業格來建立現金流。";
      elements.assetList.append(empty);
    } else {
      player.assets.forEach((asset) => {
        const saleGross = Math.round(asset.value * 0.7);
        const saleCash = Math.max(0, saleGross - (asset.loanPrincipal || 0));
        const item = document.createElement("div");
        item.className = "asset-item";
        item.innerHTML = `<div><strong>${asset.name}</strong><span>每月 ${formatSigned(asset.monthlyIncome - asset.monthlyCost)}・售出可得 ${formatMoney(saleCash)}</span></div>`;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "出售";
        button.disabled = state.busy || state.ended;
        button.addEventListener("click", () => sellAsset(asset.instanceId));
        item.append(button);
        elements.assetList.append(item);
      });
    }
    elements.repay.disabled = state.busy || state.ended || player.bankDebt <= 0 || player.cash < Math.min(5000, player.bankDebt);
    elements.assetsModal.hidden = false;
  }

  function sellAsset(instanceId) {
    const player = human();
    const index = player.assets.findIndex((asset) => asset.instanceId === instanceId);
    if (index < 0 || state.busy || state.ended) return;
    const [asset] = player.assets.splice(index, 1);
    const gross = Math.round(asset.value * 0.7);
    const loan = asset.loanPrincipal || 0;
    const proceeds = Math.max(0, gross - loan);
    const shortfall = Math.max(0, loan - gross);
    player.cash += proceeds;
    player.bankDebt += shortfall;
    addLog(`${player.name}出售「${asset.name}」，扣除資產貸款後收回 ${formatMoney(proceeds)}${shortfall ? `，並留下 ${formatMoney(shortfall)} 信用缺口` : ""}。`);
    renderAll();
    openAssets();
  }

  function resetToIntro() {
    state = createEmptyState();
    elements.dice.textContent = "◈";
    elements.resultModal.hidden = true;
    elements.assetsModal.hidden = true;
    elements.instructionsModal.hidden = true;
    elements.introModal.hidden = false;
    showEvent({ type: "income", title: "選擇你的商業冒險者", description: "每位角色都有不同的起始財務狀態。選好後，第一回合就會開始。" });
    setRollEnabled(false);
    renderAll();
  }

  function bindControls() {
    document.querySelector('[data-action="roll"]').addEventListener("click", rollHuman);
    document.querySelector('[data-action="instructions"]').addEventListener("click", () => { elements.instructionsModal.hidden = false; });
    document.querySelector('[data-action="assets"]').addEventListener("click", openAssets);
    document.querySelector('[data-action="restart"]').addEventListener("click", resetToIntro);
    document.querySelector('[data-action="play-again"]').addEventListener("click", resetToIntro);

    document.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = button.closest(".modal");
        if (modal) modal.hidden = true;
      });
    });

    elements.repay.addEventListener("click", () => {
      const player = human();
      if (!player || state.busy || state.ended) return;
      repayBankDebt(player, 5000);
      renderAll();
      openAssets();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        [elements.instructionsModal, elements.assetsModal].forEach((modal) => { modal.hidden = true; });
      }
      if ((event.key === "Enter" || event.key === " ") && !elements.roll.disabled && !document.querySelector(".modal:not([hidden])")) {
        event.preventDefault();
        rollHuman();
      }
    });

    document.addEventListener("touchstart", (event) => {
      if (event.touches.length > 1) event.preventDefault();
    }, { passive: false, capture: true });
    document.addEventListener("dblclick", (event) => {
      if (!event.target.closest("a")) event.preventDefault();
    }, { passive: false, capture: true });
    ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
    });

    window.addEventListener("resize", syncViewportSize);
    window.addEventListener("orientationchange", () => window.setTimeout(syncViewportSize, 100));
    window.visualViewport?.addEventListener("resize", syncViewportSize);
  }

  function syncViewportSize() {
    const height = Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight);
    document.documentElement.style.setProperty("--empire-height", `${height}px`);
  }

  function sleep(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
})();
