var PropertyLock = (() => {
  let locked = false;
  let timeout = 0;

  const store = PropertiesService.getScriptProperties();

  const propertyName = "locked";
  const triggerName = "PropertyLock.releaseLock";

  const toSleep = 10;
  const currentGSuiteRuntimeLimit = 30 * 60 * 1e3;

  class lock {
    constructor() {}
    /**
     * @returns {boolean}
     */
    static hasLock() {
      return locked;
    }
    /**
     * @param {number} timeoutInMillis
     * @returns {boolean}
     */
    static tryLock(timeoutInMillis) {
      //emulates "no effect if the lock has already been acquired"
      if (locked) {
        return true;
      }

      timeout === 0 && (timeout = timeoutInMillis);

      const stored = store.getProperty(propertyName);
      const isLocked = stored ? JSON.parse(stored) : false;

      const canWait = timeout > 0;

      if (isLocked && canWait) {
        Utilities.sleep(toSleep);

        timeout -= toSleep;

        return timeout > 0 ? PropertyLock.tryLock(timeoutInMillis) : false;
      }

      if (!canWait) {
        return false;
      }

      try {
        store.setProperty(propertyName, true);

        ScriptApp.newTrigger(triggerName)
          .timeBased()
          .after(currentGSuiteRuntimeLimit)
          .create();

        locked = true;

        return locked;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    /**
     * @returns {void}
     */
    static releaseLock() {
      try {
        locked = false;
        store.setProperty(propertyName, locked);

        const trigger = ScriptApp.getProjectTriggers().find(
          (n) => n.getHandlerFunction() === triggerName
        );

        trigger && ScriptApp.deleteTrigger(trigger);
      } catch (error) {
        console.error(error);
      }
    }
    /**
     * @param {number} timeoutInMillis
     * @returns {boolean}
     *
     * @throws {Error}
     */
    static waitLock(timeoutInMillis) {
      const hasLock = PropertyLock.tryLock(timeoutInMillis);

      if (!hasLock) {
        throw new Error("Could not obtain lock");
      }

      return hasLock;
    }
  }

  return lock;
})();

var PropertyLockService = (() => {
  const init = function () {};

  init.getScriptLock = () => PropertyLock;

  return init;
})();