(function () {
  "use strict";

  const GAME_ID = "microglow-business-empire";
  const GAME_TITLE = "微光商業帝國";
  const ELITE_NET_WORTH = 250000;
  const MAX_LOGS = 8;
  const TURN_SECONDS = 45;
  const PLAYER_STEP_MS = 300;
  const AI_STEP_MS = 220;
  const DICE_SPIN_FRAMES = 9;
  const DICE_FRAME_MS = 85;
  const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const portalStats = window.MicroglowGameStats;
  const ANIMATED_TOKEN_IDS = new Set(["starlight-merchant", "rune-artisan", "moon-investor", "ai-warden", "ai-pioneer", "ai-phantom"]);

  const TILE_META = {
    income: { label: "收入", icon: "💰" },
    expense: { label: "支出", icon: "🧾" },
    stock: { label: "股票", icon: "🏢" },
    realEstate: { label: "房產", icon: "🏠" },
    business: { label: "副業", icon: "🏪" },
    risk: { label: "風險", icon: "🌋" },
    loan: { label: "銀行", icon: "🏦" },
    learn: { label: "學習", icon: "🏛️" },
    gate: { label: "躍升門", icon: "🏰" },
    destiny: { label: "命運", icon: "🔮" }
  };

  const DIFFICULTY_CONFIG = {
    apprentice: {
      label: "新手",
      description: "AI 保留較多現金，決策節奏較溫和。",
      cashBonus: -4000,
      skillBonus: 0,
      strategies: ["conservative", "balanced", "balanced"]
    },
    guild: {
      label: "商會",
      description: "三種策略混合，適合第一次完整體驗。",
      cashBonus: 0,
      skillBonus: 0,
      strategies: ["conservative", "aggressive", "balanced"]
    },
    sovereign: {
      label: "王者",
      description: "AI 資源與能力提升，會更積極搶占高收益地標。",
      cashBonus: 7000,
      skillBonus: 1,
      strategies: ["balanced", "aggressive", "aggressive"]
    }
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

  const BASIC_TILE_LABELS = [
    "起點", "星幣薪資", "極光通訊", "裝備維修", "商學院", "魔藥攤", "商會分紅", "飛艇故障",
    "水晶套房", "微光銀行", "專案獎金", "飛龍科技", "命運卡", "年度稅費", "飛毯外送", "技能工坊",
    "精英之門", "授權收入", "符文店面", "市場震盪", "能源基金", "旺季獎金", "王城銀行", "設備汰換",
    "直播工坊", "機遇卡", "額外收入", "投資講堂", "浮空倉庫", "魔力風暴", "星界通訊", "旅費支出"
  ];

  const ELITE_TILE_LABELS = [
    "王者之門", "鳳凰控股", "巨龍風險", "雲端商塔", "帝國分紅", "傳送門網", "皇室命運", "併購支出",
    "王者學院", "星界能源", "終局之門", "龍港物流", "黑曜危機", "魔像工坊", "王城收益", "帝國銀行",
    "星辰命運", "商會控股", "擴張成本", "領袖研習"
  ];

  const BOARD_LAYOUTS = {
    basic: { size: 9, minX: 4.5, maxX: 95.5, minY: 5, maxY: 95 },
    elite: { size: 6, minX: 17.5, maxX: 82.5, minY: 23.5, maxY: 76.5 }
  };

  const CHARACTERS = [
    {
      id: "starlight-merchant",
      name: "星輝商旅",
      title: "星路遠征隊長",
      artIndex: 0,
      spriteId: "starlight-merchant",
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
      spriteId: "rune-artisan",
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
      spriteId: "moon-investor",
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

  const basicTiles = BASIC_TYPES.map((type, index) => ({ ...TILE_META[type], label: BASIC_TILE_LABELS[index], type, index }));
  const eliteTiles = ELITE_TYPES.map((type, index) => ({ ...TILE_META[type], label: ELITE_TILE_LABELS[index], type, index }));

  const elements = {
    boardFrame: document.querySelector("[data-board-frame]"),
    boardCameraStage: document.querySelector("[data-board-camera]"),
    board: document.querySelector("[data-board]"),
    cameraButtons: [...document.querySelectorAll("[data-camera-action]")],
    basicRing: document.querySelector('[data-ring="basic"]'),
    eliteRing: document.querySelector('[data-ring="elite"]'),
    tokens: document.querySelector("[data-tokens]"),
    landmarks: document.querySelector("[data-landmarks]"),
    tileInspector: document.querySelector("[data-tile-inspector]"),
    tileInspectorIcon: document.querySelector("[data-tile-inspector-icon]"),
    tileInspectorPosition: document.querySelector("[data-tile-inspector-position]"),
    tileInspectorName: document.querySelector("[data-tile-inspector-name]"),
    tileInspectorType: document.querySelector("[data-tile-inspector-type]"),
    boardCommand: document.querySelector("[data-board-command]"),
    boardCommandLabel: document.querySelector("[data-board-command-label]"),
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
    boardEventDock: document.querySelector("[data-board-event-dock]"),
    boardEventVisual: document.querySelector("[data-board-event-visual]"),
    boardEventIcon: document.querySelector("[data-board-event-icon]"),
    boardEventType: document.querySelector("[data-board-event-type]"),
    boardEventTitle: document.querySelector("[data-board-event-title]"),
    boardEventDescription: document.querySelector("[data-board-event-description]"),
    boardEventStats: document.querySelector("[data-board-event-stats]"),
    boardEventActions: document.querySelector("[data-board-event-actions]"),
    boardEventToggle: document.querySelector("[data-board-event-toggle]"),
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
    resultStats: document.querySelector("[data-result-stats]"),
    resultRanking: document.querySelector("[data-result-ranking]"),
    resultGuestNote: document.querySelector("[data-result-guest-note]"),
    playerSeats: document.querySelector("[data-player-seats]"),
    activeAvatar: document.querySelector("[data-active-avatar]"),
    activeEmblem: document.querySelector("[data-active-emblem]"),
    activeName: document.querySelector("[data-active-name]"),
    activePhase: document.querySelector("[data-active-phase]"),
    turnClock: document.querySelector("[data-turn-clock]"),
    turnTimer: document.querySelector("[data-turn-timer]"),
    focusButton: document.querySelector('[data-action="focus"]'),
    audioButton: document.querySelector('[data-action="audio"]'),
    orientationGuard: document.querySelector("[data-orientation-guard]"),
    orientationState: document.querySelector("[data-orientation-state]"),
    setupStages: [...document.querySelectorAll("[data-setup-stage]")],
    setupTabs: [...document.querySelectorAll("[data-setup-tab]")],
    difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
    difficultyCopy: document.querySelector("[data-difficulty-copy]"),
    setupCharacterNext: document.querySelector('[data-setup-next="3"]'),
    characterHint: document.querySelector("[data-character-hint]"),
    readyRoster: document.querySelector("[data-ready-roster]"),
    readySettings: document.querySelector("[data-ready-settings]"),
    startAdventure: document.querySelector('[data-action="start-adventure"]'),
    multiplayerModal: document.querySelector("[data-multiplayer-modal]"),
    multiplayerRoot: document.querySelector("[data-business-multiplayer-root]"),
    multiplayerTitle: document.querySelector("[data-multiplayer-title]")
  };

  let setupState = createSetupState();
  let state = createEmptyState();
  let instanceSequence = 0;
  let turnTimerId = null;
  let audioEngine = null;
  let musicTimerId = null;
  let musicStep = 0;
  let portraitBypass = false;
  let boardFocused = false;
  let tileInspectorTimerId = null;
  let arrivalTimerId = null;
  let audioEnabled = readAudioPreference();
  let playerNickname = "冒險者";
  let nicknameRequestSequence = 0;
  let lastBoardTrackKey = "";
  let boardCamera = null;

  init();

  function init() {
    portalStats.ensureGame(GAME_ID, GAME_TITLE);
    syncViewportSize();
    renderBoard();
    initBoardCamera();
    renderCharacters();
    renderSetup();
    bindControls();
    updateAudioButton();
    syncGuestUpgradeUI();
    renderAll();
    const matchId = new URLSearchParams(window.location.search).get("match");
    if (matchId) {
      document.querySelector("[data-account-modal]")?.setAttribute("hidden", "hidden");
      addLog("正在連線到多人比賽…", false);
      initConnectedMatch(matchId);
    } else {
      addLog("歡迎來到微光城，請先選擇角色。", false);
    }
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

  function createSetupState() {
    return {
      step: 1,
      mode: "solo",
      difficulty: "guild",
      characterId: null
    };
  }

  function createEmptyState() {
    return {
      started: false,
      busy: false,
      ended: false,
      round: 1,
      actors: [],
      logs: [],
      activeActorId: null,
      phase: "waiting",
      secondsLeft: TURN_SECONDS,
      turnExpired: false,
      movingActorId: null,
      arrivalActorId: null,
      difficulty: setupState?.difficulty || "guild",
      connected: false,
      matchId: null,
      myUserId: null,
      turnDeadlineAt: null
    };
  }

  function makeActor(config, overrides = {}) {
    return {
      id: config.id,
      name: config.name,
      nickname: overrides.nickname || config.nickname || config.name,
      avatar: config.avatar,
      title: config.title || "商會競爭者",
      artIndex: Number(config.artIndex) || 0,
      spriteId: overrides.spriteId || config.spriteId || config.id,
      variant: overrides.variant || config.variant || "",
      seat: Number(overrides.seat) || 0,
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
    CHARACTERS.forEach((character) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "character-card";
      button.dataset.characterId = character.id;
      button.classList.toggle("is-selected", setupState.characterId === character.id);
      button.setAttribute("aria-pressed", String(setupState.characterId === character.id));
      button.innerHTML =
        '<span class="character-art" style="--sprite:url(\'./assets/tokens/' + character.spriteId + '.png\')" aria-hidden="true"></span>' +
        "<strong>" + character.name + "｜" + character.title + "</strong>" +
        "<p>" + character.perk + "</p>" +
        "<small>" + character.detail + "</small>" +
        '<b class="character-selected-mark">已選擇</b>';
      button.addEventListener("click", () => {
        setupState.characterId = character.id;
        ensureAudio();
        playEffect("select");
        renderCharacters();
        renderSetup();
      });
      elements.characterGrid.append(button);
    });
  }

  function renderSetup() {
    elements.setupStages.forEach((stage) => {
      stage.hidden = Number(stage.dataset.setupStage) !== setupState.step;
    });
    elements.setupTabs.forEach((tab) => {
      const step = Number(tab.dataset.setupTab);
      tab.setAttribute("aria-current", step === setupState.step ? "step" : "false");
      tab.classList.toggle("is-complete", step < setupState.step);
    });
    elements.difficultyButtons.forEach((button) => {
      const selected = button.dataset.difficulty === setupState.difficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const difficulty = DIFFICULTY_CONFIG[setupState.difficulty];
    elements.difficultyCopy.textContent = difficulty.description;
    const selected = CHARACTERS.find((character) => character.id === setupState.characterId);
    elements.setupCharacterNext.disabled = !selected;
    elements.characterHint.textContent = selected ? "已選擇：" + selected.name : "請選擇一名角色";
    if (setupState.step === 3) renderReadyRoster();
  }

  function goToSetupStep(step) {
    const target = Math.max(1, Math.min(3, Number(step) || 1));
    if (target === 3 && !setupState.characterId) return;
    setupState.step = target;
    ensureAudio();
    playEffect("click");
    renderSetup();
  }

  function renderReadyRoster() {
    const selected = CHARACTERS.find((character) => character.id === setupState.characterId) || CHARACTERS[0];
    const difficulty = DIFFICULTY_CONFIG[setupState.difficulty];
    const strategyLabels = { conservative: "保守型", balanced: "平衡型", aggressive: "進攻型" };
    const aiConfigs = [
      { avatar: "🛡️", name: "銀盾理財師", baseCash: 33000, baseSkill: 1 },
      { avatar: "🔥", name: "赤焰開拓者", baseCash: 30000, baseSkill: 0 },
      { avatar: "🜂", name: "幻影投機客", baseCash: 32000, baseSkill: 1 }
    ];
    const roster = [
      {
        avatar: selected.avatar,
        name: playerNickname,
        detail: "P1・你・" + selected.name + "・" + selected.title,
        meta: `起始 ${formatMoney(selected.cash)}・能力 Lv.${selected.skill}`
      },
      ...aiConfigs.map((config, index) => {
        const strategy = difficulty.strategies[index];
        return {
          avatar: config.avatar,
          name: config.name,
          detail: `P${index + 2}・AI・${strategyLabels[strategy] || "平衡型"}策略`,
          meta: `起始 ${formatMoney(config.baseCash + difficulty.cashBonus)}・能力 Lv.${config.baseSkill + difficulty.skillBonus}`
        };
      })
    ];
    elements.readyRoster.replaceChildren();
    roster.forEach((member, index) => {
      const item = document.createElement("li");
      item.innerHTML = '<span class="ready-player-index">' + (index + 1) + '</span><b>' + escapeHtml(member.avatar) + '</b><div><strong>' + escapeHtml(member.name) + '</strong><small>' + escapeHtml(member.detail) + '</small><small class="ready-member-meta">' + escapeHtml(member.meta) + '</small></div><em>' + (index === 0 ? "READY" : "AI") + "</em>";
      elements.readyRoster.append(item);
    });
    elements.readySettings.innerHTML =
      "<div><span>模式</span><strong>單人競賽</strong></div>" +
      "<div><span>難度</span><strong>" + difficulty.label + "</strong></div>" +
      "<div><span>地圖人數</span><strong>4 / 4</strong></div>" +
      "<div><span>回合時間</span><strong>45 秒</strong></div>";
  }
  function startGame(characterId) {
    const selected = CHARACTERS.find((character) => character.id === characterId) || CHARACTERS[0];
    const difficulty = DIFFICULTY_CONFIG[setupState.difficulty] || DIFFICULTY_CONFIG.guild;
    const conservative = {
      id: "ai-warden",
      name: "銀盾理財師",
      title: "王城風險守門人",
      artIndex: (selected.artIndex + 1) % 3,
      spriteId: "ai-warden",
      avatar: "🛡️",
      cash: 33000 + difficulty.cashBonus,
      salary: 4800,
      baseExpense: 2850,
      skill: 1 + difficulty.skillBonus
    };
    const aggressive = {
      id: "ai-pioneer",
      name: "赤焰開拓者",
      title: "烈焰商路先鋒",
      artIndex: (selected.artIndex + 2) % 3,
      spriteId: "ai-pioneer",
      avatar: "🔥",
      cash: 30000 + difficulty.cashBonus,
      salary: 5200,
      baseExpense: 3300,
      skill: difficulty.skillBonus
    };
    const opportunist = {
      id: "ai-phantom",
      name: "幻影投機客",
      title: "星霧市場觀察者",
      artIndex: selected.artIndex,
      spriteId: "ai-phantom",
      avatar: "🜂",
      cash: 32000 + difficulty.cashBonus,
      salary: 4900,
      baseExpense: 3050,
      skill: 1 + difficulty.skillBonus
    };

    state = createEmptyState();
    state.started = true;
    state.difficulty = setupState.difficulty;
    state.actors = [
      makeActor(selected, { isHuman: true, nickname: playerNickname, seat: 0, color: "#55e6ff", position: 0 }),
      makeActor(conservative, { seat: 1, strategy: difficulty.strategies[0], color: "#7ef7bd", position: 0 }),
      makeActor(aggressive, { seat: 2, strategy: difficulty.strategies[1], color: "#ff7ac8", position: 0 }),
      makeActor(opportunist, { seat: 3, strategy: difficulty.strategies[2], variant: "spectral", color: "#b68cff", position: 0 })
    ];
    state.activeActorId = selected.id;
    state.phase = "roll";
    state.secondsLeft = TURN_SECONDS;
    lastBoardTrackKey = "";
    setBoardFocus(false);
    ensureAudio();
    playEffect("start");
    elements.introModal.hidden = true;
    elements.resultModal.hidden = true;
    elements.dice.textContent = "◈";
    addLog(`${actorDisplayName(human())}以${selected.name}身分進入微光城，商業冒險開始。`, false);
    showEvent({
      type: "income",
      icon: "✦",
      label: "第一回合",
      title: "能量航線已開啟",
      description: "擲骰前進，落點事件處理完畢後會進行月度現金流結算。"
    });
    renderAll();
    setRollEnabled(true);
    startTurnTimer();
  }

  function renderBoard() {
    renderRing(elements.basicRing, basicTiles, "basic");
    renderRing(elements.eliteRing, eliteTiles, "elite");
  }

  function renderRing(container, tiles, circle) {
    container.replaceChildren();
    tiles.forEach((tile, index) => {
      const point = squarePoint(circle, index);
      const cell = document.createElement("div");
      cell.className = `tile ${tile.type}`;
      if (point.corner) cell.classList.add("is-corner");
      cell.style.setProperty("--x", `${point.left}%`);
      cell.style.setProperty("--y", `${point.top}%`);
      cell.style.setProperty("--tile-prop", `url("./assets/tile-props/${tile.type}.png")`);
      cell.title = tile.label;
      cell.dataset.tileIndex = String(index);
      cell.dataset.edge = point.edge;
      cell.setAttribute("aria-label", `${index + 1}. ${tile.label}`);
      cell.innerHTML = `<span class="tile-cap"></span><span class="tile-index">${index + 1}</span><span class="tile-building" aria-hidden="true"><i></i><i></i><i></i></span><span class="tile-icon">${tile.icon}</span><span class="tile-label">${tile.label}</span>`;
      cell.addEventListener("click", () => showTileInspector(tile, index, circle));
      container.append(cell);
    });
  }

  function squarePoint(circle, index, inward = 0) {
    const layout = BOARD_LAYOUTS[circle] || BOARD_LAYOUTS.basic;
    const coordinates = ringCoordinates(layout.size);
    const coordinate = coordinates[index % coordinates.length];

    const left = layout.minX + (coordinate.col / (layout.size - 1)) * (layout.maxX - layout.minX);
    const top = layout.minY + (coordinate.row / (layout.size - 1)) * (layout.maxY - layout.minY);
    const edge = coordinate.row === 0
      ? "top"
      : coordinate.col === layout.size - 1
        ? "right"
        : coordinate.row === layout.size - 1
          ? "bottom"
          : "left";
    return {
      left: left + (50 - left) * inward,
      top: top + (50 - top) * inward,
      edge,
      corner: (coordinate.row === 0 || coordinate.row === layout.size - 1)
        && (coordinate.col === 0 || coordinate.col === layout.size - 1)
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

  function showTileInspector(tile, index, circle) {
    if (tileInspectorTimerId !== null) window.clearTimeout(tileInspectorTimerId);
    elements.tileInspectorIcon.textContent = tile.icon;
    elements.tileInspectorPosition.textContent = (circle === "elite" ? "精英內城" : "基礎城區") + "・第 " + (index + 1) + " 格";
    elements.tileInspectorName.textContent = tile.label;
    elements.tileInspectorType.textContent = TILE_META[tile.type]?.label || "城市事件";
    elements.tileInspector.hidden = false;
    tileInspectorTimerId = window.setTimeout(hideTileInspector, 3200);
  }

  function hideTileInspector() {
    if (tileInspectorTimerId !== null) window.clearTimeout(tileInspectorTimerId);
    tileInspectorTimerId = null;
    elements.tileInspector.hidden = true;
  }
  function renderAll() {
    renderStats();
    renderLandmarks();
    renderTokens();
    renderTurnStage();
    syncExperienceState();
    renderRanking();
    renderLogs();
  }

  function syncExperienceState(stageMode = elements.boardEventDock?.dataset.stageMode || "overview", hasActions = elements.boardEventDock?.classList.contains("has-actions")) {
    const actor = activeActor();
    const phase = state.phase || "waiting";
    const playerTurn = Boolean(state.started && !state.ended && actor?.isHuman);
    const movementPhase = phase === "dice" || phase === "moving";
    const decisionPhase = phase === "decision" || Boolean(hasActions);
    const actionMeta = nextActionMeta(actor, phase, playerTurn, decisionPhase, movementPhase);

    document.body.dataset.gamePhase = phase;
    document.body.dataset.boardStage = stageMode;
    document.body.classList.toggle("player-turn-active", playerTurn);
    document.body.classList.toggle("decision-active", decisionPhase);
    document.body.classList.toggle("movement-active", movementPhase);
    document.body.classList.toggle("ai-turn-active", Boolean(actor && !actor.isHuman));

    if (elements.boardFrame) {
      elements.boardFrame.dataset.gamePhase = phase;
      elements.boardFrame.dataset.stageMode = stageMode;
    }
    if (elements.boardCommand) {
      elements.boardCommand.dataset.stageMode = stageMode;
      elements.boardCommand.dataset.actionIntent = actionMeta.intent;
      if (actionMeta.label) elements.boardCommand.dataset.actionLabel = actionMeta.label;
      else elements.boardCommand.removeAttribute("data-action-label");
    }
  }

  function nextActionMeta(actor, phase, playerTurn, decisionPhase, movementPhase) {
    if (!state.started || state.ended || !actor) return { intent: "idle", label: "" };
    if (movementPhase) return { intent: "watch", label: phase === "dice" ? "\u9ab0\u5b50\u6f14\u51fa\u4e2d" : "\u89d2\u8272\u79fb\u52d5\u4e2d" };
    if (playerTurn && phase === "roll") return { intent: "roll", label: "\u4e0b\u4e00\u6b65\uff1a\u64f2\u9ab0" };
    if (playerTurn && decisionPhase) return { intent: "event", label: "\u4e0b\u4e00\u6b65\uff1a\u8655\u7406\u4e8b\u4ef6" };
    if (phase === "settling" || phase === "turn_end") return { intent: "settle", label: "\u73fe\u91d1\u6d41\u7d50\u7b97" };
    if (!actor.isHuman || phase === "ai") return { intent: "wait", label: "\u7b49\u5f85\u5c0d\u624b" };
    return { intent: "idle", label: "" };
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
      document.querySelectorAll(`[data-stat="${key}"], [data-mobile-stat="${key}"]`).forEach((target) => {
        target.textContent = formatMoney(value);
      });
    });
    document.querySelector('[data-stat="turn"]').textContent = String(state.round);
    elements.circleLabel.textContent = empty || player.circle === "basic" ? "基礎城區" : "精英內城";
    const current = activeActor();
    elements.turnLabel.textContent = state.ended ? "本局已結束" : current ? `輪到 ${actorDisplayName(current)}・${phaseLabel()}` : "等待選擇角色";
    elements.goalProgress.textContent = `${formatMoney(values.passive)} / ${formatMoney(values.expense)}`;
    elements.goalMeter.style.width = `${Math.min(100, (values.passive / Math.max(1, values.expense)) * 100)}%`;
    elements.cashflowPreview.textContent = `淨現金流 ${formatSigned(empty ? 0 : monthlyCashflow(player))}`;
    elements.playerName.textContent = empty ? "尚未選角" : actorDisplayName(player);
    elements.playerTitle.textContent = empty ? "等待進入微光城" : `${player.name}・${player.title}`;
    elements.playerPortrait.className = "player-portrait";
    if (!empty && player.spriteId) elements.playerPortrait.style.setProperty("--sprite", `url("./assets/tokens/${player.spriteId}.png")`);
    else elements.playerPortrait.style.removeProperty("--sprite");
  }

  function buildingLevelFor(asset) {
    if (asset.boardCircle === "elite") return 3;
    if (asset.type === "realEstate" || Number(asset.value || 0) >= 100000) return 2;
    return 1;
  }

  function renderLandmarks() {
    elements.landmarks.replaceChildren();
    document.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("is-owned", "has-holdings", "has-multiple-owners");
      tile.style.removeProperty("--owner-color");
      tile.style.removeProperty("--owner-color-secondary");
      delete tile.dataset.buildingLevel;
      delete tile.dataset.ownerCount;
    });
    const landmarkCounts = new Map();
    const holdingsByTile = new Map();
    state.actors.forEach((actor) => {
      actor.assets.forEach((asset) => {
        if (!Number.isInteger(asset.boardPosition)) return;
        const circle = asset.boardCircle === "elite" ? "elite" : "basic";
        const isElite = circle === "elite";
        const count = isElite ? eliteTiles.length : basicTiles.length;
        const tileIndex = asset.boardPosition % count;
        const point = squarePoint(circle, tileIndex, isElite ? 0.2 : 0.14);
        const key = `${circle}:${tileIndex}`;
        const stack = landmarkCounts.get(key) || 0;
        const level = buildingLevelFor(asset);
        landmarkCounts.set(key, stack + 1);

        const holding = holdingsByTile.get(key) || { circle, tileIndex, owners: new Map(), level: 0 };
        holding.owners.set(actor.id, actor.color);
        holding.level = Math.max(holding.level, level);
        holdingsByTile.set(key, holding);

        const marker = document.createElement("div");
        marker.className = `landmark ${asset.type}`;
        marker.dataset.stack = String(Math.min(stack, 2));
        marker.dataset.buildingLevel = String(level);
        marker.dataset.ownerId = actor.id;
        marker.dataset.assetType = asset.type;
        marker.style.setProperty("--owner-color", actor.color);
        marker.style.setProperty("--x", `${point.left}%`);
        marker.style.setProperty("--y", `${point.top}%`);
        if (["stock", "realEstate", "business"].includes(asset.type)) {
          marker.style.setProperty("--landmark-prop", `url("./assets/tile-props/levels/${asset.type}-level-${level}.png")`);
        } else {
          marker.style.setProperty("--landmark-prop", `url("./assets/tile-props/${asset.type}.png")`);
        }
        marker.innerHTML = `<span class="landmark-art" aria-hidden="true"></span><i></i><b>Lv.${level}</b>`;
        marker.title = `${actorDisplayName(actor)}持有：${asset.name}・建築 Lv.${level}`;
        elements.landmarks.append(marker);
      });
    });

    holdingsByTile.forEach((holding) => {
      const ring = holding.circle === "elite" ? elements.eliteRing : elements.basicRing;
      const tile = ring.children[holding.tileIndex];
      if (!tile) return;
      const colors = [...holding.owners.values()];
      tile.classList.add("is-owned", "has-holdings");
      tile.classList.toggle("has-multiple-owners", colors.length > 1);
      tile.dataset.buildingLevel = String(holding.level);
      tile.dataset.ownerCount = String(colors.length);
      tile.style.setProperty("--owner-color", colors[0]);
      if (colors[1]) tile.style.setProperty("--owner-color-secondary", colors[1]);
    });
  }

  function renderTokens() {
    elements.tokens.replaceChildren();
    const occupancy = new Map();
    state.actors.filter((actor) => !actor.eliminated).forEach((actor, index) => {
      const point = tokenPoint(actor);
      const key = `${actor.circle}:${actor.position}`;
      const stackIndex = occupancy.get(key) || 0;
      occupancy.set(key, stackIndex + 1);
      const token = document.createElement("div");
      token.className = "token";
      if (actor.id === state.activeActorId) token.classList.add("is-active");
      if (actor.id === state.movingActorId) token.classList.add("is-moving");
      if (actor.id === state.arrivalActorId) token.classList.add("is-arriving");
      if (ANIMATED_TOKEN_IDS.has(actor.spriteId)) token.classList.add("has-sprite-sheet");
      token.dataset.tokenIndex = String(index);
      token.dataset.actorId = actor.id;
      token.dataset.stackIndex = String(Math.min(3, stackIndex));
      token.dataset.variant = actor.variant || "";
      token.dataset.edge = point.edge;
      token.style.setProperty("--token-color", actor.color);
      token.style.setProperty("--token-sprite", `url("./assets/tokens/${actor.spriteId}.png")`);
      if (ANIMATED_TOKEN_IDS.has(actor.spriteId)) token.style.setProperty("--token-sheet", `url("./assets/tokens/animated/${actor.spriteId}-sheet.png")`);
      token.style.setProperty("--x", `${point.left}%`);
      token.style.setProperty("--y", `${point.top}%`);
      token.innerHTML = `
        <span class="pawn-name">${escapeHtml(actorDisplayName(actor))}</span>
        <span class="pawn-figure"><b>${actor.avatar}</b></span>
        <i class="pawn-base"></i>
        <em class="pawn-turn">行動中</em>
      `;
      token.title = `${actorDisplayName(actor)}・${actor.name}・${actor.circle === "elite" ? "精英內城" : "基礎城區"}第 ${actor.position + 1} 格`;
      token.setAttribute("role", "img");
      token.setAttribute("aria-label", token.title);
      elements.tokens.append(token);
    });
    scheduleActiveTokenTracking();
  }

  function tokenPoint(actor) {
    const isElite = actor.circle === "elite";
    const count = isElite ? eliteTiles.length : basicTiles.length;
    return squarePoint(isElite ? "elite" : "basic", actor.position % count, isElite ? 0.11 : 0.09);
  }

  function activeActor() {
    return state.actors.find((actor) => actor.id === state.activeActorId) || null;
  }

  function phaseLabel() {
    const labels = {
      waiting: "等待開局",
      roll: "等待擲骰",
      dice: "骰子轉動",
      moving: "逐格前進",
      decision: "處理事件",
      settling: "現金流結算",
      ai: "對手行動",
      turn_end: "回合結算"
    };
    return labels[state.phase] || "準備中";
  }

  function renderTurnStage() {
    const actor = activeActor();
    elements.activeName.textContent = actor ? actorDisplayName(actor) : "等待玩家";
    elements.activePhase.textContent = actor ? actorStatusLine(actor, phaseLabel()) : "選角後開始回合";
    elements.activeEmblem.textContent = actor?.avatar || "♙";
    elements.activeAvatar.className = "turn-avatar";
    elements.activeAvatar.dataset.variant = actor?.variant || "";
    if (actor?.spriteId) elements.activeAvatar.style.setProperty("--sprite", `url("./assets/tokens/${actor.spriteId}.png")`);
    else elements.activeAvatar.style.removeProperty("--sprite");
    elements.turnClock.classList.toggle("is-warning", Boolean((actor?.isHuman || state.connected) && state.secondsLeft <= 10));
    elements.turnClock.classList.toggle("is-paused", !state.connected && (!actor?.isHuman || !["roll", "decision"].includes(state.phase)));
    elements.turnClock.style.setProperty("--turn-progress", `${Math.max(0, Math.min(100, (state.secondsLeft / TURN_SECONDS) * 100))}%`);
    elements.turnTimer.textContent = (actor?.isHuman || state.connected) ? String(state.secondsLeft) : "AI";
    elements.boardCommand.dataset.phase = state.phase;
    syncExperienceState();
    elements.boardCommand.classList.toggle("is-human-turn", Boolean(actor?.isHuman));
    elements.boardCommandLabel.textContent = !actor ? "點擊骰子開始" : state.phase === "roll" ? "輪到你・擲骰前進" : state.phase === "decision" ? "處理落點事件" : state.phase === "ai" ? `${actorDisplayName(actor)}擲骰中` : phaseLabel();

    elements.playerSeats.replaceChildren();
    state.actors.forEach((player) => {
      const seat = document.createElement("div");
      seat.className = "player-seat";
      if (player.id === state.activeActorId) seat.classList.add("is-current");
      if (player.eliminated) seat.classList.add("is-eliminated");
      seat.dataset.variant = player.variant || "";
      seat.style.setProperty("--seat-color", player.color);
      seat.innerHTML = `
        <span class="seat-avatar" style="--sprite:url('./assets/tokens/${player.spriteId}.png')"><b>${player.avatar}</b></span>
        <span class="seat-copy"><small>P${player.seat + 1}・${player.isHuman ? "你" : (state.connected ? `P${player.seat + 1}` : "AI")}</small><strong>${escapeHtml(actorDisplayName(player))}</strong><em>${escapeHtml(actorStatusLine(player, player.eliminated ? "已退場" : player.id === state.activeActorId ? phaseLabel() : "等待中"))}</em></span>
      `;
      elements.playerSeats.append(seat);
    });
  }

  function renderRanking() {
    elements.ranking.replaceChildren();
    [...state.actors]
      .sort((a, b) => netWorth(b) - netWorth(a))
      .forEach((actor, index) => {
        const item = document.createElement("li");
        item.classList.toggle("is-player", Boolean(actor.isHuman));
        item.classList.toggle("is-turn", actor.id === state.activeActorId);
        if (actor.isHuman) item.setAttribute("aria-current", "true");
        item.innerHTML = `<span>${index + 1}</span><span>${actor.avatar} ${escapeHtml(actorDisplayName(actor))}${actor.eliminated ? "（退場）" : ""}</span><strong>${formatMoney(netWorth(actor))}</strong>`;
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

  // Shared tile-outcome rolls used by both the human decision UI (resolveHumanTile)
  // and the AI heuristics (resolveAiTile) so the two paths can't drift apart.
  function rollIncomeEvent() {
    return randomItem(INCOME_EVENTS);
  }

  function rollExpenseEvent(actor) {
    const [title, baseAmount] = randomItem(EXPENSE_EVENTS);
    const reduction = Math.min(0.3, actor.skill * 0.04);
    const amount = Math.round(baseAmount * (1 - reduction));
    return { title, amount, reduction };
  }

  function rollRiskEvent(actor) {
    const successChance = Math.min(0.75, 0.48 + actor.skill * 0.05);
    const success = Math.random() < successChance;
    const magnitude = actor.circle === "elite" ? randomInt(7000, 15000) : randomInt(2200, 6200);
    return { success, amount: success ? magnitude : -magnitude, successChance };
  }

  function rollDestinyEvent(actor) {
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
    return randomItem(outcomes);
  }

  function pickAssetOffer(actor, type) {
    const source = actor.circle === "elite" ? ELITE_ASSETS : BASIC_ASSETS;
    const template = randomItem(source[type]);
    const discount = discountFor(actor);
    const price = Math.round(template.price * (1 - discount));
    return { template, price, discount, netIncome: template.monthlyIncome - template.monthlyCost };
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

  const STAGE_LABELS = {
    overview: "棋盤總覽",
    rolling: "命運骰",
    moving: "逐格移動",
    event: "落點事件",
    decision: "等待決策",
    result: "結果結算",
    "next-turn": "回合交接"
  };

  function stageModeFor(event, actions) {
    if (event.stageMode && STAGE_LABELS[event.stageMode]) return event.stageMode;
    if (actions.length) return "decision";
    if (state.phase === "dice") return "rolling";
    if (state.phase === "moving") return "moving";
    if (["ai", "settling", "turn_end"].includes(state.phase)) return "next-turn";
    if (state.phase === "roll" || state.phase === "waiting") return "overview";
    return "event";
  }

  function showEvent(event, actions = [], stats = []) {
    elements.eventCard.dataset.eventType = event.type || "income";
    elements.eventCard.classList.toggle("is-waiting", Boolean(event.waiting));
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
    renderEventActions(elements.eventActions, []);
    syncBoardEvent(event, actions, stats, stageModeFor(event, actions));
    if (state.started && actions.length && activeActor()?.isHuman) playEffect(event.type || "event");
    syncMobileEventDrawer(false);
  }

  function renderEventActions(container, actions) {
    container?.replaceChildren();
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.disabled = Boolean(action.disabled);
      button.addEventListener("click", (clickEvent) => {
        closeMobileEventDrawer();
        setBoardEventExpanded(false);
        action.run(clickEvent);
      }, { once: true });
      container.append(button);
    });
  }

  function syncBoardEvent(event, actions, stats, stageMode = stageModeFor(event, actions)) {
    if (!elements.boardEventDock) return;
    const eventType = event.type || "income";
    elements.boardEventDock.dataset.eventType = eventType;
    elements.boardEventDock.dataset.stageMode = stageMode;
    elements.boardEventDock.dataset.stageLabel = STAGE_LABELS[stageMode] || STAGE_LABELS.event;
    elements.boardEventDock.classList.toggle("is-waiting", Boolean(event.waiting));
    elements.boardEventVisual.dataset.eventType = eventType;
    elements.boardEventIcon.textContent = event.icon || TILE_META[eventType]?.icon || "✦";
    elements.boardEventType.textContent = event.label || TILE_META[eventType]?.label || "城市事件";
    elements.boardEventTitle.textContent = event.title;
    elements.boardEventDescription.textContent = event.description;
    elements.boardEventStats.hidden = stats.length === 0;
    elements.boardEventStats.replaceChildren();
    stats.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      elements.boardEventStats.append(item);
    });
    renderEventActions(elements.boardEventActions, actions);
    const hasEnabledActions = actions.some((action) => !action.disabled);
    const compactModes = ["overview", "rolling", "moving", "next-turn"];
    const isCompact = compactModes.includes(stageMode) && !hasEnabledActions;
    elements.boardEventDock.classList.toggle("has-actions", hasEnabledActions);
    elements.boardEventDock.classList.toggle("is-actionable", hasEnabledActions || stageMode === "decision");
    elements.boardEventDock.classList.toggle("is-compact", isCompact);
    syncExperienceState(stageMode, hasEnabledActions);
    if (isMobilePortrait()) setBoardEventExpanded(hasEnabledActions || stageMode === "result");
  }

  function updateBoardStage(stageMode, event, stats = []) {
    syncBoardEvent({ ...event, stageMode }, [], stats, stageMode);
  }

  function isMobilePortrait() {
    return window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
  }

  function setBoardEventExpanded(expanded) {
    if (!elements.boardEventDock || !elements.boardEventToggle) return;
    const next = Boolean(expanded && isMobilePortrait());
    elements.boardEventDock.classList.toggle("is-expanded", next);
    elements.boardEventToggle.setAttribute("aria-expanded", String(next));
    elements.boardEventToggle.setAttribute("aria-label", next ? "收合棋盤事件提示" : "展開棋盤事件提示");
  }

  function isMobileLandscape() {
    return window.matchMedia("(max-width: 900px) and (orientation: landscape)").matches;
  }

  function syncMobileEventDrawer(shouldOpen) {
    document.body.classList.toggle("mobile-event-open", Boolean(shouldOpen) && isMobileLandscape());
  }

  function closeMobileEventDrawer() {
    document.body.classList.remove("mobile-event-open");
  }

  function readAudioPreference() {
    try {
      return window.localStorage.getItem("microglow-business-audio") !== "off";
    } catch {
      return true;
    }
  }

  function getAudioEngine() {
    if (!audioEnabled) return null;
    if (!audioEngine) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      audioEngine = { context, master };
    }
    if (audioEngine.context.state === "suspended") {
      audioEngine.context.resume().catch(() => {});
    }
    return audioEngine;
  }

  function ensureAudio() {
    const engine = getAudioEngine();
    if (engine) startMusic();
    return engine;
  }

  function playTone(frequency, duration = 0.16, volume = 0.025, delay = 0, type = "sine") {
    const engine = getAudioEngine();
    if (!engine) return;
    const { context, master } = engine;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function startMusic() {
    if (!audioEnabled || musicTimerId !== null) return;
    const notes = [
      [164.81, 246.94, 329.63],
      [146.83, 220, 293.66],
      [130.81, 196, 261.63],
      [146.83, 220, 329.63]
    ];
    const playMeasure = () => {
      const chord = notes[musicStep % notes.length];
      chord.forEach((note, index) => playTone(note, 1.35, index === 0 ? 0.012 : 0.007, index * 0.05, index === 0 ? "triangle" : "sine"));
      musicStep += 1;
    };
    playMeasure();
    musicTimerId = window.setInterval(playMeasure, 1500);
  }

  function stopMusic() {
    if (musicTimerId !== null) {
      window.clearInterval(musicTimerId);
      musicTimerId = null;
    }
  }

  function playEffect(name) {
    if (!audioEnabled) return;
    const effect = {
      click: [[392, 0], [523.25, 0.07]],
      select: [[440, 0], [659.25, 0.08]],
      start: [[261.63, 0], [392, 0.09], [523.25, 0.18], [783.99, 0.28]],
      dice: [[110, 0], [146.83, 0.08], [196, 0.16]],
      step: [[246.94, 0]],
      income: [[392, 0], [523.25, 0.08], [659.25, 0.16]],
      gate: [[329.63, 0], [493.88, 0.1], [783.99, 0.21]],
      expense: [[220, 0], [174.61, 0.1]],
      risk: [[185, 0], [138.59, 0.12]],
      stock: [[293.66, 0], [440, 0.1]],
      realEstate: [[261.63, 0], [392, 0.1]],
      business: [[329.63, 0], [493.88, 0.1]],
      loan: [[196, 0], [293.66, 0.12]],
      learn: [[440, 0], [587.33, 0.1]],
      destiny: [[349.23, 0], [554.37, 0.1]],
      buy: [[392, 0], [587.33, 0.08], [783.99, 0.17]],
      victory: [[261.63, 0], [329.63, 0.1], [392, 0.2], [523.25, 0.32], [783.99, 0.47]],
      lose: [[220, 0], [185, 0.16], [146.83, 0.34]]
    }[name] || [[330, 0], [440, 0.09]];
    effect.forEach(([frequency, delay], index) => {
      playTone(frequency, name === "step" ? 0.06 : 0.18, name === "step" ? 0.012 : 0.03, delay, index % 2 ? "sine" : "triangle");
    });
  }

  function toggleAudio() {
    audioEnabled = !audioEnabled;
    try {
      window.localStorage.setItem("microglow-business-audio", audioEnabled ? "on" : "off");
    } catch {}
    if (audioEnabled) {
      ensureAudio();
      playEffect("select");
    } else {
      stopMusic();
      audioEngine?.context.suspend().catch(() => {});
    }
    updateAudioButton();
  }

  function updateAudioButton() {
    elements.audioButton.textContent = audioEnabled ? "♫ 音樂：開" : "♫ 音樂：關";
    elements.audioButton.setAttribute("aria-pressed", String(audioEnabled));
  }

  function initBoardCamera() {
    if (!window.MicroglowBoardCamera || !elements.boardFrame || !elements.boardCameraStage || !elements.board) return;
    const dragHint = document.querySelector("[data-board-drag-hint]");
    if (dragHint) elements.boardFrame.append(dragHint);
    elements.boardFrame.append(elements.boardEventDock);
    boardCamera = window.MicroglowBoardCamera.create({
      frame: elements.boardFrame,
      stage: elements.boardCameraStage,
      board: elements.board,
      onFollowChange(following) {
        const followButton = elements.cameraButtons.find((button) => button.dataset.cameraAction === "recenter");
        if (!followButton) return;
        followButton.classList.toggle("is-suspended", !following);
        const label = followButton.querySelector("b");
        if (label) label.textContent = following ? "跟隨" : "返回";
      }
    });
  }

  function preferredCameraScale() {
    const width = Math.floor(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth);
    const height = Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight);
    if (width <= 900 && height > width) return boardFocused ? 1.34 : 1.12;
    if (width <= 900) return boardFocused ? 1.28 : 1;
    return boardFocused ? 1.16 : undefined;
  }

  function followActiveActor(force = false) {
    const actor = activeActor();
    if (!boardCamera || !state.started || !actor) return;
    const point = tokenPoint(actor);
    boardCamera.focusPercent(point.left, point.top, { force, scale: preferredCameraScale() });
  }

  function setBoardFocus(enabled) {
    boardFocused = Boolean(enabled && state.started);
    document.body.classList.toggle("board-focus-mode", boardFocused);
    elements.focusButton.textContent = boardFocused ? "返回全圖" : "放大棋盤";
    elements.focusButton.setAttribute("aria-pressed", String(boardFocused));
    boardCamera?.resumeFollow();
    window.requestAnimationFrame(() => {
      boardCamera?.refresh();
      followActiveActor(true);
    });
  }

  function centerActiveToken() {
    boardCamera?.resumeFollow();
    followActiveActor(true);
  }

  function scheduleActiveTokenTracking() {
    if (!state.started || !boardCamera) return;
    const actor = activeActor();
    if (!actor) return;
    const trackKey = `${actor.id}:${actor.circle}:${actor.position}:${state.movingActorId || "still"}`;
    if (trackKey === lastBoardTrackKey) return;
    lastBoardTrackKey = trackKey;
    window.requestAnimationFrame(() => followActiveActor(false));
  }

  function stopTurnTimer() {
    if (turnTimerId !== null) {
      window.clearInterval(turnTimerId);
      turnTimerId = null;
    }
  }

  function startTurnTimer() {
    stopTurnTimer();
    const actor = activeActor();
    if (!actor?.isHuman || state.ended || !["roll", "decision"].includes(state.phase)) return;
    renderTurnStage();
    turnTimerId = window.setInterval(() => {
      state.secondsLeft = Math.max(0, state.secondsLeft - 1);
      renderTurnStage();
      if (state.secondsLeft === 0) {
        stopTurnTimer();
        expireHumanTurn();
      }
    }, 1000);
  }

  function expireHumanTurn() {
    const player = human();
    if (!player || state.ended || state.activeActorId !== player.id) return;
    state.turnExpired = true;
    addLog(`${player.name}回合時間到，由商會自動代管。`);
    if (state.phase === "roll") {
      rollHuman();
      return;
    }
    if (state.phase === "decision") autoResolveDecision();
  }

  function availableDecisionButtons() {
    return [elements.boardEventActions, elements.eventActions]
      .filter(Boolean)
      .flatMap((container) => [...container.querySelectorAll("button:not(:disabled)")]);
  }

  function autoResolveDecision() {
    if (state.ended || state.phase !== "decision") return;
    const choices = availableDecisionButtons();
    const fallback = choices.at(-1);
    if (fallback) {
      fallback.click();
    } else {
      finishHumanTurn();
    }
  }

  function setRollEnabled(enabled) {
    const player = human();
    elements.roll.disabled = !enabled || !state.started || state.busy || state.ended || state.phase !== "roll" || state.activeActorId !== player?.id;
  }

  async function rollHuman() {
    const player = human();
    if (!state.started || state.busy || state.ended || state.phase !== "roll" || state.activeActorId !== player?.id) return;
    stopTurnTimer();
    state.busy = true;
    state.phase = "dice";
    setRollEnabled(false);
    renderAll();
    const roll = randomInt(1, 6);
    await animateDice(roll);
    addLog(`${player.name}擲出 ${roll}。`);
    state.phase = "moving";
    state.movingActorId = player.id;
    renderAll();
    await moveActor(player, roll, true);
    state.movingActorId = null;
    state.phase = "decision";
    const tile = currentTile(player);
    resolveHumanTile(player, tile);
    renderAll();
    if (state.ended) return;
    if (state.turnExpired) {
      window.setTimeout(autoResolveDecision, 700);
    } else {
      startTurnTimer();
    }
  }

  async function animateDice(result) {
    ensureAudio();
    playEffect("dice");
    updateBoardStage("rolling", { type: "destiny", icon: "◈", label: "命運骰", title: "命運骰旋轉中", description: "骰子結果將決定本回合前進步數。" });
    elements.dice.classList.add("is-rolling");
    for (let index = 0; index < DICE_SPIN_FRAMES; index += 1) {
      elements.dice.textContent = DICE_FACES[randomInt(1, 6) - 1];
      await sleep(DICE_FRAME_MS);
    }
    elements.dice.textContent = DICE_FACES[result - 1];
    elements.dice.setAttribute("aria-label", `骰子結果 ${result}`);
    elements.dice.classList.remove("is-rolling");
    updateBoardStage("result", { type: "destiny", icon: String(result), label: "骰子結果", title: `擲出 ${result} 點`, description: "角色將沿棋格逐格前進。" }, [["移動步數", String(result)]]);
  }

  function markActorArrival(actor) {
    if (!actor || !ANIMATED_TOKEN_IDS.has(actor.spriteId)) return;
    if (arrivalTimerId !== null) window.clearTimeout(arrivalTimerId);
    state.arrivalActorId = actor.id;
    arrivalTimerId = window.setTimeout(() => {
      if (state.arrivalActorId === actor.id) {
        state.arrivalActorId = null;
        renderTokens();
      }
      arrivalTimerId = null;
    }, 1400);
  }

  async function moveActor(actor, steps, animate) {
    const length = actor.circle === "basic" ? basicTiles.length : eliteTiles.length;
    for (let step = 0; step < steps; step += 1) {
      actor.position = (actor.position + 1) % length;
      if (animate) {
        updateBoardStage("moving", { type: "income", icon: "➜", label: "逐格前進", title: `${actorDisplayName(actor)}移動中`, description: `已前進 ${step + 1}／${steps} 格，鏡頭正跟隨目前角色。` }, [["剩餘步數", String(steps - step - 1)], ["目前位置", String(actor.position + 1)]]);
        renderTokens();
        playEffect("step");
        await sleep(actor.isHuman ? PLAYER_STEP_MS : AI_STEP_MS);
      }
    }
    markActorArrival(actor);
    renderTokens();
    updateBoardStage("result", { type: currentTile(actor).type, icon: "◆", label: "抵達棋格", title: `抵達「${currentTile(actor).label}」`, description: "角色已完成移動，正在解析落點事件。" }, [["落點", String(actor.position + 1)]]);
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
      const [title, amount] = rollIncomeEvent();
      actor.cash += amount;
      addLog(`${title}，現金 ${formatSigned(amount)}。`);
      presentContinue(tile, title, `機會能量轉為現金，你獲得 ${formatMoney(amount)}。`, [["現金變動", formatSigned(amount)]]);
      return;
    }

    if (tile.type === "expense") {
      const { title, amount, reduction } = rollExpenseEvent(actor);
      actor.cash -= amount;
      addLog(`${title}，現金 ${formatSigned(-amount)}。`);
      presentContinue(tile, title, `突發支出已支付${reduction ? "，能力降低了損失" : ""}。`, [["現金變動", formatSigned(-amount)]]);
      return;
    }

    if (tile.type === "risk") {
      const { success, amount, successChance } = rollRiskEvent(actor);
      actor.cash += amount;
      const title = success ? "風險轉為紅利" : "市場能量逆流";
      addLog(`${title}，現金 ${formatSigned(amount)}。`);
      presentContinue(tile, title, success ? "判斷成功，高風險行動帶來額外報酬。" : "市場走勢反轉，你承擔了這次損失。", [["現金變動", formatSigned(amount)], ["成功機率", `${Math.round(successChance * 100)}%`]]);
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
    const { template, price, discount, netIncome } = pickAssetOffer(actor, type);
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
    if (actor.isHuman) playEffect("buy");
    actor.assets.push({
      ...template,
      paidPrice: price,
      ownerId: actor.id,
      boardCircle: actor.circle,
      boardPosition: actor.position,
      instanceId: `${template.id}-${instanceSequence += 1}`
    });
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
    const [title, amount] = rollDestinyEvent(actor);
    actor.cash += amount;
    addLog(`${title}，現金 ${formatSigned(amount)}。`);
    presentContinue(tile, title, amount > 0 ? "命運之輪轉向你，這次獲得額外資源。" : "命運事件帶來損失，保留現金仍是重要策略。", [["現金變動", formatSigned(amount)]]);
  }

  function presentContinue(tile, title, description, stats) {
    showEvent({ type: tile.type, stageMode: "result", title, description }, [{ label: "結束回合", run: finishHumanTurn }], stats);
  }

  function beginHumanTurn() {
    const player = human();
    state.activeActorId = player.id;
    state.phase = "roll";
    state.secondsLeft = TURN_SECONDS;
    state.turnExpired = false;
    state.movingActorId = null;
    state.busy = false;
    renderAll();
    showEvent({ type: "income", icon: "✦", stageMode: "overview", label: `第 ${state.round} 回合`, title: "輪到你行動", description: "觀察現金流與排名，在 45 秒內擲骰並處理下一個商業事件。" });
    setRollEnabled(true);
    startTurnTimer();
  }

  async function finishHumanTurn() {
    stopTurnTimer();
    state.phase = "settling";
    state.turnExpired = false;
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

    state.phase = "ai";
    renderAll();
    showEvent({ type: "income", icon: "⌛", stageMode: "next-turn", label: "對手回合", title: "商會正在推演三名對手策略", description: "每位對手都會擲骰、逐格移動並依自己的風格處理落點。" });
    await runAiTurns();
    if (state.ended) return;
    state.round += 1;
    beginHumanTurn();
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
      state.activeActorId = actor.id;
      state.phase = "ai";
      state.secondsLeft = 0;
      state.movingActorId = actor.id;
      renderAll();
      showEvent({ type: "income", icon: actor.avatar, stageMode: "rolling", label: "對手擲骰", title: `${actor.name}正在行動`, description: `${actor.title}準備沿著城市道路前進。` });
      const roll = randomInt(1, 6);
      await animateDice(roll);
      addLog(`${actor.name}擲出 ${roll}。`);
      await moveActor(actor, roll, true);
      state.movingActorId = null;
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
      await sleep(520);
    }
  }

  function resolveAiTile(actor, tile) {
    if (["stock", "realEstate", "business"].includes(tile.type)) {
      const { template: asset, price } = pickAssetOffer(actor, tile.type);
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
      const [, amount] = rollIncomeEvent();
      actor.cash += amount;
      addLog(`${actor.name}取得收入 ${formatMoney(amount)}。`);
      return;
    }

    if (tile.type === "expense") {
      const { amount } = rollExpenseEvent(actor);
      actor.cash -= amount;
      addLog(`${actor.name}支付突發支出 ${formatMoney(amount)}。`);
      return;
    }

    if (tile.type === "risk") {
      const { success, amount } = rollRiskEvent(actor);
      actor.cash += amount;
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

    const [, amount] = rollDestinyEvent(actor);
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

  function renderResultRanking() {
    if (!elements.resultRanking) return;
    elements.resultRanking.replaceChildren();
    [...state.actors]
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .forEach((actor, index) => {
        const item = document.createElement("li");
        item.classList.toggle("is-player", Boolean(actor.isHuman));
        if (actor.isHuman) item.setAttribute("aria-current", "true");
        item.innerHTML = `
          <span class="result-rank-no">${index + 1}</span>
          <span class="result-rank-avatar" style="--sprite:url('./assets/tokens/${actor.spriteId}.png')"><b>${actor.avatar}</b></span>
          <span class="result-rank-player"><strong>${escapeHtml(actorDisplayName(actor))}</strong><small>${escapeHtml(actor.isHuman ? `${actor.name}・你的成績` : actor.title)}</small></span>
          <span class="result-rank-metric"><small>淨資產</small><strong>${formatMoney(netWorth(actor))}</strong></span>
          <span class="result-rank-metric"><small>被動收入</small><strong>${formatMoney(passiveIncome(actor))}</strong></span>
          <span class="result-rank-metric"><small>能力</small><strong>Lv.${actor.skill}</strong></span>
          <span class="result-rank-score"><small>積分</small><strong>${new Intl.NumberFormat("zh-TW").format(scoreOf(actor))}</strong></span>
        `;
        elements.resultRanking.append(item);
      });
  }

  function syncGuestUpgradeUI() {
    const isGuest = document.body.dataset.accountType === "guest";
    const auth = window.MicroglowAuth;
    let upgradeUrl = "#";
    if (auth?.getPortalLoginUrl) {
      try { upgradeUrl = auth.getPortalLoginUrl(window.location.href); } catch {}
    }
    document.querySelectorAll("[data-guest-upgrade-link]").forEach((link) => {
      link.hidden = !isGuest;
      if (isGuest) link.href = upgradeUrl;
    });
    if (elements.resultGuestNote) elements.resultGuestNote.hidden = !isGuest;
  }

  function actorDisplayName(actor) {
    return actor?.nickname || actor?.name || "冒險者";
  }

  function actorStatusLine(actor, status) {
    const role = actor?.nickname && actor.nickname !== actor.name ? actor.name : "";
    return role ? `${role}・${status}` : status;
  }

  function normalizePlayerNickname(value, accountType) {
    let nickname = String(value || "").trim().replace(/\s+/g, " ");
    if (nickname.includes("@")) nickname = nickname.split("@")[0];
    if (!nickname || nickname === "正式會員" || nickname === "會員帳號") {
      nickname = accountType === "guest" ? "匿名訪客" : "冒險者";
    }
    return nickname.slice(0, 24);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  async function syncPlayerNickname(event) {
    const detail = event?.detail || {};
    const requestSequence = ++nicknameRequestSequence;
    let nickname = normalizePlayerNickname(detail.label, detail.type);

    if (detail.cloud && detail.id && window.MicroglowMultiplayer?.getProfiles) {
      try {
        const profiles = await window.MicroglowMultiplayer.getProfiles([detail.id]);
        if (requestSequence !== nicknameRequestSequence) return;
        const profile = profiles?.[detail.id];
        nickname = normalizePlayerNickname(profile?.username || profile?.display_name || nickname, detail.type);
      } catch (_) {
        // Profile lookup is optional for solo play; keep the safe account-label fallback.
      }
    }

    if (requestSequence !== nicknameRequestSequence) return;
    playerNickname = nickname;
    const player = human();
    if (player && !state.connected) player.nickname = playerNickname;
    renderSetup();
    if (state.started && !state.connected) renderAll();
  }

  function handleAccountReady(event) {
    syncGuestUpgradeUI();
    syncPlayerNickname(event);
  }

  function endGame(won, message, focusActor) {
    stopTurnTimer();
    state.ended = true;
    state.busy = false;
    setBoardFocus(false);
    playEffect(won ? "victory" : "lose");
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
    renderResultRanking();
    syncGuestUpgradeUI();
    elements.resultModal.hidden = false;
    renderAll();
  }

  function openAssets() {
    if (!state.started) return;
    const player = human();
    const myTurn = !state.connected || state.activeActorId === player?.id;
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
        button.disabled = state.busy || state.ended || !myTurn;
        button.title = myTurn ? "" : "只能在你的回合出售資產";
        button.addEventListener("click", () => {
          if (state.connected) sellAssetConnected(asset.instanceId);
          else sellAsset(asset.instanceId);
        });
        item.append(button);
        elements.assetList.append(item);
      });
    }
    elements.repay.hidden = state.connected;
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
    stopTurnTimer();
    setBoardFocus(false);
    setupState = createSetupState();
    state = createEmptyState();
    lastBoardTrackKey = "";
    elements.dice.textContent = "◈";
    elements.resultModal.hidden = true;
    elements.assetsModal.hidden = true;
    elements.instructionsModal.hidden = true;
    elements.introModal.hidden = false;
    renderCharacters();
    renderSetup();
    showEvent({ type: "income", title: "整備你的商業遠征隊", description: "先選模式、地圖與對手難度，再挑選角色確認四人隊伍。" });
    setRollEnabled(false);
    renderAll();
  }

  function openMultiplayerLobby(initialTab = "friends") {
    const module = window.MicroglowBusinessMultiplayer;
    if (!module || !elements.multiplayerRoot) {
      showEvent({ type: "risk", title: "多人連線載入失敗", description: "請重新整理頁面後再試一次。" });
      return;
    }
    elements.introModal.hidden = true;
    elements.multiplayerModal.hidden = false;
    if (elements.multiplayerTitle) {
      elements.multiplayerTitle.textContent = initialTab === "queue" ? "隨機匹配" : initialTab === "room" ? "好友房" : "多人連線大廳";
    }
    module.initMultiplayerUI(elements.multiplayerRoot, {
      initialTab,
      onMatch(matchId) {
        const url = new URL(window.location.href);
        url.searchParams.set("match", matchId);
        url.hash = "";
        window.location.href = url.href;
      }
    });
  }

  function closeMultiplayerLobby() {
    elements.multiplayerModal.hidden = true;
    if (!state.started && !state.connected) elements.introModal.hidden = false;
  }

  function bindControls() {
    document.querySelector('[data-action="roll"]').addEventListener("click", () => {
      if (state.connected) rollConnected();
      else rollHuman();
    });
    document.querySelectorAll('[data-action="instructions"]').forEach((button) => {
      button.addEventListener("click", () => { elements.instructionsModal.hidden = false; closeHeaderMenus(); });
    });
    document.querySelectorAll('[data-action="assets"]').forEach((button) => {
      button.addEventListener("click", () => { openAssets(); closeHeaderMenus(); });
    });
    document.querySelector('[data-action="restart"]').addEventListener("click", () => {
      if (state.connected) { window.location.href = window.location.pathname; return; }
      resetToIntro();
    });
    document.querySelector('[data-action="play-again"]').addEventListener("click", () => {
      if (state.connected) { window.location.href = window.location.pathname; return; }
      resetToIntro();
    });
    elements.focusButton.addEventListener("click", () => { setBoardFocus(!boardFocused); closeHeaderMenus(); });
    elements.audioButton.addEventListener("click", () => { toggleAudio(); closeHeaderMenus(); });
    elements.cameraButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.cameraAction;
        if (action === "zoom-in") boardCamera?.setZoomBy(0.16);
        if (action === "zoom-out") boardCamera?.setZoomBy(-0.16);
        if (action === "recenter") centerActiveToken();
      });
    });
    elements.boardEventToggle?.addEventListener("click", () => {
      setBoardEventExpanded(!elements.boardEventDock.classList.contains("is-expanded"));
    });
    bindHeaderMenus();
    window.addEventListener("microglow:account-ready", handleAccountReady);
    if (window.MicroglowBusinessAccount) handleAccountReady({ detail: window.MicroglowBusinessAccount });
    elements.tileInspector.addEventListener("click", hideTileInspector);
    elements.startAdventure.addEventListener("click", () => {
      if (setupState.characterId) startGame(setupState.characterId);
    });
    document.querySelectorAll("[data-multiplayer-open]").forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudio();
        playEffect("click");
        openMultiplayerLobby(button.dataset.multiplayerOpen || "friends");
      });
    });
    document.querySelector("[data-multiplayer-close]")?.addEventListener("click", closeMultiplayerLobby);
    document.querySelectorAll("[data-setup-next]").forEach((button) => {
      button.addEventListener("click", () => goToSetupStep(button.dataset.setupNext));
    });
    document.querySelectorAll("[data-setup-back]").forEach((button) => {
      button.addEventListener("click", () => goToSetupStep(button.dataset.setupBack));
    });
    elements.setupTabs.forEach((button) => {
      button.addEventListener("click", () => goToSetupStep(button.dataset.setupTab));
    });
    elements.difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setupState.difficulty = button.dataset.difficulty;
        ensureAudio();
        playEffect("select");
        renderSetup();
      });
    });
    document.querySelector('[data-action="portrait-bypass"]')?.addEventListener("click", () => {
      portraitBypass = false;
      syncOrientationGuard();
    });

    document.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = button.closest(".modal");
        if (modal) modal.hidden = true;
      });
    });

    elements.repay.addEventListener("click", () => {
      const player = human();
      if (!player || state.busy || state.ended || state.connected) return;
      repayBankDebt(player, 5000);
      renderAll();
      openAssets();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        [elements.instructionsModal, elements.assetsModal, elements.multiplayerModal].forEach((modal) => { if (modal) modal.hidden = true; });
        closeHeaderMenus();
        setBoardEventExpanded(false);
        if (!state.started && !state.connected) elements.introModal.hidden = false;
      }
      const isConfirmKey = event.key === "Enter" || event.key === " ";
      const hasOpenModal = document.querySelector(".modal:not([hidden])");
      const portraitBlocked = document.body.classList.contains("mobile-portrait-preview") || document.body.classList.contains("mobile-portrait-locked");
      if (isConfirmKey && !hasOpenModal && !portraitBlocked) {
        if (!elements.roll.disabled) {
          event.preventDefault();
          rollHuman();
          return;
        }
        const decisionChoices = state.phase === "decision" ? availableDecisionButtons() : [];
        if (decisionChoices.length === 1) {
          event.preventDefault();
          decisionChoices[0].click();
        }
      }
    });

    const boardFrameEl = document.querySelector("[data-board-frame]");
    boardFrameEl?.addEventListener("scroll", () => {
      boardFrameEl.classList.add("has-scrolled");
    }, { passive: true, once: true });

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

  function closeHeaderMenus() {
    document.querySelectorAll("[data-tools-menu], [data-return-menu]").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll("[data-tools-menu-toggle], [data-return-menu-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function bindHeaderMenus() {
    const pairs = [
      [document.querySelector("[data-tools-menu-toggle]"), document.querySelector("[data-tools-menu]")],
      [document.querySelector("[data-return-menu-toggle]"), document.querySelector("[data-return-menu]")]
    ];
    pairs.forEach(([button, menu]) => {
      if (!button || !menu) return;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = menu.hidden;
        closeHeaderMenus();
        menu.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
      });
      menu.addEventListener("click", (event) => {
        if (event.target.closest("a,button")) closeHeaderMenus();
      });
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".top-tools,.return-nav")) closeHeaderMenus();
    });
  }

  function syncViewportSize() {
    const height = Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight);
    const width = Math.floor(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth);
    document.documentElement.style.setProperty("--empire-height", height + "px");
    document.documentElement.style.setProperty("--empire-width", width + "px");
    syncOrientationGuard();
    boardCamera?.refresh();
    window.requestAnimationFrame(() => followActiveActor(false));
  }

  function syncOrientationGuard() {
    const width = Math.floor(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth);
    const height = Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight);
    const touchDevice = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
    const mobilePortrait = touchDevice && width <= 900 && height > width;
    const extremeNarrowPortrait = mobilePortrait && width < 340;
    portraitBypass = false;
    elements.orientationGuard.hidden = !extremeNarrowPortrait;
    elements.orientationState.textContent = mobilePortrait ? "目前偵測：直向模式" : "目前偵測：橫向模式";
    document.documentElement.dataset.mobileOrientation = mobilePortrait ? "portrait" : "landscape";
    document.body.classList.remove("mobile-portrait-preview");
    document.body.classList.toggle("mobile-portrait-locked", extremeNarrowPortrait);
    if (!mobilePortrait) setBoardEventExpanded(false);
  }
  function sleep(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  // ---- Connected multiplayer mode ----
  // Reuses the board/HUD renderers above (renderBoard/renderStats/renderTurnStage/
  // renderRanking/showEvent/...) but replaces the local dice/AI logic with calls to the
  // server-authoritative public.business_empire_action RPC. state.actors here are all
  // real seated players (no AI); only the actor matching state.myUserId is isHuman.

  const SEAT_COLORS = ["#55e6ff", "#7ef7bd", "#ff7ac8", "#b68cff"];
  let connectedUnsubscribe = null;
  let connectedClockId = null;
  let connectedRefreshPending = false;
  let connectedLastEventNo = 0;
  let connectedLatestEventSummary = "";

  function findAssetTemplate(assetKey) {
    const catalogs = [BASIC_ASSETS, ELITE_ASSETS];
    for (const catalog of catalogs) {
      for (const type of Object.keys(catalog)) {
        const match = catalog[type].find((asset) => asset.id === assetKey);
        if (match) return match;
      }
    }
    return null;
  }

  async function initConnectedMatch(matchId) {
    const mm = window.MicroglowMatch;
    const authAdapter = window.MicroglowSupabaseAuth;
    elements.introModal.hidden = true;
    elements.resultModal.hidden = true;
    if (!mm || !authAdapter) {
      showEvent({ type: "expense", title: "連線功能載入失敗", description: "請重新整理頁面，或返回大廳重新進入對戰。" });
      return;
    }
    try {
      const { data: sessionData } = await authAdapter.getSession();
      const myUserId = sessionData?.session?.user?.id;
      if (!myUserId) throw new Error("尚未登入，無法進入連線對戰。");
      state = createEmptyState();
      state.connected = true;
      state.matchId = matchId;
      state.myUserId = myUserId;
      state.started = true;
      connectedLastEventNo = 0;
      connectedLatestEventSummary = "";
      setBoardFocus(false);
      elements.dice.textContent = "◈";
      await refreshConnectedMatch({ initial: true });
      if (connectedUnsubscribe) connectedUnsubscribe();
      connectedUnsubscribe = mm.subscribeMatch(matchId, () => {
        refreshConnectedMatch({}).catch((error) => addLog(error.message || "同步比賽狀態失敗。"));
      });
    } catch (error) {
      showEvent({ type: "expense", title: "無法載入連線對戰", description: error.message || "請返回大廳重新嘗試。" });
    }
  }

  async function refreshConnectedMatch(options) {
    if (!state.connected) return;
    if (state.busy && !options?.force && !options?.initial) {
      connectedRefreshPending = true;
      return;
    }
    const mm = window.MicroglowMatch;
    const matchId = state.matchId;
    const previousActors = new Map(state.actors.map((actor) => [actor.id, { ...actor }]));
    let match, matchPlayers, empirePlayers, ownedAssets, matchEvents;
    try {
      [match, matchPlayers, empirePlayers, ownedAssets, matchEvents] = await Promise.all([
        mm.getMatch(matchId),
        mm.listMatchPlayers(matchId),
        mm.listBusinessEmpirePlayers(matchId),
        mm.listOwnedAssets(matchId),
        mm.listMatchEventsSince(matchId, connectedLastEventNo)
      ]);
    } catch (error) {
      addLog(error.message || "同步比賽狀態失敗。");
      return;
    }
    const profiles = await mm.getProfiles(matchPlayers.map((row) => row.user_id)).catch(() => ({}));
    const empireByUser = new Map(empirePlayers.map((row) => [row.user_id, row]));

    state.actors = matchPlayers.map((mp) => {
      const empireRow = empireByUser.get(mp.user_id) || {};
      const character = CHARACTERS.find((entry) => entry.id === empireRow.character_key) || CHARACTERS[0];
      const profile = profiles[mp.user_id];
      const assets = ownedAssets
        .filter((asset) => asset.user_id === mp.user_id)
        .map((asset) => {
          const template = findAssetTemplate(asset.asset_key) || {};
          return {
            ...template,
            paidPrice: asset.paid_price,
            ownerId: asset.user_id,
            boardCircle: asset.board_zone,
            boardPosition: asset.board_position,
            instanceId: asset.id
          };
        });
      return {
        id: mp.user_id,
        name: profile?.username || profile?.display_name || character.name,
        title: character.title,
        artIndex: character.artIndex,
        spriteId: character.spriteId,
        avatar: character.avatar,
        variant: "",
        seat: mp.seat_number,
        color: SEAT_COLORS[mp.seat_number % SEAT_COLORS.length],
        isHuman: mp.user_id === state.myUserId,
        strategy: "balanced",
        cash: empireRow.cash_balance ?? 0,
        salary: empireRow.salary ?? 0,
        baseExpense: empireRow.base_expense ?? 0,
        skill: empireRow.skill_level ?? 0,
        bankDebt: empireRow.bank_debt ?? 0,
        assets,
        position: empireRow.board_position ?? 0,
        circle: empireRow.board_zone || "basic",
        eliminated: Boolean(empireRow.eliminated),
        pendingAction: empireRow.pending_action || null
      };
    });

    processConnectedEvents(matchEvents, Boolean(options?.initial));
    state.activeActorId = match.current_player_id;
    state.turnDeadlineAt = match.turn_deadline_at;
    state.round = match.turn_number || 1;

    if (match.status === "completed") {
      if (!state.ended) finishConnectedMatch(match);
      return;
    }

    state.phase = match.phase;
    renderAll();
    animateRemoteActorChanges(previousActors);
    syncConnectedPhaseUI();
    startConnectedClock();

    if (connectedRefreshPending) {
      connectedRefreshPending = false;
      refreshConnectedMatch({ force: true });
    }
  }

  function summarizeConnectedEvent(event) {
    const payload = event?.payload || {};
    const actor = state.actors.find((entry) => entry.id === event?.actor_user_id);
    const name = actor?.name || "對手";
    const cash = Number(payload.cash_change) || 0;
    const cashNote = cash ? `，現金${formatSigned(cash)}` : "";
    if (event?.event_type === "match_started") return "連線對戰已開始";
    if (event?.event_type === "roll") return `${name} 擲出 ${payload.dice || "?"}，抵達${payload.tile_label || "新格子"}${cashNote}`;
    if (event?.event_type === "buy_asset") return `${name} 買入${findAssetTemplate(payload.asset_key)?.name || "一項資產"}`;
    if (event?.event_type === "sell_asset") return `${name} 售出資產，取得${formatMoney(Number(payload.proceeds) || 0)}`;
    if (event?.event_type === "learn") return `${name} 完成能力進修`;
    if (event?.event_type === "borrow") return `${name} 向銀行取得${formatMoney(Number(payload.cash_received) || 0)}`;
    if (event?.event_type === "repay") return `${name} 償還${formatMoney(Number(payload.amount) || 0)}負債`;
    if (event?.event_type === "enter_elite") return `${name} 進入精英圈`;
    if (event?.event_type === "skip") return `${name} 放棄本次機會`;
    if (event?.event_type === "end_turn") return `${name} 完成回合結算`;
    return `${name} 完成${event?.event_type || "一項行動"}`;
  }

  function processConnectedEvents(events, initial) {
    const ordered = Array.isArray(events) ? events : [];
    ordered.forEach((event) => {
      connectedLastEventNo = Math.max(connectedLastEventNo, Number(event.event_no) || 0);
      connectedLatestEventSummary = summarizeConnectedEvent(event);
      if (!initial) addLog(connectedLatestEventSummary, false);
    });
  }

  function animateRemoteActorChanges(previousActors) {
    if (!previousActors?.size) return;
    state.actors.forEach((actor) => {
      if (actor.isHuman || actor.eliminated) return;
      const before = previousActors.get(actor.id);
      if (!before || (before.position === actor.position && before.circle === actor.circle)) return;
      const currentToken = elements.tokens.querySelector(`[data-actor-id="${actor.id}"]`);
      if (!currentToken) return;
      const from = tokenPoint(before);
      const to = tokenPoint(actor);
      const ghost = currentToken.cloneNode(true);
      ghost.classList.remove("is-active", "is-arriving", "is-moving", "is-remote-arriving");
      ghost.classList.add("remote-token-ghost");
      ghost.removeAttribute("role");
      ghost.removeAttribute("aria-label");
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.setProperty("--remote-from-x", `${from.left}%`);
      ghost.style.setProperty("--remote-from-y", `${from.top}%`);
      ghost.style.setProperty("--remote-to-x", `${to.left}%`);
      ghost.style.setProperty("--remote-to-y", `${to.top}%`);
      currentToken.classList.add("is-remote-arriving");
      elements.tokens.append(ghost);
      window.setTimeout(() => {
        ghost.remove();
        currentToken.classList.remove("is-remote-arriving");
      }, 850);
    });
  }

  function syncConnectedPhaseUI() {
    if (!state.connected || state.ended) return;
    const player = human();
    setRollEnabled(true);
    const isMyTurn = state.activeActorId === player?.id;
    if (!isMyTurn) {
      const current = activeActor();
      const expired = Boolean(state.turnDeadlineAt) && new Date(state.turnDeadlineAt).getTime() <= Date.now();
      showEvent({
        type: "income",
        icon: "⌛",
        label: "等待中",
        waiting: true,
        title: current ? `等待 ${current.name} 行動` : "等待對手",
        description: expired
          ? "對方回合已逾時，你可以幫忙推進比賽。"
          : (connectedLatestEventSummary ? `最新動態：${connectedLatestEventSummary}。畫面會繼續即時同步。` : "換你之前，畫面會即時同步對手的行動結果。")
      }, expired ? [{ label: "強制結束逾時回合", run: forceAdvanceConnectedTurn }] : []);
      return;
    }
    if (state.phase === "roll") {
      showEvent({ type: "income", icon: "✦", label: `第 ${state.round} 回合`, title: "輪到你行動", description: "擲骰前進，落點事件會立即顯示。" });
      return;
    }
    if (state.phase === "decision" && player?.pendingAction) {
      resumeConnectedDecision(player, player.pendingAction);
      return;
    }
    if (state.phase === "turn_end") {
      presentContinueConnected("income", "回合已結算", "可以結束回合，換下一位玩家行動。", []);
    }
  }

  function resumeConnectedDecision(player, pending) {
    if (pending.type === "asset_offer") {
      const template = findAssetTemplate(pending.asset_key);
      if (!template) {
        presentContinueConnected("income", "資產資訊載入中", "請稍候或重新整理頁面。", []);
        return;
      }
      presentConnectedAssetOffer(player, template, pending.price);
    } else if (pending.type === "bank") {
      presentConnectedBank(player);
    } else if (pending.type === "learn") {
      presentConnectedLearn(player, pending.cost);
    } else if (pending.type === "gate") {
      presentConnectedGate(player, Boolean(pending.qualified));
    } else {
      presentContinueConnected("income", "事件處理中", "請稍候。", []);
    }
  }

  function presentContinueConnected(type, title, description, stats) {
    showEvent({ type, stageMode: "result", title, description }, [{ label: "結束回合", run: () => runConnectedAction("end_turn") }], stats);
  }

  function presentConnectedAssetOffer(player, template, price) {
    const netIncome = template.monthlyIncome - template.monthlyCost;
    showEvent({
      type: template.type,
      title: template.name,
      description: `風險 ${template.risk}。買入後每月收入 ${formatMoney(template.monthlyIncome)}，每月維護 ${formatMoney(template.monthlyCost)}。`
    }, [
      { label: `買入 ${formatMoney(price)}`, disabled: player.cash < price, run: () => runConnectedAction("buy_asset") },
      { label: "放棄機會", run: () => runConnectedAction("skip") }
    ], [
      ["買入現金", formatMoney(price)],
      ["每月淨流入", formatSigned(netIncome)],
      ["資產價值", formatMoney(template.value)],
      ["新增負債", formatMoney(template.loanPrincipal || 0)]
    ]);
  }

  function presentConnectedBank(player) {
    const canRepay = player.bankDebt > 0 && player.cash >= 5000;
    showEvent({
      type: "loan",
      title: "星鑄銀行",
      description: "可借入 $15,000，帳面負債增加 $18,000，並產生每月信用成本；也可優先償還既有信用貸款。"
    }, [
      { label: "借入 $15,000", disabled: creditAvailable(player) < 18000, run: () => runConnectedAction("borrow") },
      { label: "償還 $5,000", disabled: !canRepay, run: () => runConnectedAction("repay") },
      { label: "離開銀行", run: () => runConnectedAction("skip") }
    ], [["銀行負債", formatMoney(player.bankDebt)], ["可用信用", formatMoney(creditAvailable(player))]]);
  }

  function presentConnectedLearn(player, cost) {
    showEvent({
      type: "learn",
      title: "商業奧術課程",
      description: "提升能力會增加風險事件成功率、降低突發支出，並讓資產買入最多享 10% 折扣。"
    }, [
      { label: `進修 ${formatMoney(cost)}`, disabled: player.cash < cost, run: () => runConnectedAction("learn") },
      { label: "這次跳過", run: () => runConnectedAction("skip") }
    ], [["目前能力", String(player.skill)], ["買入折扣", `${Math.round(discountFor(player) * 100)}%`]]);
  }

  function presentConnectedGate(player, qualified) {
    showEvent({
      type: "gate",
      title: qualified ? "精英圈通行證已亮起" : "躍升條件尚未完成",
      description: qualified
        ? "你已具備進入精英圈的條件。內圈機會報酬更高，風險與資金需求也會同步提高。"
        : "需達成任一條件：被動收入達支出的 55%、淨資產達 $250,000，或能力達 4。"
    }, qualified ? [
      { label: "進入精英圈", run: () => runConnectedAction("enter_elite") },
      { label: "留在原地", run: () => runConnectedAction("skip") }
    ] : [
      { label: "繼續累積", run: () => runConnectedAction("skip") }
    ], [["被動／支出", `${Math.round((passiveIncome(player) / Math.max(1, monthlyExpense(player))) * 100)}%`], ["淨資產", formatMoney(netWorth(player))], ["能力", String(player.skill)]]);
  }

  function showServerTileEvent(player, result) {
    const pending = result.pending_action;
    if (!pending) {
      const tileType = result.tile_type;
      const tileLabel = result.tile_label || TILE_META[tileType]?.label || "城市事件";
      if (result.cash_change) addLog(`${tileLabel}，現金 ${formatSigned(result.cash_change)}。`);
      presentContinueConnected(tileType, tileLabel, `${tileLabel}事件已結算。`, result.cash_change ? [["現金變動", formatSigned(result.cash_change)]] : []);
      return;
    }
    resumeConnectedDecision(player, pending);
  }

  async function rollConnected() {
    if (!state.connected) return;
    const mm = window.MicroglowMatch;
    const player = human();
    if (state.busy || state.ended || state.phase !== "roll" || state.activeActorId !== player?.id) return;
    stopConnectedClock();
    state.busy = true;
    state.phase = "dice";
    setRollEnabled(false);
    renderAll();
    try {
      const result = await mm.callBusinessAction(state.matchId, "roll", crypto.randomUUID());
      await animateDice(result.dice);
      addLog(`${player.name}擲出 ${result.dice}。`);
      state.phase = "moving";
      state.movingActorId = player.id;
      renderAll();
      await moveActor(player, result.dice, true);
      state.movingActorId = null;
      player.position = result.position;
      if (!result.pending_action && result.cash_change) player.cash += result.cash_change;
      state.phase = result.pending_action ? "decision" : "turn_end";
      showServerTileEvent(player, result);
    } catch (error) {
      addLog(error.message || "擲骰失敗，請再試一次。");
      state.phase = "roll";
    } finally {
      state.busy = false;
      renderAll();
      if (!state.ended) startConnectedClock();
      if (connectedRefreshPending) {
        connectedRefreshPending = false;
        refreshConnectedMatch({ force: true });
      }
    }
  }

  async function runConnectedAction(actionType, payload) {
    if (!state.connected || state.busy || state.ended) return;
    const mm = window.MicroglowMatch;
    state.busy = true;
    elements.eventActions.replaceChildren();
    elements.boardEventActions.replaceChildren();
    try {
      await mm.callBusinessAction(state.matchId, actionType, crypto.randomUUID(), payload || {});
    } catch (error) {
      addLog(error.message || "操作失敗，請再試一次。");
    } finally {
      state.busy = false;
      await refreshConnectedMatch({ force: true });
    }
  }

  async function forceAdvanceConnectedTurn() {
    if (!state.connected || state.busy || state.ended) return;
    const mm = window.MicroglowMatch;
    state.busy = true;
    try {
      await mm.forceAdvanceExpiredTurn(state.matchId);
      addLog("已推進逾時的回合。");
    } catch (error) {
      addLog(error.message || "推進回合失敗，請再試一次。");
    } finally {
      state.busy = false;
      await refreshConnectedMatch({ force: true });
    }
  }

  async function sellAssetConnected(instanceId) {
    if (!state.connected || state.busy || state.ended) return;
    const mm = window.MicroglowMatch;
    state.busy = true;
    try {
      await mm.callBusinessAction(state.matchId, "sell_asset", crypto.randomUUID(), { asset_id: instanceId });
      addLog("已出售資產。");
    } catch (error) {
      addLog(error.message || "出售失敗，請再試一次。");
    } finally {
      state.busy = false;
      await refreshConnectedMatch({ force: true });
      openAssets();
    }
  }

  function startConnectedClock() {
    stopConnectedClock();
    if (!state.connected || state.ended || !state.turnDeadlineAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(state.turnDeadlineAt).getTime() - Date.now()) / 1000));
      state.secondsLeft = remaining;
      renderTurnStage();
      if (remaining === 0) {
        stopConnectedClock();
        if (state.activeActorId !== human()?.id) syncConnectedPhaseUI();
      }
    };
    tick();
    connectedClockId = window.setInterval(tick, 1000);
  }

  function stopConnectedClock() {
    if (connectedClockId !== null) {
      window.clearInterval(connectedClockId);
      connectedClockId = null;
    }
  }

  function finishConnectedMatch(match) {
    stopConnectedClock();
    state.ended = true;
    state.busy = false;
    setRollEnabled(false);
    const player = human();
    const won = match.winner_user_id === state.myUserId;
    const winnerActor = state.actors.find((actor) => actor.id === match.winner_user_id);
    playEffect(won ? "victory" : "lose");
    elements.resultKicker.textContent = won ? "財務自由達成" : "本局比賽結束";
    elements.resultEmblem.textContent = won ? "♛" : "◇";
    elements.resultTitle.textContent = winnerActor ? `${winnerActor.name}主導了結局` : "比賽結束";
    elements.resultMessage.textContent = winnerActor
      ? (won ? "你的被動收入已支付全部每月支出，財務自由達成。" : `${winnerActor.name}率先達成財務自由，贏得本局比賽。`)
      : "比賽已結束。";
    const score = player ? scoreOf(player) : 0;
    const existingBest = Number(portalStats.readGame(GAME_ID).bestScore) || 0;
    const best = Math.max(existingBest, score);
    portalStats.recordRun(GAME_ID, GAME_TITLE, score, best);
    elements.resultStats.innerHTML = `
      <div><span>本局分數</span><strong>${new Intl.NumberFormat("zh-TW").format(score)}</strong></div>
      <div><span>淨資產</span><strong>${player ? formatMoney(netWorth(player)) : "$0"}</strong></div>
      <div><span>最高分</span><strong>${new Intl.NumberFormat("zh-TW").format(best)}</strong></div>
    `;
    renderResultRanking();
    syncGuestUpgradeUI();
    elements.resultModal.hidden = false;
    renderAll();
  }
})();
