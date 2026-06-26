(function () {
  const prefix = "tsyMicroglowGames.";

  function read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(prefix + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(prefix + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function number(key, fallback) {
    const value = Number(read(key, fallback));
    return Number.isFinite(value) ? value : fallback;
  }

  window.MicroglowStorage = {
    read,
    write,
    number
  };
})();
