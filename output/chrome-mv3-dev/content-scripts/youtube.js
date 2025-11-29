var youtube = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  var has = Object.prototype.hasOwnProperty;
  function dequal(foo, bar) {
    var ctor, len;
    if (foo === bar) return true;
    if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
      if (ctor === Date) return foo.getTime() === bar.getTime();
      if (ctor === RegExp) return foo.toString() === bar.toString();
      if (ctor === Array) {
        if ((len = foo.length) === bar.length) {
          while (len-- && dequal(foo[len], bar[len])) ;
        }
        return len === -1;
      }
      if (!ctor || typeof foo === "object") {
        len = 0;
        for (ctor in foo) {
          if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
          if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
        }
        return Object.keys(bar).length === len;
      }
    }
    return foo !== foo && bar !== bar;
  }
  const E_CANCELED = new Error("request for lock canceled");
  var __awaiter$2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Semaphore {
    constructor(_value, _cancelError = E_CANCELED) {
      this._value = _value;
      this._cancelError = _cancelError;
      this._queue = [];
      this._weightedWaiters = [];
    }
    acquire(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      return new Promise((resolve, reject) => {
        const task = { resolve, reject, weight, priority };
        const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
        if (i === -1 && weight <= this._value) {
          this._dispatchItem(task);
        } else {
          this._queue.splice(i + 1, 0, task);
        }
      });
    }
    runExclusive(callback_1) {
      return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
        const [value, release] = yield this.acquire(weight, priority);
        try {
          return yield callback(value);
        } finally {
          release();
        }
      });
    }
    waitForUnlock(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      if (this._couldLockImmediately(weight, priority)) {
        return Promise.resolve();
      } else {
        return new Promise((resolve) => {
          if (!this._weightedWaiters[weight - 1])
            this._weightedWaiters[weight - 1] = [];
          insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
        });
      }
    }
    isLocked() {
      return this._value <= 0;
    }
    getValue() {
      return this._value;
    }
    setValue(value) {
      this._value = value;
      this._dispatchQueue();
    }
    release(weight = 1) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      this._value += weight;
      this._dispatchQueue();
    }
    cancel() {
      this._queue.forEach((entry) => entry.reject(this._cancelError));
      this._queue = [];
    }
    _dispatchQueue() {
      this._drainUnlockWaiters();
      while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
        this._dispatchItem(this._queue.shift());
        this._drainUnlockWaiters();
      }
    }
    _dispatchItem(item) {
      const previousValue = this._value;
      this._value -= item.weight;
      item.resolve([previousValue, this._newReleaser(item.weight)]);
    }
    _newReleaser(weight) {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;
        this.release(weight);
      };
    }
    _drainUnlockWaiters() {
      if (this._queue.length === 0) {
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          waiters.forEach((waiter) => waiter.resolve());
          this._weightedWaiters[weight - 1] = [];
        }
      } else {
        const queuedPriority = this._queue[0].priority;
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
          (i === -1 ? waiters : waiters.splice(0, i)).forEach(((waiter) => waiter.resolve()));
        }
      }
    }
    _couldLockImmediately(weight, priority) {
      return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
    }
  }
  function insertSorted(a, v) {
    const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
    a.splice(i + 1, 0, v);
  }
  function findIndexFromEnd(a, predicate) {
    for (let i = a.length - 1; i >= 0; i--) {
      if (predicate(a[i])) {
        return i;
      }
    }
    return -1;
  }
  var __awaiter$1 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Mutex {
    constructor(cancelError) {
      this._semaphore = new Semaphore(1, cancelError);
    }
    acquire() {
      return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
        const [, releaser] = yield this._semaphore.acquire(1, priority);
        return releaser;
      });
    }
    runExclusive(callback, priority = 0) {
      return this._semaphore.runExclusive(() => callback(), 1, priority);
    }
    isLocked() {
      return this._semaphore.isLocked();
    }
    waitForUnlock(priority = 0) {
      return this._semaphore.waitForUnlock(1, priority);
    }
    release() {
      if (this._semaphore.isLocked())
        this._semaphore.release();
    }
    cancel() {
      return this._semaphore.cancel();
    }
  }
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const storage = createStorage();
  function createStorage() {
    const drivers = {
      local: createDriver("local"),
      session: createDriver("session"),
      sync: createDriver("sync"),
      managed: createDriver("managed")
    };
    const getDriver = (area) => {
      const driver = drivers[area];
      if (driver == null) {
        const areaNames = Object.keys(drivers).join(", ");
        throw Error(`Invalid area "${area}". Options: ${areaNames}`);
      }
      return driver;
    };
    const resolveKey = (key) => {
      const deliminatorIndex = key.indexOf(":");
      const driverArea = key.substring(0, deliminatorIndex);
      const driverKey = key.substring(deliminatorIndex + 1);
      if (driverKey == null)
        throw Error(
          `Storage key should be in the form of "area:key", but received "${key}"`
        );
      return {
        driverArea,
        driverKey,
        driver: getDriver(driverArea)
      };
    };
    const getMetaKey = (key) => key + "$";
    const mergeMeta = (oldMeta, newMeta) => {
      const newFields = { ...oldMeta };
      Object.entries(newMeta).forEach(([key, value]) => {
        if (value == null) delete newFields[key];
        else newFields[key] = value;
      });
      return newFields;
    };
    const getValueOrFallback = (value, fallback) => value ?? fallback ?? null;
    const getMetaValue = (properties) => typeof properties === "object" && !Array.isArray(properties) ? properties : {};
    const getItem = async (driver, driverKey, opts) => {
      const res = await driver.getItem(driverKey);
      return getValueOrFallback(res, opts?.fallback ?? opts?.defaultValue);
    };
    const getMeta = async (driver, driverKey) => {
      const metaKey = getMetaKey(driverKey);
      const res = await driver.getItem(metaKey);
      return getMetaValue(res);
    };
    const setItem = async (driver, driverKey, value) => {
      await driver.setItem(driverKey, value ?? null);
    };
    const setMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      const existingFields = getMetaValue(await driver.getItem(metaKey));
      await driver.setItem(metaKey, mergeMeta(existingFields, properties));
    };
    const removeItem = async (driver, driverKey, opts) => {
      await driver.removeItem(driverKey);
      if (opts?.removeMeta) {
        const metaKey = getMetaKey(driverKey);
        await driver.removeItem(metaKey);
      }
    };
    const removeMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      if (properties == null) {
        await driver.removeItem(metaKey);
      } else {
        const newFields = getMetaValue(await driver.getItem(metaKey));
        [properties].flat().forEach((field) => delete newFields[field]);
        await driver.setItem(metaKey, newFields);
      }
    };
    const watch = (driver, driverKey, cb) => {
      return driver.watch(driverKey, cb);
    };
    const storage2 = {
      getItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        return await getItem(driver, driverKey, opts);
      },
      getItems: async (keys) => {
        const areaToKeyMap = /* @__PURE__ */ new Map();
        const keyToOptsMap = /* @__PURE__ */ new Map();
        const orderedKeys = [];
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") {
            keyStr = key;
          } else if ("getValue" in key) {
            keyStr = key.key;
            opts = { fallback: key.fallback };
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          orderedKeys.push(keyStr);
          const { driverArea, driverKey } = resolveKey(keyStr);
          const areaKeys = areaToKeyMap.get(driverArea) ?? [];
          areaToKeyMap.set(driverArea, areaKeys.concat(driverKey));
          keyToOptsMap.set(keyStr, opts);
        });
        const resultsMap = /* @__PURE__ */ new Map();
        await Promise.all(
          Array.from(areaToKeyMap.entries()).map(async ([driverArea, keys2]) => {
            const driverResults = await drivers[driverArea].getItems(keys2);
            driverResults.forEach((driverResult) => {
              const key = `${driverArea}:${driverResult.key}`;
              const opts = keyToOptsMap.get(key);
              const value = getValueOrFallback(
                driverResult.value,
                opts?.fallback ?? opts?.defaultValue
              );
              resultsMap.set(key, value);
            });
          })
        );
        return orderedKeys.map((key) => ({
          key,
          value: resultsMap.get(key)
        }));
      },
      getMeta: async (key) => {
        const { driver, driverKey } = resolveKey(key);
        return await getMeta(driver, driverKey);
      },
      getMetas: async (args) => {
        const keys = args.map((arg) => {
          const key = typeof arg === "string" ? arg : arg.key;
          const { driverArea, driverKey } = resolveKey(key);
          return {
            key,
            driverArea,
            driverKey,
            driverMetaKey: getMetaKey(driverKey)
          };
        });
        const areaToDriverMetaKeysMap = keys.reduce((map, key) => {
          map[key.driverArea] ??= [];
          map[key.driverArea].push(key);
          return map;
        }, {});
        const resultsMap = {};
        await Promise.all(
          Object.entries(areaToDriverMetaKeysMap).map(async ([area, keys2]) => {
            const areaRes = await browser$1.storage[area].get(
              keys2.map((key) => key.driverMetaKey)
            );
            keys2.forEach((key) => {
              resultsMap[key.key] = areaRes[key.driverMetaKey] ?? {};
            });
          })
        );
        return keys.map((key) => ({
          key: key.key,
          meta: resultsMap[key.key]
        }));
      },
      setItem: async (key, value) => {
        const { driver, driverKey } = resolveKey(key);
        await setItem(driver, driverKey, value);
      },
      setItems: async (items) => {
        const areaToKeyValueMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey(
            "key" in item ? item.key : item.item.key
          );
          areaToKeyValueMap[driverArea] ??= [];
          areaToKeyValueMap[driverArea].push({
            key: driverKey,
            value: item.value
          });
        });
        await Promise.all(
          Object.entries(areaToKeyValueMap).map(async ([driverArea, values]) => {
            const driver = getDriver(driverArea);
            await driver.setItems(values);
          })
        );
      },
      setMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await setMeta(driver, driverKey, properties);
      },
      setMetas: async (items) => {
        const areaToMetaUpdatesMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey(
            "key" in item ? item.key : item.item.key
          );
          areaToMetaUpdatesMap[driverArea] ??= [];
          areaToMetaUpdatesMap[driverArea].push({
            key: driverKey,
            properties: item.meta
          });
        });
        await Promise.all(
          Object.entries(areaToMetaUpdatesMap).map(
            async ([storageArea, updates]) => {
              const driver = getDriver(storageArea);
              const metaKeys = updates.map(({ key }) => getMetaKey(key));
              const existingMetas = await driver.getItems(metaKeys);
              const existingMetaMap = Object.fromEntries(
                existingMetas.map(({ key, value }) => [key, getMetaValue(value)])
              );
              const metaUpdates = updates.map(({ key, properties }) => {
                const metaKey = getMetaKey(key);
                return {
                  key: metaKey,
                  value: mergeMeta(existingMetaMap[metaKey] ?? {}, properties)
                };
              });
              await driver.setItems(metaUpdates);
            }
          )
        );
      },
      removeItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        await removeItem(driver, driverKey, opts);
      },
      removeItems: async (keys) => {
        const areaToKeysMap = {};
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") {
            keyStr = key;
          } else if ("getValue" in key) {
            keyStr = key.key;
          } else if ("item" in key) {
            keyStr = key.item.key;
            opts = key.options;
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          const { driverArea, driverKey } = resolveKey(keyStr);
          areaToKeysMap[driverArea] ??= [];
          areaToKeysMap[driverArea].push(driverKey);
          if (opts?.removeMeta) {
            areaToKeysMap[driverArea].push(getMetaKey(driverKey));
          }
        });
        await Promise.all(
          Object.entries(areaToKeysMap).map(async ([driverArea, keys2]) => {
            const driver = getDriver(driverArea);
            await driver.removeItems(keys2);
          })
        );
      },
      clear: async (base) => {
        const driver = getDriver(base);
        await driver.clear();
      },
      removeMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await removeMeta(driver, driverKey, properties);
      },
      snapshot: async (base, opts) => {
        const driver = getDriver(base);
        const data = await driver.snapshot();
        opts?.excludeKeys?.forEach((key) => {
          delete data[key];
          delete data[getMetaKey(key)];
        });
        return data;
      },
      restoreSnapshot: async (base, data) => {
        const driver = getDriver(base);
        await driver.restoreSnapshot(data);
      },
      watch: (key, cb) => {
        const { driver, driverKey } = resolveKey(key);
        return watch(driver, driverKey, cb);
      },
      unwatch() {
        Object.values(drivers).forEach((driver) => {
          driver.unwatch();
        });
      },
      defineItem: (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        const {
          version: targetVersion = 1,
          migrations = {},
          onMigrationComplete,
          debug = false
        } = opts ?? {};
        if (targetVersion < 1) {
          throw Error(
            "Storage item version cannot be less than 1. Initial versions should be set to 1, not 0."
          );
        }
        const migrate = async () => {
          const driverMetaKey = getMetaKey(driverKey);
          const [{ value }, { value: meta }] = await driver.getItems([
            driverKey,
            driverMetaKey
          ]);
          if (value == null) return;
          const currentVersion = meta?.v ?? 1;
          if (currentVersion > targetVersion) {
            throw Error(
              `Version downgrade detected (v${currentVersion} -> v${targetVersion}) for "${key}"`
            );
          }
          if (currentVersion === targetVersion) {
            return;
          }
          if (debug === true) {
            console.debug(
              `[@wxt-dev/storage] Running storage migration for ${key}: v${currentVersion} -> v${targetVersion}`
            );
          }
          const migrationsToRun = Array.from(
            { length: targetVersion - currentVersion },
            (_, i) => currentVersion + i + 1
          );
          let migratedValue = value;
          for (const migrateToVersion of migrationsToRun) {
            try {
              migratedValue = await migrations?.[migrateToVersion]?.(migratedValue) ?? migratedValue;
              if (debug === true) {
                console.debug(
                  `[@wxt-dev/storage] Storage migration processed for version: v${migrateToVersion}`
                );
              }
            } catch (err) {
              throw new MigrationError(key, migrateToVersion, {
                cause: err
              });
            }
          }
          await driver.setItems([
            { key: driverKey, value: migratedValue },
            { key: driverMetaKey, value: { ...meta, v: targetVersion } }
          ]);
          if (debug === true) {
            console.debug(
              `[@wxt-dev/storage] Storage migration completed for ${key} v${targetVersion}`,
              { migratedValue }
            );
          }
          onMigrationComplete?.(migratedValue, targetVersion);
        };
        const migrationsDone = opts?.migrations == null ? Promise.resolve() : migrate().catch((err) => {
          console.error(
            `[@wxt-dev/storage] Migration failed for ${key}`,
            err
          );
        });
        const initMutex = new Mutex();
        const getFallback = () => opts?.fallback ?? opts?.defaultValue ?? null;
        const getOrInitValue = () => initMutex.runExclusive(async () => {
          const value = await driver.getItem(driverKey);
          if (value != null || opts?.init == null) return value;
          const newValue = await opts.init();
          await driver.setItem(driverKey, newValue);
          return newValue;
        });
        migrationsDone.then(getOrInitValue);
        return {
          key,
          get defaultValue() {
            return getFallback();
          },
          get fallback() {
            return getFallback();
          },
          getValue: async () => {
            await migrationsDone;
            if (opts?.init) {
              return await getOrInitValue();
            } else {
              return await getItem(driver, driverKey, opts);
            }
          },
          getMeta: async () => {
            await migrationsDone;
            return await getMeta(driver, driverKey);
          },
          setValue: async (value) => {
            await migrationsDone;
            return await setItem(driver, driverKey, value);
          },
          setMeta: async (properties) => {
            await migrationsDone;
            return await setMeta(driver, driverKey, properties);
          },
          removeValue: async (opts2) => {
            await migrationsDone;
            return await removeItem(driver, driverKey, opts2);
          },
          removeMeta: async (properties) => {
            await migrationsDone;
            return await removeMeta(driver, driverKey, properties);
          },
          watch: (cb) => watch(
            driver,
            driverKey,
            (newValue, oldValue) => cb(newValue ?? getFallback(), oldValue ?? getFallback())
          ),
          migrate
        };
      }
    };
    return storage2;
  }
  function createDriver(storageArea) {
    const getStorageArea = () => {
      if (browser$1.runtime == null) {
        throw Error(
          [
            "'wxt/storage' must be loaded in a web extension environment",
            "\n - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371",
            " - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html\n"
          ].join("\n")
        );
      }
      if (browser$1.storage == null) {
        throw Error(
          "You must add the 'storage' permission to your manifest to use 'wxt/storage'"
        );
      }
      const area = browser$1.storage[storageArea];
      if (area == null)
        throw Error(`"browser.storage.${storageArea}" is undefined`);
      return area;
    };
    const watchListeners = /* @__PURE__ */ new Set();
    return {
      getItem: async (key) => {
        const res = await getStorageArea().get(key);
        return res[key];
      },
      getItems: async (keys) => {
        const result2 = await getStorageArea().get(keys);
        return keys.map((key) => ({ key, value: result2[key] ?? null }));
      },
      setItem: async (key, value) => {
        if (value == null) {
          await getStorageArea().remove(key);
        } else {
          await getStorageArea().set({ [key]: value });
        }
      },
      setItems: async (values) => {
        const map = values.reduce(
          (map2, { key, value }) => {
            map2[key] = value;
            return map2;
          },
          {}
        );
        await getStorageArea().set(map);
      },
      removeItem: async (key) => {
        await getStorageArea().remove(key);
      },
      removeItems: async (keys) => {
        await getStorageArea().remove(keys);
      },
      clear: async () => {
        await getStorageArea().clear();
      },
      snapshot: async () => {
        return await getStorageArea().get();
      },
      restoreSnapshot: async (data) => {
        await getStorageArea().set(data);
      },
      watch(key, cb) {
        const listener = (changes) => {
          const change = changes[key];
          if (change == null) return;
          if (dequal(change.newValue, change.oldValue)) return;
          cb(change.newValue ?? null, change.oldValue ?? null);
        };
        getStorageArea().onChanged.addListener(listener);
        watchListeners.add(listener);
        return () => {
          getStorageArea().onChanged.removeListener(listener);
          watchListeners.delete(listener);
        };
      },
      unwatch() {
        watchListeners.forEach((listener) => {
          getStorageArea().onChanged.removeListener(listener);
        });
        watchListeners.clear();
      }
    };
  }
  class MigrationError extends Error {
    constructor(key, version, options) {
      super(`v${version} migration failed for "${key}"`, options);
      this.key = key;
      this.version = version;
    }
  }
  const watchedVideosItem = storage.defineItem("local:watched_videos", {
    defaultValue: []
  });
  const getWatchedVideos = async () => {
    return await watchedVideosItem.getValue();
  };
  const markAsWatched = async (videoId) => {
    const watched = await getWatchedVideos();
    if (!watched.includes(videoId)) {
      await watchedVideosItem.setValue([...watched, videoId]);
    }
  };
  const definition = defineContentScript({
    matches: ["*://www.youtube.com/embed/*", "*://www.youtube.com/watch*"],
    main() {
      const trackedVideos = /* @__PURE__ */ new WeakSet();
      const getVideoId = () => {
        const url = new URL(window.location.href);
        if (url.pathname.includes("/embed/")) {
          const parts = url.pathname.split("/");
          return parts[parts.length - 1];
        }
        if (url.searchParams.has("v")) {
          return url.searchParams.get("v");
        }
        return null;
      };
      const attachTracker = (video2) => {
        if (trackedVideos.has(video2)) return;
        trackedVideos.add(video2);
        let marked = false;
        let currentId = getVideoId();
        video2.addEventListener("loadedmetadata", () => {
          marked = false;
          currentId = getVideoId();
        });
        video2.addEventListener("timeupdate", () => {
          const newId = getVideoId();
          if (newId !== currentId) {
            currentId = newId;
            marked = false;
          }
          if (marked) return;
          const { currentTime, duration } = video2;
          if (!duration) return;
          const progress = currentTime / duration;
          if (progress > 0.75) {
            if (currentId) {
              markAsWatched(currentId);
              marked = true;
            }
          }
        });
      };
      const observer = new MutationObserver(() => {
        const video2 = document.querySelector("video");
        if (video2) attachTracker(video2);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const video = document.querySelector("video");
      if (video) attachTracker(video);
    }
  });
  const browser = browser$1;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  class WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
    static EVENT_NAME = getUniqueEventName("wxt:locationchange");
  }
  function getUniqueEventName(eventName) {
    return `${browser?.runtime?.id}:${"youtube"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  class ContentScriptContext {
    constructor(contentScriptName, options) {
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName(
      "wxt:content-script-started"
    );
    isTopFrame = window.self === window.top;
    abortController;
    locationWatcher = createLocationWatcher(this);
    receivedMessageIds = /* @__PURE__ */ new Set();
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     *
     * Intervals can be cleared by calling the normal `clearInterval` function.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     *
     * Timeouts can be cleared by calling the normal `setTimeout` function.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     *
     * Callbacks can be canceled by calling the normal `cancelAnimationFrame` function.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     *
     * Callbacks can be canceled by calling the normal `cancelIdleCallback` function.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      target.addEventListener?.(
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      const isScriptStartedEvent = event.data?.type === ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = event.data?.contentScriptName === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has(event.data?.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && options?.ignoreFirstEvent) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  }
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("youtube", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"youtube"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvZGVxdWFsL2xpdGUvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2FzeW5jLW11dGV4L2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvc3RvcmFnZS9kaXN0L2luZGV4Lm1qcyIsIi4uLy4uLy4uL3V0aWxzL3N0b3JhZ2UudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy95b3V0dWJlLmNvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwidmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXF1YWwoZm9vLCBiYXIpIHtcblx0dmFyIGN0b3IsIGxlbjtcblx0aWYgKGZvbyA9PT0gYmFyKSByZXR1cm4gdHJ1ZTtcblxuXHRpZiAoZm9vICYmIGJhciAmJiAoY3Rvcj1mb28uY29uc3RydWN0b3IpID09PSBiYXIuY29uc3RydWN0b3IpIHtcblx0XHRpZiAoY3RvciA9PT0gRGF0ZSkgcmV0dXJuIGZvby5nZXRUaW1lKCkgPT09IGJhci5nZXRUaW1lKCk7XG5cdFx0aWYgKGN0b3IgPT09IFJlZ0V4cCkgcmV0dXJuIGZvby50b1N0cmluZygpID09PSBiYXIudG9TdHJpbmcoKTtcblxuXHRcdGlmIChjdG9yID09PSBBcnJheSkge1xuXHRcdFx0aWYgKChsZW49Zm9vLmxlbmd0aCkgPT09IGJhci5sZW5ndGgpIHtcblx0XHRcdFx0d2hpbGUgKGxlbi0tICYmIGRlcXVhbChmb29bbGVuXSwgYmFyW2xlbl0pKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZW4gPT09IC0xO1xuXHRcdH1cblxuXHRcdGlmICghY3RvciB8fCB0eXBlb2YgZm9vID09PSAnb2JqZWN0Jykge1xuXHRcdFx0bGVuID0gMDtcblx0XHRcdGZvciAoY3RvciBpbiBmb28pIHtcblx0XHRcdFx0aWYgKGhhcy5jYWxsKGZvbywgY3RvcikgJiYgKytsZW4gJiYgIWhhcy5jYWxsKGJhciwgY3RvcikpIHJldHVybiBmYWxzZTtcblx0XHRcdFx0aWYgKCEoY3RvciBpbiBiYXIpIHx8ICFkZXF1YWwoZm9vW2N0b3JdLCBiYXJbY3Rvcl0pKSByZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmtleXMoYmFyKS5sZW5ndGggPT09IGxlbjtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZm9vICE9PSBmb28gJiYgYmFyICE9PSBiYXI7XG59XG4iLCJjb25zdCBFX1RJTUVPVVQgPSBuZXcgRXJyb3IoJ3RpbWVvdXQgd2hpbGUgd2FpdGluZyBmb3IgbXV0ZXggdG8gYmVjb21lIGF2YWlsYWJsZScpO1xuY29uc3QgRV9BTFJFQURZX0xPQ0tFRCA9IG5ldyBFcnJvcignbXV0ZXggYWxyZWFkeSBsb2NrZWQnKTtcbmNvbnN0IEVfQ0FOQ0VMRUQgPSBuZXcgRXJyb3IoJ3JlcXVlc3QgZm9yIGxvY2sgY2FuY2VsZWQnKTtcblxudmFyIF9fYXdhaXRlciQyID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKF92YWx1ZSwgX2NhbmNlbEVycm9yID0gRV9DQU5DRUxFRCkge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IF92YWx1ZTtcbiAgICAgICAgdGhpcy5fY2FuY2VsRXJyb3IgPSBfY2FuY2VsRXJyb3I7XG4gICAgICAgIHRoaXMuX3F1ZXVlID0gW107XG4gICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVycyA9IFtdO1xuICAgIH1cbiAgICBhY3F1aXJlKHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICBpZiAod2VpZ2h0IDw9IDApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFzayA9IHsgcmVzb2x2ZSwgcmVqZWN0LCB3ZWlnaHQsIHByaW9yaXR5IH07XG4gICAgICAgICAgICBjb25zdCBpID0gZmluZEluZGV4RnJvbUVuZCh0aGlzLl9xdWV1ZSwgKG90aGVyKSA9PiBwcmlvcml0eSA8PSBvdGhlci5wcmlvcml0eSk7XG4gICAgICAgICAgICBpZiAoaSA9PT0gLTEgJiYgd2VpZ2h0IDw9IHRoaXMuX3ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gTmVlZHMgaW1tZWRpYXRlIGRpc3BhdGNoLCBza2lwIHRoZSBxdWV1ZVxuICAgICAgICAgICAgICAgIHRoaXMuX2Rpc3BhdGNoSXRlbSh0YXNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3F1ZXVlLnNwbGljZShpICsgMSwgMCwgdGFzayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2tfMSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyJDIodGhpcywgYXJndW1lbnRzLCB2b2lkIDAsIGZ1bmN0aW9uKiAoY2FsbGJhY2ssIHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICAgICAgY29uc3QgW3ZhbHVlLCByZWxlYXNlXSA9IHlpZWxkIHRoaXMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHdhaXRGb3JVbmxvY2sod2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIGlmICh0aGlzLl9jb3VsZExvY2tJbW1lZGlhdGVseSh3ZWlnaHQsIHByaW9yaXR5KSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSA9IFtdO1xuICAgICAgICAgICAgICAgIGluc2VydFNvcnRlZCh0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0sIHsgcmVzb2x2ZSwgcHJpb3JpdHkgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpc0xvY2tlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlIDw9IDA7XG4gICAgfVxuICAgIGdldFZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX2Rpc3BhdGNoUXVldWUoKTtcbiAgICB9XG4gICAgcmVsZWFzZSh3ZWlnaHQgPSAxKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIHRoaXMuX3ZhbHVlICs9IHdlaWdodDtcbiAgICAgICAgdGhpcy5fZGlzcGF0Y2hRdWV1ZSgpO1xuICAgIH1cbiAgICBjYW5jZWwoKSB7XG4gICAgICAgIHRoaXMuX3F1ZXVlLmZvckVhY2goKGVudHJ5KSA9PiBlbnRyeS5yZWplY3QodGhpcy5fY2FuY2VsRXJyb3IpKTtcbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICB9XG4gICAgX2Rpc3BhdGNoUXVldWUoKSB7XG4gICAgICAgIHRoaXMuX2RyYWluVW5sb2NrV2FpdGVycygpO1xuICAgICAgICB3aGlsZSAodGhpcy5fcXVldWUubGVuZ3RoID4gMCAmJiB0aGlzLl9xdWV1ZVswXS53ZWlnaHQgPD0gdGhpcy5fdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2Rpc3BhdGNoSXRlbSh0aGlzLl9xdWV1ZS5zaGlmdCgpKTtcbiAgICAgICAgICAgIHRoaXMuX2RyYWluVW5sb2NrV2FpdGVycygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9kaXNwYXRjaEl0ZW0oaXRlbSkge1xuICAgICAgICBjb25zdCBwcmV2aW91c1ZhbHVlID0gdGhpcy5fdmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlIC09IGl0ZW0ud2VpZ2h0O1xuICAgICAgICBpdGVtLnJlc29sdmUoW3ByZXZpb3VzVmFsdWUsIHRoaXMuX25ld1JlbGVhc2VyKGl0ZW0ud2VpZ2h0KV0pO1xuICAgIH1cbiAgICBfbmV3UmVsZWFzZXIod2VpZ2h0KSB7XG4gICAgICAgIGxldCBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjYWxsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSh3ZWlnaHQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBfZHJhaW5VbmxvY2tXYWl0ZXJzKCkge1xuICAgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB3ZWlnaHQgPSB0aGlzLl92YWx1ZTsgd2VpZ2h0ID4gMDsgd2VpZ2h0LS0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3YWl0ZXJzID0gdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmICghd2FpdGVycylcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgd2FpdGVycy5mb3JFYWNoKCh3YWl0ZXIpID0+IHdhaXRlci5yZXNvbHZlKCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgcXVldWVkUHJpb3JpdHkgPSB0aGlzLl9xdWV1ZVswXS5wcmlvcml0eTtcbiAgICAgICAgICAgIGZvciAobGV0IHdlaWdodCA9IHRoaXMuX3ZhbHVlOyB3ZWlnaHQgPiAwOyB3ZWlnaHQtLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdhaXRlcnMgPSB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBpID0gd2FpdGVycy5maW5kSW5kZXgoKHdhaXRlcikgPT4gd2FpdGVyLnByaW9yaXR5IDw9IHF1ZXVlZFByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAoaSA9PT0gLTEgPyB3YWl0ZXJzIDogd2FpdGVycy5zcGxpY2UoMCwgaSkpXG4gICAgICAgICAgICAgICAgICAgIC5mb3JFYWNoKCh3YWl0ZXIgPT4gd2FpdGVyLnJlc29sdmUoKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIF9jb3VsZExvY2tJbW1lZGlhdGVseSh3ZWlnaHQsIHByaW9yaXR5KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fcXVldWUubGVuZ3RoID09PSAwIHx8IHRoaXMuX3F1ZXVlWzBdLnByaW9yaXR5IDwgcHJpb3JpdHkpICYmXG4gICAgICAgICAgICB3ZWlnaHQgPD0gdGhpcy5fdmFsdWU7XG4gICAgfVxufVxuZnVuY3Rpb24gaW5zZXJ0U29ydGVkKGEsIHYpIHtcbiAgICBjb25zdCBpID0gZmluZEluZGV4RnJvbUVuZChhLCAob3RoZXIpID0+IHYucHJpb3JpdHkgPD0gb3RoZXIucHJpb3JpdHkpO1xuICAgIGEuc3BsaWNlKGkgKyAxLCAwLCB2KTtcbn1cbmZ1bmN0aW9uIGZpbmRJbmRleEZyb21FbmQoYSwgcHJlZGljYXRlKSB7XG4gICAgZm9yIChsZXQgaSA9IGEubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZShhW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG52YXIgX19hd2FpdGVyJDEgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmNsYXNzIE11dGV4IHtcbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxFcnJvcikge1xuICAgICAgICB0aGlzLl9zZW1hcGhvcmUgPSBuZXcgU2VtYXBob3JlKDEsIGNhbmNlbEVycm9yKTtcbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlciQxKHRoaXMsIGFyZ3VtZW50cywgdm9pZCAwLCBmdW5jdGlvbiogKHByaW9yaXR5ID0gMCkge1xuICAgICAgICAgICAgY29uc3QgWywgcmVsZWFzZXJdID0geWllbGQgdGhpcy5fc2VtYXBob3JlLmFjcXVpcmUoMSwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlbGVhc2VyO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5ydW5FeGNsdXNpdmUoKCkgPT4gY2FsbGJhY2soKSwgMSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICBpc0xvY2tlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5pc0xvY2tlZCgpO1xuICAgIH1cbiAgICB3YWl0Rm9yVW5sb2NrKHByaW9yaXR5ID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLndhaXRGb3JVbmxvY2soMSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICByZWxlYXNlKCkge1xuICAgICAgICBpZiAodGhpcy5fc2VtYXBob3JlLmlzTG9ja2VkKCkpXG4gICAgICAgICAgICB0aGlzLl9zZW1hcGhvcmUucmVsZWFzZSgpO1xuICAgIH1cbiAgICBjYW5jZWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUuY2FuY2VsKCk7XG4gICAgfVxufVxuXG52YXIgX19hd2FpdGVyID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5mdW5jdGlvbiB3aXRoVGltZW91dChzeW5jLCB0aW1lb3V0LCB0aW1lb3V0RXJyb3IgPSBFX1RJTUVPVVQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBhY3F1aXJlOiAod2VpZ2h0T3JQcmlvcml0eSwgcHJpb3JpdHkpID0+IHtcbiAgICAgICAgICAgIGxldCB3ZWlnaHQ7XG4gICAgICAgICAgICBpZiAoaXNTZW1hcGhvcmUoc3luYykpIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHByaW9yaXR5ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3ZWlnaHQgIT09IHVuZGVmaW5lZCAmJiB3ZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCBpc1RpbWVvdXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaXNUaW1lb3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRpbWVvdXRFcnJvcik7XG4gICAgICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlja2V0ID0geWllbGQgKGlzU2VtYXBob3JlKHN5bmMpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHN5bmMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBzeW5jLmFjcXVpcmUocHJpb3JpdHkpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZWFzZSA9IEFycmF5LmlzQXJyYXkodGlja2V0KSA/IHRpY2tldFsxXSA6IHRpY2tldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aWNrZXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrLCB3ZWlnaHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCByZWxlYXNlID0gKCkgPT4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpY2tldCA9IHlpZWxkIHRoaXMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGlja2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSA9IHRpY2tldFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjayh0aWNrZXRbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSA9IHRpY2tldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbGVhc2Uod2VpZ2h0KSB7XG4gICAgICAgICAgICBzeW5jLnJlbGVhc2Uod2VpZ2h0KTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsKCkge1xuICAgICAgICAgICAgcmV0dXJuIHN5bmMuY2FuY2VsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhaXRGb3JVbmxvY2s6ICh3ZWlnaHRPclByaW9yaXR5LCBwcmlvcml0eSkgPT4ge1xuICAgICAgICAgICAgbGV0IHdlaWdodDtcbiAgICAgICAgICAgIGlmIChpc1NlbWFwaG9yZShzeW5jKSkge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdlaWdodCAhPT0gdW5kZWZpbmVkICYmIHdlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QodGltZW91dEVycm9yKSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgKGlzU2VtYXBob3JlKHN5bmMpXG4gICAgICAgICAgICAgICAgICAgID8gc3luYy53YWl0Rm9yVW5sb2NrKHdlaWdodCwgcHJpb3JpdHkpXG4gICAgICAgICAgICAgICAgICAgIDogc3luYy53YWl0Rm9yVW5sb2NrKHByaW9yaXR5KSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNMb2NrZWQ6ICgpID0+IHN5bmMuaXNMb2NrZWQoKSxcbiAgICAgICAgZ2V0VmFsdWU6ICgpID0+IHN5bmMuZ2V0VmFsdWUoKSxcbiAgICAgICAgc2V0VmFsdWU6ICh2YWx1ZSkgPT4gc3luYy5zZXRWYWx1ZSh2YWx1ZSksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGlzU2VtYXBob3JlKHN5bmMpIHtcbiAgICByZXR1cm4gc3luYy5nZXRWYWx1ZSAhPT0gdW5kZWZpbmVkO1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpc25lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbmZ1bmN0aW9uIHRyeUFjcXVpcmUoc3luYywgYWxyZWFkeUFjcXVpcmVkRXJyb3IgPSBFX0FMUkVBRFlfTE9DS0VEKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICByZXR1cm4gd2l0aFRpbWVvdXQoc3luYywgMCwgYWxyZWFkeUFjcXVpcmVkRXJyb3IpO1xufVxuXG5leHBvcnQgeyBFX0FMUkVBRFlfTE9DS0VELCBFX0NBTkNFTEVELCBFX1RJTUVPVVQsIE11dGV4LCBTZW1hcGhvcmUsIHRyeUFjcXVpcmUsIHdpdGhUaW1lb3V0IH07XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBkZXF1YWwgfSBmcm9tICdkZXF1YWwvbGl0ZSc7XG5pbXBvcnQgeyBNdXRleCB9IGZyb20gJ2FzeW5jLW11dGV4JztcbmltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICdAd3h0LWRldi9icm93c2VyJztcblxuY29uc3Qgc3RvcmFnZSA9IGNyZWF0ZVN0b3JhZ2UoKTtcbmZ1bmN0aW9uIGNyZWF0ZVN0b3JhZ2UoKSB7XG4gIGNvbnN0IGRyaXZlcnMgPSB7XG4gICAgbG9jYWw6IGNyZWF0ZURyaXZlcihcImxvY2FsXCIpLFxuICAgIHNlc3Npb246IGNyZWF0ZURyaXZlcihcInNlc3Npb25cIiksXG4gICAgc3luYzogY3JlYXRlRHJpdmVyKFwic3luY1wiKSxcbiAgICBtYW5hZ2VkOiBjcmVhdGVEcml2ZXIoXCJtYW5hZ2VkXCIpXG4gIH07XG4gIGNvbnN0IGdldERyaXZlciA9IChhcmVhKSA9PiB7XG4gICAgY29uc3QgZHJpdmVyID0gZHJpdmVyc1thcmVhXTtcbiAgICBpZiAoZHJpdmVyID09IG51bGwpIHtcbiAgICAgIGNvbnN0IGFyZWFOYW1lcyA9IE9iamVjdC5rZXlzKGRyaXZlcnMpLmpvaW4oXCIsIFwiKTtcbiAgICAgIHRocm93IEVycm9yKGBJbnZhbGlkIGFyZWEgXCIke2FyZWF9XCIuIE9wdGlvbnM6ICR7YXJlYU5hbWVzfWApO1xuICAgIH1cbiAgICByZXR1cm4gZHJpdmVyO1xuICB9O1xuICBjb25zdCByZXNvbHZlS2V5ID0gKGtleSkgPT4ge1xuICAgIGNvbnN0IGRlbGltaW5hdG9ySW5kZXggPSBrZXkuaW5kZXhPZihcIjpcIik7XG4gICAgY29uc3QgZHJpdmVyQXJlYSA9IGtleS5zdWJzdHJpbmcoMCwgZGVsaW1pbmF0b3JJbmRleCk7XG4gICAgY29uc3QgZHJpdmVyS2V5ID0ga2V5LnN1YnN0cmluZyhkZWxpbWluYXRvckluZGV4ICsgMSk7XG4gICAgaWYgKGRyaXZlcktleSA9PSBudWxsKVxuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBTdG9yYWdlIGtleSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gb2YgXCJhcmVhOmtleVwiLCBidXQgcmVjZWl2ZWQgXCIke2tleX1cImBcbiAgICAgICk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRyaXZlckFyZWEsXG4gICAgICBkcml2ZXJLZXksXG4gICAgICBkcml2ZXI6IGdldERyaXZlcihkcml2ZXJBcmVhKVxuICAgIH07XG4gIH07XG4gIGNvbnN0IGdldE1ldGFLZXkgPSAoa2V5KSA9PiBrZXkgKyBcIiRcIjtcbiAgY29uc3QgbWVyZ2VNZXRhID0gKG9sZE1ldGEsIG5ld01ldGEpID0+IHtcbiAgICBjb25zdCBuZXdGaWVsZHMgPSB7IC4uLm9sZE1ldGEgfTtcbiAgICBPYmplY3QuZW50cmllcyhuZXdNZXRhKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSBkZWxldGUgbmV3RmllbGRzW2tleV07XG4gICAgICBlbHNlIG5ld0ZpZWxkc1trZXldID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ld0ZpZWxkcztcbiAgfTtcbiAgY29uc3QgZ2V0VmFsdWVPckZhbGxiYWNrID0gKHZhbHVlLCBmYWxsYmFjaykgPT4gdmFsdWUgPz8gZmFsbGJhY2sgPz8gbnVsbDtcbiAgY29uc3QgZ2V0TWV0YVZhbHVlID0gKHByb3BlcnRpZXMpID0+IHR5cGVvZiBwcm9wZXJ0aWVzID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHByb3BlcnRpZXMpID8gcHJvcGVydGllcyA6IHt9O1xuICBjb25zdCBnZXRJdGVtID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKSA9PiB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW0oZHJpdmVyS2V5KTtcbiAgICByZXR1cm4gZ2V0VmFsdWVPckZhbGxiYWNrKHJlcywgb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlKTtcbiAgfTtcbiAgY29uc3QgZ2V0TWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSkgPT4ge1xuICAgIGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSk7XG4gICAgcmV0dXJuIGdldE1ldGFWYWx1ZShyZXMpO1xuICB9O1xuICBjb25zdCBzZXRJdGVtID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSkgPT4ge1xuICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtKGRyaXZlcktleSwgdmFsdWUgPz8gbnVsbCk7XG4gIH07XG4gIGNvbnN0IHNldE1ldGEgPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpID0+IHtcbiAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgIGNvbnN0IGV4aXN0aW5nRmllbGRzID0gZ2V0TWV0YVZhbHVlKGF3YWl0IGRyaXZlci5nZXRJdGVtKG1ldGFLZXkpKTtcbiAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShtZXRhS2V5LCBtZXJnZU1ldGEoZXhpc3RpbmdGaWVsZHMsIHByb3BlcnRpZXMpKTtcbiAgfTtcbiAgY29uc3QgcmVtb3ZlSXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgb3B0cykgPT4ge1xuICAgIGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtKGRyaXZlcktleSk7XG4gICAgaWYgKG9wdHM/LnJlbW92ZU1ldGEpIHtcbiAgICAgIGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG4gICAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbShtZXRhS2V5KTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHJlbW92ZU1ldGEgPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpID0+IHtcbiAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgIGlmIChwcm9wZXJ0aWVzID09IG51bGwpIHtcbiAgICAgIGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtKG1ldGFLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBuZXdGaWVsZHMgPSBnZXRNZXRhVmFsdWUoYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSkpO1xuICAgICAgW3Byb3BlcnRpZXNdLmZsYXQoKS5mb3JFYWNoKChmaWVsZCkgPT4gZGVsZXRlIG5ld0ZpZWxkc1tmaWVsZF0pO1xuICAgICAgYXdhaXQgZHJpdmVyLnNldEl0ZW0obWV0YUtleSwgbmV3RmllbGRzKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHdhdGNoID0gKGRyaXZlciwgZHJpdmVyS2V5LCBjYikgPT4ge1xuICAgIHJldHVybiBkcml2ZXIud2F0Y2goZHJpdmVyS2V5LCBjYik7XG4gIH07XG4gIGNvbnN0IHN0b3JhZ2UyID0ge1xuICAgIGdldEl0ZW06IGFzeW5jIChrZXksIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKTtcbiAgICB9LFxuICAgIGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgY29uc3QgYXJlYVRvS2V5TWFwID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcbiAgICAgIGNvbnN0IGtleVRvT3B0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG4gICAgICBjb25zdCBvcmRlcmVkS2V5cyA9IFtdO1xuICAgICAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgbGV0IGtleVN0cjtcbiAgICAgICAgbGV0IG9wdHM7XG4gICAgICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5O1xuICAgICAgICB9IGVsc2UgaWYgKFwiZ2V0VmFsdWVcIiBpbiBrZXkpIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICAgIG9wdHMgPSB7IGZhbGxiYWNrOiBrZXkuZmFsbGJhY2sgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICAgIG9wdHMgPSBrZXkub3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBvcmRlcmVkS2V5cy5wdXNoKGtleVN0cik7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG4gICAgICAgIGNvbnN0IGFyZWFLZXlzID0gYXJlYVRvS2V5TWFwLmdldChkcml2ZXJBcmVhKSA/PyBbXTtcbiAgICAgICAgYXJlYVRvS2V5TWFwLnNldChkcml2ZXJBcmVhLCBhcmVhS2V5cy5jb25jYXQoZHJpdmVyS2V5KSk7XG4gICAgICAgIGtleVRvT3B0c01hcC5zZXQoa2V5U3RyLCBvcHRzKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgQXJyYXkuZnJvbShhcmVhVG9LZXlNYXAuZW50cmllcygpKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCBrZXlzMl0pID0+IHtcbiAgICAgICAgICBjb25zdCBkcml2ZXJSZXN1bHRzID0gYXdhaXQgZHJpdmVyc1tkcml2ZXJBcmVhXS5nZXRJdGVtcyhrZXlzMik7XG4gICAgICAgICAgZHJpdmVyUmVzdWx0cy5mb3JFYWNoKChkcml2ZXJSZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2RyaXZlckFyZWF9OiR7ZHJpdmVyUmVzdWx0LmtleX1gO1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGtleVRvT3B0c01hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0VmFsdWVPckZhbGxiYWNrKFxuICAgICAgICAgICAgICBkcml2ZXJSZXN1bHQudmFsdWUsXG4gICAgICAgICAgICAgIG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJlc3VsdHNNYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIHJldHVybiBvcmRlcmVkS2V5cy5tYXAoKGtleSkgPT4gKHtcbiAgICAgICAga2V5LFxuICAgICAgICB2YWx1ZTogcmVzdWx0c01hcC5nZXQoa2V5KVxuICAgICAgfSkpO1xuICAgIH0sXG4gICAgZ2V0TWV0YTogYXN5bmMgKGtleSkgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgcmV0dXJuIGF3YWl0IGdldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXkpO1xuICAgIH0sXG4gICAgZ2V0TWV0YXM6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICBjb25zdCBrZXlzID0gYXJncy5tYXAoKGFyZykgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSB0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiID8gYXJnIDogYXJnLmtleTtcbiAgICAgICAgY29uc3QgeyBkcml2ZXJBcmVhLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgZHJpdmVyQXJlYSxcbiAgICAgICAgICBkcml2ZXJLZXksXG4gICAgICAgICAgZHJpdmVyTWV0YUtleTogZ2V0TWV0YUtleShkcml2ZXJLZXkpXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGFyZWFUb0RyaXZlck1ldGFLZXlzTWFwID0ga2V5cy5yZWR1Y2UoKG1hcCwga2V5KSA9PiB7XG4gICAgICAgIG1hcFtrZXkuZHJpdmVyQXJlYV0gPz89IFtdO1xuICAgICAgICBtYXBba2V5LmRyaXZlckFyZWFdLnB1c2goa2V5KTtcbiAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgIH0sIHt9KTtcbiAgICAgIGNvbnN0IHJlc3VsdHNNYXAgPSB7fTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCkubWFwKGFzeW5jIChbYXJlYSwga2V5czJdKSA9PiB7XG4gICAgICAgICAgY29uc3QgYXJlYVJlcyA9IGF3YWl0IGJyb3dzZXIuc3RvcmFnZVthcmVhXS5nZXQoXG4gICAgICAgICAgICBrZXlzMi5tYXAoKGtleSkgPT4ga2V5LmRyaXZlck1ldGFLZXkpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBrZXlzMi5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdHNNYXBba2V5LmtleV0gPSBhcmVhUmVzW2tleS5kcml2ZXJNZXRhS2V5XSA/PyB7fTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICByZXR1cm4ga2V5cy5tYXAoKGtleSkgPT4gKHtcbiAgICAgICAga2V5OiBrZXkua2V5LFxuICAgICAgICBtZXRhOiByZXN1bHRzTWFwW2tleS5rZXldXG4gICAgICB9KSk7XG4gICAgfSxcbiAgICBzZXRJdGVtOiBhc3luYyAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgc2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgdmFsdWUpO1xuICAgIH0sXG4gICAgc2V0SXRlbXM6IGFzeW5jIChpdGVtcykgPT4ge1xuICAgICAgY29uc3QgYXJlYVRvS2V5VmFsdWVNYXAgPSB7fTtcbiAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3QgeyBkcml2ZXJBcmVhLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoXG4gICAgICAgICAgXCJrZXlcIiBpbiBpdGVtID8gaXRlbS5rZXkgOiBpdGVtLml0ZW0ua2V5XG4gICAgICAgICk7XG4gICAgICAgIGFyZWFUb0tleVZhbHVlTWFwW2RyaXZlckFyZWFdID8/PSBbXTtcbiAgICAgICAgYXJlYVRvS2V5VmFsdWVNYXBbZHJpdmVyQXJlYV0ucHVzaCh7XG4gICAgICAgICAga2V5OiBkcml2ZXJLZXksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9LZXlWYWx1ZU1hcCkubWFwKGFzeW5jIChbZHJpdmVyQXJlYSwgdmFsdWVzXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihkcml2ZXJBcmVhKTtcbiAgICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbXModmFsdWVzKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSxcbiAgICBzZXRNZXRhOiBhc3luYyAoa2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICBhd2FpdCBzZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKTtcbiAgICB9LFxuICAgIHNldE1ldGFzOiBhc3luYyAoaXRlbXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb01ldGFVcGRhdGVzTWFwID0ge307XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KFxuICAgICAgICAgIFwia2V5XCIgaW4gaXRlbSA/IGl0ZW0ua2V5IDogaXRlbS5pdGVtLmtleVxuICAgICAgICApO1xuICAgICAgICBhcmVhVG9NZXRhVXBkYXRlc01hcFtkcml2ZXJBcmVhXSA/Pz0gW107XG4gICAgICAgIGFyZWFUb01ldGFVcGRhdGVzTWFwW2RyaXZlckFyZWFdLnB1c2goe1xuICAgICAgICAgIGtleTogZHJpdmVyS2V5LFxuICAgICAgICAgIHByb3BlcnRpZXM6IGl0ZW0ubWV0YVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGFyZWFUb01ldGFVcGRhdGVzTWFwKS5tYXAoXG4gICAgICAgICAgYXN5bmMgKFtzdG9yYWdlQXJlYSwgdXBkYXRlc10pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihzdG9yYWdlQXJlYSk7XG4gICAgICAgICAgICBjb25zdCBtZXRhS2V5cyA9IHVwZGF0ZXMubWFwKCh7IGtleSB9KSA9PiBnZXRNZXRhS2V5KGtleSkpO1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdNZXRhcyA9IGF3YWl0IGRyaXZlci5nZXRJdGVtcyhtZXRhS2V5cyk7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ01ldGFNYXAgPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgICAgICAgIGV4aXN0aW5nTWV0YXMubWFwKCh7IGtleSwgdmFsdWUgfSkgPT4gW2tleSwgZ2V0TWV0YVZhbHVlKHZhbHVlKV0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3QgbWV0YVVwZGF0ZXMgPSB1cGRhdGVzLm1hcCgoeyBrZXksIHByb3BlcnRpZXMgfSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShrZXkpO1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGtleTogbWV0YUtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbWVyZ2VNZXRhKGV4aXN0aW5nTWV0YU1hcFttZXRhS2V5XSA/PyB7fSwgcHJvcGVydGllcylcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZHJpdmVyLnNldEl0ZW1zKG1ldGFVcGRhdGVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfSxcbiAgICByZW1vdmVJdGVtOiBhc3luYyAoa2V5LCBvcHRzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICBhd2FpdCByZW1vdmVJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKTtcbiAgICB9LFxuICAgIHJlbW92ZUl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgY29uc3QgYXJlYVRvS2V5c01hcCA9IHt9O1xuICAgICAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgbGV0IGtleVN0cjtcbiAgICAgICAgbGV0IG9wdHM7XG4gICAgICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5O1xuICAgICAgICB9IGVsc2UgaWYgKFwiZ2V0VmFsdWVcIiBpbiBrZXkpIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICB9IGVsc2UgaWYgKFwiaXRlbVwiIGluIGtleSkge1xuICAgICAgICAgIGtleVN0ciA9IGtleS5pdGVtLmtleTtcbiAgICAgICAgICBvcHRzID0ga2V5Lm9wdGlvbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5LmtleTtcbiAgICAgICAgICBvcHRzID0ga2V5Lm9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBkcml2ZXJBcmVhLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5U3RyKTtcbiAgICAgICAgYXJlYVRvS2V5c01hcFtkcml2ZXJBcmVhXSA/Pz0gW107XG4gICAgICAgIGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0ucHVzaChkcml2ZXJLZXkpO1xuICAgICAgICBpZiAob3B0cz8ucmVtb3ZlTWV0YSkge1xuICAgICAgICAgIGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0ucHVzaChnZXRNZXRhS2V5KGRyaXZlcktleSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9LZXlzTWFwKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCBrZXlzMl0pID0+IHtcbiAgICAgICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoZHJpdmVyQXJlYSk7XG4gICAgICAgICAgYXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW1zKGtleXMyKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSxcbiAgICBjbGVhcjogYXN5bmMgKGJhc2UpID0+IHtcbiAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihiYXNlKTtcbiAgICAgIGF3YWl0IGRyaXZlci5jbGVhcigpO1xuICAgIH0sXG4gICAgcmVtb3ZlTWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgfSxcbiAgICBzbmFwc2hvdDogYXN5bmMgKGJhc2UsIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihiYXNlKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBkcml2ZXIuc25hcHNob3QoKTtcbiAgICAgIG9wdHM/LmV4Y2x1ZGVLZXlzPy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgZGVsZXRlIGRhdGFbZ2V0TWV0YUtleShrZXkpXTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICByZXN0b3JlU25hcHNob3Q6IGFzeW5jIChiYXNlLCBkYXRhKSA9PiB7XG4gICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoYmFzZSk7XG4gICAgICBhd2FpdCBkcml2ZXIucmVzdG9yZVNuYXBzaG90KGRhdGEpO1xuICAgIH0sXG4gICAgd2F0Y2g6IChrZXksIGNiKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICByZXR1cm4gd2F0Y2goZHJpdmVyLCBkcml2ZXJLZXksIGNiKTtcbiAgICB9LFxuICAgIHVud2F0Y2goKSB7XG4gICAgICBPYmplY3QudmFsdWVzKGRyaXZlcnMpLmZvckVhY2goKGRyaXZlcikgPT4ge1xuICAgICAgICBkcml2ZXIudW53YXRjaCgpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWZpbmVJdGVtOiAoa2V5LCBvcHRzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHZlcnNpb246IHRhcmdldFZlcnNpb24gPSAxLFxuICAgICAgICBtaWdyYXRpb25zID0ge30sXG4gICAgICAgIG9uTWlncmF0aW9uQ29tcGxldGUsXG4gICAgICAgIGRlYnVnID0gZmFsc2VcbiAgICAgIH0gPSBvcHRzID8/IHt9O1xuICAgICAgaWYgKHRhcmdldFZlcnNpb24gPCAxKSB7XG4gICAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgIFwiU3RvcmFnZSBpdGVtIHZlcnNpb24gY2Fubm90IGJlIGxlc3MgdGhhbiAxLiBJbml0aWFsIHZlcnNpb25zIHNob3VsZCBiZSBzZXQgdG8gMSwgbm90IDAuXCJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1pZ3JhdGUgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGRyaXZlck1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG4gICAgICAgIGNvbnN0IFt7IHZhbHVlIH0sIHsgdmFsdWU6IG1ldGEgfV0gPSBhd2FpdCBkcml2ZXIuZ2V0SXRlbXMoW1xuICAgICAgICAgIGRyaXZlcktleSxcbiAgICAgICAgICBkcml2ZXJNZXRhS2V5XG4gICAgICAgIF0pO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvbiA9IG1ldGE/LnYgPz8gMTtcbiAgICAgICAgaWYgKGN1cnJlbnRWZXJzaW9uID4gdGFyZ2V0VmVyc2lvbikge1xuICAgICAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgICAgYFZlcnNpb24gZG93bmdyYWRlIGRldGVjdGVkICh2JHtjdXJyZW50VmVyc2lvbn0gLT4gdiR7dGFyZ2V0VmVyc2lvbn0pIGZvciBcIiR7a2V5fVwiYFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnJlbnRWZXJzaW9uID09PSB0YXJnZXRWZXJzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXG4gICAgICAgICAgICBgW0B3eHQtZGV2L3N0b3JhZ2VdIFJ1bm5pbmcgc3RvcmFnZSBtaWdyYXRpb24gZm9yICR7a2V5fTogdiR7Y3VycmVudFZlcnNpb259IC0+IHYke3RhcmdldFZlcnNpb259YFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWlncmF0aW9uc1RvUnVuID0gQXJyYXkuZnJvbShcbiAgICAgICAgICB7IGxlbmd0aDogdGFyZ2V0VmVyc2lvbiAtIGN1cnJlbnRWZXJzaW9uIH0sXG4gICAgICAgICAgKF8sIGkpID0+IGN1cnJlbnRWZXJzaW9uICsgaSArIDFcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IG1pZ3JhdGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgZm9yIChjb25zdCBtaWdyYXRlVG9WZXJzaW9uIG9mIG1pZ3JhdGlvbnNUb1J1bikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtaWdyYXRlZFZhbHVlID0gYXdhaXQgbWlncmF0aW9ucz8uW21pZ3JhdGVUb1ZlcnNpb25dPy4obWlncmF0ZWRWYWx1ZSkgPz8gbWlncmF0ZWRWYWx1ZTtcbiAgICAgICAgICAgIGlmIChkZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKFxuICAgICAgICAgICAgICAgIGBbQHd4dC1kZXYvc3RvcmFnZV0gU3RvcmFnZSBtaWdyYXRpb24gcHJvY2Vzc2VkIGZvciB2ZXJzaW9uOiB2JHttaWdyYXRlVG9WZXJzaW9ufWBcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBNaWdyYXRpb25FcnJvcihrZXksIG1pZ3JhdGVUb1ZlcnNpb24sIHtcbiAgICAgICAgICAgICAgY2F1c2U6IGVyclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtcyhbXG4gICAgICAgICAgeyBrZXk6IGRyaXZlcktleSwgdmFsdWU6IG1pZ3JhdGVkVmFsdWUgfSxcbiAgICAgICAgICB7IGtleTogZHJpdmVyTWV0YUtleSwgdmFsdWU6IHsgLi4ubWV0YSwgdjogdGFyZ2V0VmVyc2lvbiB9IH1cbiAgICAgICAgXSk7XG4gICAgICAgIGlmIChkZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXG4gICAgICAgICAgICBgW0B3eHQtZGV2L3N0b3JhZ2VdIFN0b3JhZ2UgbWlncmF0aW9uIGNvbXBsZXRlZCBmb3IgJHtrZXl9IHYke3RhcmdldFZlcnNpb259YCxcbiAgICAgICAgICAgIHsgbWlncmF0ZWRWYWx1ZSB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBvbk1pZ3JhdGlvbkNvbXBsZXRlPy4obWlncmF0ZWRWYWx1ZSwgdGFyZ2V0VmVyc2lvbik7XG4gICAgICB9O1xuICAgICAgY29uc3QgbWlncmF0aW9uc0RvbmUgPSBvcHRzPy5taWdyYXRpb25zID09IG51bGwgPyBQcm9taXNlLnJlc29sdmUoKSA6IG1pZ3JhdGUoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgYFtAd3h0LWRldi9zdG9yYWdlXSBNaWdyYXRpb24gZmFpbGVkIGZvciAke2tleX1gLFxuICAgICAgICAgIGVyclxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBpbml0TXV0ZXggPSBuZXcgTXV0ZXgoKTtcbiAgICAgIGNvbnN0IGdldEZhbGxiYWNrID0gKCkgPT4gb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlID8/IG51bGw7XG4gICAgICBjb25zdCBnZXRPckluaXRWYWx1ZSA9ICgpID0+IGluaXRNdXRleC5ydW5FeGNsdXNpdmUoYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGRyaXZlci5nZXRJdGVtKGRyaXZlcktleSk7XG4gICAgICAgIGlmICh2YWx1ZSAhPSBudWxsIHx8IG9wdHM/LmluaXQgPT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGF3YWl0IG9wdHMuaW5pdCgpO1xuICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShkcml2ZXJLZXksIG5ld1ZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgICAgfSk7XG4gICAgICBtaWdyYXRpb25zRG9uZS50aGVuKGdldE9ySW5pdFZhbHVlKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgZ2V0IGRlZmF1bHRWYWx1ZSgpIHtcbiAgICAgICAgICByZXR1cm4gZ2V0RmFsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0IGZhbGxiYWNrKCkge1xuICAgICAgICAgIHJldHVybiBnZXRGYWxsYmFjaygpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRWYWx1ZTogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIGlmIChvcHRzPy5pbml0KSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0T3JJbml0VmFsdWUoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGdldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0TWV0YTogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0VmFsdWU6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCBzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldE1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmVWYWx1ZTogYXN5bmMgKG9wdHMyKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHJlbW92ZUl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlTWV0YTogYXN5bmMgKHByb3BlcnRpZXMpID0+IHtcbiAgICAgICAgICBhd2FpdCBtaWdyYXRpb25zRG9uZTtcbiAgICAgICAgICByZXR1cm4gYXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhdGNoOiAoY2IpID0+IHdhdGNoKFxuICAgICAgICAgIGRyaXZlcixcbiAgICAgICAgICBkcml2ZXJLZXksXG4gICAgICAgICAgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4gY2IobmV3VmFsdWUgPz8gZ2V0RmFsbGJhY2soKSwgb2xkVmFsdWUgPz8gZ2V0RmFsbGJhY2soKSlcbiAgICAgICAgKSxcbiAgICAgICAgbWlncmF0ZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzdG9yYWdlMjtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURyaXZlcihzdG9yYWdlQXJlYSkge1xuICBjb25zdCBnZXRTdG9yYWdlQXJlYSA9ICgpID0+IHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lID09IG51bGwpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBbXG4gICAgICAgICAgXCInd3h0L3N0b3JhZ2UnIG11c3QgYmUgbG9hZGVkIGluIGEgd2ViIGV4dGVuc2lvbiBlbnZpcm9ubWVudFwiLFxuICAgICAgICAgIFwiXFxuIC0gSWYgdGhyb3duIGR1cmluZyBhIGJ1aWxkLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3d4dC1kZXYvd3h0L2lzc3Vlcy8zNzFcIixcbiAgICAgICAgICBcIiAtIElmIHRocm93biBkdXJpbmcgdGVzdHMsIG1vY2sgJ3d4dC9icm93c2VyJyBjb3JyZWN0bHkuIFNlZSBodHRwczovL3d4dC5kZXYvZ3VpZGUvZ28tZnVydGhlci90ZXN0aW5nLmh0bWxcXG5cIlxuICAgICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChicm93c2VyLnN0b3JhZ2UgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIFwiWW91IG11c3QgYWRkIHRoZSAnc3RvcmFnZScgcGVybWlzc2lvbiB0byB5b3VyIG1hbmlmZXN0IHRvIHVzZSAnd3h0L3N0b3JhZ2UnXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGFyZWEgPSBicm93c2VyLnN0b3JhZ2Vbc3RvcmFnZUFyZWFdO1xuICAgIGlmIChhcmVhID09IG51bGwpXG4gICAgICB0aHJvdyBFcnJvcihgXCJicm93c2VyLnN0b3JhZ2UuJHtzdG9yYWdlQXJlYX1cIiBpcyB1bmRlZmluZWRgKTtcbiAgICByZXR1cm4gYXJlYTtcbiAgfTtcbiAgY29uc3Qgd2F0Y2hMaXN0ZW5lcnMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICByZXR1cm4ge1xuICAgIGdldEl0ZW06IGFzeW5jIChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KGtleSk7XG4gICAgICByZXR1cm4gcmVzW2tleV07XG4gICAgfSxcbiAgICBnZXRJdGVtczogYXN5bmMgKGtleXMpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KGtleXMpO1xuICAgICAgcmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7IGtleSwgdmFsdWU6IHJlc3VsdFtrZXldID8/IG51bGwgfSkpO1xuICAgIH0sXG4gICAgc2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkucmVtb3ZlKGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldCh7IFtrZXldOiB2YWx1ZSB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHNldEl0ZW1zOiBhc3luYyAodmFsdWVzKSA9PiB7XG4gICAgICBjb25zdCBtYXAgPSB2YWx1ZXMucmVkdWNlKFxuICAgICAgICAobWFwMiwgeyBrZXksIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICBtYXAyW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICByZXR1cm4gbWFwMjtcbiAgICAgICAgfSxcbiAgICAgICAge31cbiAgICAgICk7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChtYXApO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbTogYXN5bmMgKGtleSkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5KTtcbiAgICB9LFxuICAgIHJlbW92ZUl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5cyk7XG4gICAgfSxcbiAgICBjbGVhcjogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5jbGVhcigpO1xuICAgIH0sXG4gICAgc25hcHNob3Q6IGFzeW5jICgpID0+IHtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLmdldCgpO1xuICAgIH0sXG4gICAgcmVzdG9yZVNuYXBzaG90OiBhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5zZXQoZGF0YSk7XG4gICAgfSxcbiAgICB3YXRjaChrZXksIGNiKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lciA9IChjaGFuZ2VzKSA9PiB7XG4gICAgICAgIGNvbnN0IGNoYW5nZSA9IGNoYW5nZXNba2V5XTtcbiAgICAgICAgaWYgKGNoYW5nZSA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChkZXF1YWwoY2hhbmdlLm5ld1ZhbHVlLCBjaGFuZ2Uub2xkVmFsdWUpKSByZXR1cm47XG4gICAgICAgIGNiKGNoYW5nZS5uZXdWYWx1ZSA/PyBudWxsLCBjaGFuZ2Uub2xkVmFsdWUgPz8gbnVsbCk7XG4gICAgICB9O1xuICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgd2F0Y2hMaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGdldFN0b3JhZ2VBcmVhKCkub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgd2F0Y2hMaXN0ZW5lcnMuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bndhdGNoKCkge1xuICAgICAgd2F0Y2hMaXN0ZW5lcnMuZm9yRWFjaCgobGlzdGVuZXIpID0+IHtcbiAgICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgICB3YXRjaExpc3RlbmVycy5jbGVhcigpO1xuICAgIH1cbiAgfTtcbn1cbmNsYXNzIE1pZ3JhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihrZXksIHZlcnNpb24sIG9wdGlvbnMpIHtcbiAgICBzdXBlcihgdiR7dmVyc2lvbn0gbWlncmF0aW9uIGZhaWxlZCBmb3IgXCIke2tleX1cImAsIG9wdGlvbnMpO1xuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gIH1cbn1cblxuZXhwb3J0IHsgTWlncmF0aW9uRXJyb3IsIHN0b3JhZ2UgfTtcbiIsImltcG9ydCB7IHN0b3JhZ2UgfSBmcm9tICcjaW1wb3J0cyc7XG5cbmV4cG9ydCBjb25zdCB3YXRjaGVkVmlkZW9zSXRlbSA9IHN0b3JhZ2UuZGVmaW5lSXRlbTxzdHJpbmdbXT4oJ2xvY2FsOndhdGNoZWRfdmlkZW9zJywge1xuICBkZWZhdWx0VmFsdWU6IFtdLFxufSk7XG5cbmV4cG9ydCBjb25zdCBnZXRXYXRjaGVkVmlkZW9zID0gYXN5bmMgKCk6IFByb21pc2U8c3RyaW5nW10+ID0+IHtcbiAgcmV0dXJuIGF3YWl0IHdhdGNoZWRWaWRlb3NJdGVtLmdldFZhbHVlKCk7XG59O1xuXG5leHBvcnQgY29uc3QgaXNXYXRjaGVkID0gYXN5bmMgKHZpZGVvSWQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICBjb25zdCB3YXRjaGVkID0gYXdhaXQgZ2V0V2F0Y2hlZFZpZGVvcygpO1xuICByZXR1cm4gd2F0Y2hlZC5pbmNsdWRlcyh2aWRlb0lkKTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYXJrQXNXYXRjaGVkID0gYXN5bmMgKHZpZGVvSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICBjb25zdCB3YXRjaGVkID0gYXdhaXQgZ2V0V2F0Y2hlZFZpZGVvcygpO1xuICBpZiAoIXdhdGNoZWQuaW5jbHVkZXModmlkZW9JZCkpIHtcbiAgICBhd2FpdCB3YXRjaGVkVmlkZW9zSXRlbS5zZXRWYWx1ZShbLi4ud2F0Y2hlZCwgdmlkZW9JZF0pO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgbWFya0FzVW53YXRjaGVkID0gYXN5bmMgKHZpZGVvSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICBjb25zdCB3YXRjaGVkID0gYXdhaXQgZ2V0V2F0Y2hlZFZpZGVvcygpO1xuICBjb25zdCBuZXdXYXRjaGVkID0gd2F0Y2hlZC5maWx0ZXIoKGlkKSA9PiBpZCAhPT0gdmlkZW9JZCk7XG4gIGF3YWl0IHdhdGNoZWRWaWRlb3NJdGVtLnNldFZhbHVlKG5ld1dhdGNoZWQpO1xufTtcblxuZXhwb3J0IGNvbnN0IHdhdGNoV2F0Y2hlZFZpZGVvcyA9IChjYWxsYmFjazogKHdhdGNoZWQ6IHN0cmluZ1tdKSA9PiB2b2lkKSA9PiB7XG4gIHJldHVybiB3YXRjaGVkVmlkZW9zSXRlbS53YXRjaCgobmV3VmFsdWU6IHN0cmluZ1tdKSA9PiB7XG4gICAgY2FsbGJhY2sobmV3VmFsdWUgfHwgW10pO1xuICB9KTtcbn07XG4iLCJpbXBvcnQgeyBtYXJrQXNXYXRjaGVkIH0gZnJvbSAnQC91dGlscy9zdG9yYWdlJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFsnKjovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC8qJywgJyo6Ly93d3cueW91dHViZS5jb20vd2F0Y2gqJ10sXG4gIG1haW4oKSB7XG4gICAgY29uc3QgdHJhY2tlZFZpZGVvcyA9IG5ldyBXZWFrU2V0PEhUTUxWaWRlb0VsZW1lbnQ+KCk7XG4gICAgXG4gICAgY29uc3QgZ2V0VmlkZW9JZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgaWYgKHVybC5wYXRobmFtZS5pbmNsdWRlcygnL2VtYmVkLycpKSB7XG4gICAgICAgIGNvbnN0IHBhcnRzID0gdXJsLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIHJldHVybiBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcbiAgICAgIH1cbiAgICAgIGlmICh1cmwuc2VhcmNoUGFyYW1zLmhhcygndicpKSB7XG4gICAgICAgIHJldHVybiB1cmwuc2VhcmNoUGFyYW1zLmdldCgndicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIGNvbnN0IGF0dGFjaFRyYWNrZXIgPSAodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHtcbiAgICAgIGlmICh0cmFja2VkVmlkZW9zLmhhcyh2aWRlbykpIHJldHVybjtcbiAgICAgIFxuICAgICAgLy8gY29uc29sZS5sb2coJ0tvb2xwYWxzIFRyYWNrZXI6IEF0dGFjaGluZyB0byB2aWRlbyBlbGVtZW50Jyk7XG4gICAgICB0cmFja2VkVmlkZW9zLmFkZCh2aWRlbyk7XG5cbiAgICAgIGxldCBtYXJrZWQgPSBmYWxzZTtcbiAgICAgIGxldCBjdXJyZW50SWQgPSBnZXRWaWRlb0lkKCk7XG5cbiAgICAgIC8vIFJlc2V0IHN0YXRlIHdoZW4gdmlkZW8gbG9hZHMgbmV3IGNvbnRlbnQgKG5hdGl2ZSBldmVudClcbiAgICAgIHZpZGVvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgKCkgPT4ge1xuICAgICAgICBtYXJrZWQgPSBmYWxzZTtcbiAgICAgICAgY3VycmVudElkID0gZ2V0VmlkZW9JZCgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFsc28gbGlzdGVuIHRvIHNlZWtpbmcgdG8gYXZvaWQgcmUtbWFya2luZyBpZiB3ZSB1bndhdGNoZWQgbWFudWFsbHkgYnV0IHVzZXIgaXMganVzdCBzY3J1YmJpbmc/IFxuICAgICAgLy8gQWN0dWFsbHksIGlmIHRoZXkgc2NydWIgcGFzdCA3NSUsIHdlIG1hcmsgaXQuIFRoYXQncyBmaW5lLlxuXG4gICAgICB2aWRlby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgKCkgPT4ge1xuICAgICAgICAvLyBDaGVjayBpZiBVUkwgY2hhbmdlZCAoU1BBIG5hdmlnYXRpb24gaW4gWW91VHViZSkgd2l0aG91dCByZXBsYWNpbmcgdmlkZW8gZWxlbWVudFxuICAgICAgICBjb25zdCBuZXdJZCA9IGdldFZpZGVvSWQoKTtcbiAgICAgICAgaWYgKG5ld0lkICE9PSBjdXJyZW50SWQpIHtcbiAgICAgICAgICAgIGN1cnJlbnRJZCA9IG5ld0lkO1xuICAgICAgICAgICAgbWFya2VkID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWFya2VkKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgeyBjdXJyZW50VGltZSwgZHVyYXRpb24gfSA9IHZpZGVvO1xuICAgICAgICBpZiAoIWR1cmF0aW9uKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBjdXJyZW50VGltZSAvIGR1cmF0aW9uO1xuICAgICAgICBpZiAocHJvZ3Jlc3MgPiAwLjc1KSB7XG4gICAgICAgICAgaWYgKGN1cnJlbnRJZCkge1xuICAgICAgICAgICAgbWFya0FzV2F0Y2hlZChjdXJyZW50SWQpO1xuICAgICAgICAgICAgbWFya2VkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBPYnNlcnZlciBmb3IgbmV3IHZpZGVvIGVsZW1lbnRzXG4gICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoKSA9PiB7XG4gICAgICAgIGNvbnN0IHZpZGVvID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigndmlkZW8nKTtcbiAgICAgICAgaWYgKHZpZGVvKSBhdHRhY2hUcmFja2VyKHZpZGVvKTtcbiAgICB9KTtcbiAgICBcbiAgICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgY2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlIH0pO1xuXG4gICAgLy8gSW5pdGlhbCBjaGVja1xuICAgIGNvbnN0IHZpZGVvID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigndmlkZW8nKTtcbiAgICBpZiAodmlkZW8pIGF0dGFjaFRyYWNrZXIodmlkZW8pO1xuICB9LFxufSk7XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pcXVlRXZlbnROYW1lXG59IGZyb20gXCIuL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW50ZXJ2YWxzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2xlYXJJbnRlcnZhbGAgZnVuY3Rpb24uXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxJZGxlQ2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwicmVzdWx0IiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FDRkEsTUFBSSxNQUFNLE9BQU8sVUFBVTtBQUVwQixXQUFTLE9BQU8sS0FBSyxLQUFLO0FBQ2hDLFFBQUksTUFBTTtBQUNWLFFBQUksUUFBUSxJQUFLLFFBQU87QUFFeEIsUUFBSSxPQUFPLFFBQVEsT0FBSyxJQUFJLGlCQUFpQixJQUFJLGFBQWE7QUFDN0QsVUFBSSxTQUFTLEtBQU0sUUFBTyxJQUFJLFFBQU8sTUFBTyxJQUFJLFFBQU87QUFDdkQsVUFBSSxTQUFTLE9BQVEsUUFBTyxJQUFJLFNBQVEsTUFBTyxJQUFJLFNBQVE7QUFFM0QsVUFBSSxTQUFTLE9BQU87QUFDbkIsYUFBSyxNQUFJLElBQUksWUFBWSxJQUFJLFFBQVE7QUFDcEMsaUJBQU8sU0FBUyxPQUFPLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUU7QUFBQSxRQUM1QztBQUNBLGVBQU8sUUFBUTtBQUFBLE1BQ2hCO0FBRUEsVUFBSSxDQUFDLFFBQVEsT0FBTyxRQUFRLFVBQVU7QUFDckMsY0FBTTtBQUNOLGFBQUssUUFBUSxLQUFLO0FBQ2pCLGNBQUksSUFBSSxLQUFLLEtBQUssSUFBSSxLQUFLLEVBQUUsT0FBTyxDQUFDLElBQUksS0FBSyxLQUFLLElBQUksRUFBRyxRQUFPO0FBQ2pFLGNBQUksRUFBRSxRQUFRLFFBQVEsQ0FBQyxPQUFPLElBQUksSUFBSSxHQUFH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
youtube;