(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _createClass2 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var ComponentManager = function () {
  function ComponentManager(permissions, onReady) {
    _classCallCheck(this, ComponentManager);

    this.sentMessages = [];
    this.messageQueue = [];
    this.loggingEnabled = false;
    this.acceptsThemes = true;
    this.activeThemes = [];

    this.initialPermissions = permissions;
    this.onReadyCallback = onReady;

    this.coallesedSaving = true;
    this.coallesedSavingDelay = 250;

    this.registerMessageHandler();
  }

  _createClass(ComponentManager, [{
    key: "registerMessageHandler",
    value: function registerMessageHandler() {
      var _this = this;

      var messageHandler = function messageHandler(event, mobileSource) {
        if (_this.loggingEnabled) {
          console.log("Components API Message received:", event.data, "mobile?", mobileSource);
        }

        // The first message will be the most reliable one, so we won't change it after any subsequent events,
        // in case you receive an event from another window.
        if (!_this.origin) {
          _this.origin = event.origin;
        }
        _this.mobileSource = mobileSource;
        // If from mobile app, JSON needs to be used.
        var data = mobileSource ? JSON.parse(event.data) : event.data;
        _this.handleMessage(data);
      };

      // Mobile (React Native) uses `document`, web/desktop uses `window`.addEventListener
      // for postMessage API to work properly.

      document.addEventListener("message", function (event) {
        messageHandler(event, true);
      }, false);

      window.addEventListener("message", function (event) {
        messageHandler(event, false);
      }, false);
    }
  }, {
    key: "handleMessage",
    value: function handleMessage(payload) {
      if (payload.action === "component-registered") {
        this.sessionKey = payload.sessionKey;
        this.componentData = payload.componentData;

        this.onReady(payload.data);

        if (this.loggingEnabled) {
          console.log("Component successfully registered with payload:", payload);
        }
      } else if (payload.action === "themes") {
        if (this.acceptsThemes) {
          this.activateThemes(payload.data.themes);
        }
      } else if (payload.original) {
        // get callback from queue
        var originalMessage = this.sentMessages.filter(function (message) {
          return message.messageId === payload.original.messageId;
        })[0];

        if (!originalMessage) {
          // Connection must have been reset. Alert the user.
          alert("This extension is attempting to communicate with Standard Notes, but an error is preventing it from doing so. Please restart this extension and try again.");
        }

        if (originalMessage.callback) {
          originalMessage.callback(payload.data);
        }
      }
    }
  }, {
    key: "onReady",
    value: function onReady(data) {
      if (this.initialPermissions && this.initialPermissions.length > 0) {
        this.requestPermissions(this.initialPermissions);
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.messageQueue[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var message = _step.value;

          this.postMessage(message.action, message.data, message.callback);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.messageQueue = [];
      this.environment = data.environment;
      this.platform = data.platform;
      this.uuid = data.uuid;

      if (this.loggingEnabled) {
        console.log("onReadyData", data);
      }

      this.activateThemes(data.activeThemeUrls || []);

      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    }
  }, {
    key: "getSelfComponentUUID",
    value: function getSelfComponentUUID() {
      return this.uuid;
    }
  }, {
    key: "isRunningInDesktopApplication",
    value: function isRunningInDesktopApplication() {
      return this.environment === "desktop";
    }
  }, {
    key: "setComponentDataValueForKey",
    value: function setComponentDataValueForKey(key, value) {
      this.componentData[key] = value;
      this.postMessage("set-component-data", { componentData: this.componentData }, function (data) {});
    }
  }, {
    key: "clearComponentData",
    value: function clearComponentData() {
      this.componentData = {};
      this.postMessage("set-component-data", { componentData: this.componentData }, function (data) {});
    }
  }, {
    key: "componentDataValueForKey",
    value: function componentDataValueForKey(key) {
      return this.componentData[key];
    }
  }, {
    key: "postMessage",
    value: function postMessage(action, data, callback) {
      if (!this.sessionKey) {
        this.messageQueue.push({
          action: action,
          data: data,
          callback: callback
        });
        return;
      }

      var message = {
        action: action,
        data: data,
        messageId: this.generateUUID(),
        sessionKey: this.sessionKey,
        api: "component"
      };

      var sentMessage = JSON.parse(JSON.stringify(message));
      sentMessage.callback = callback;
      this.sentMessages.push(sentMessage);

      // Mobile (React Native) requires a string for the postMessage API.
      if (this.mobileSource) {
        message = JSON.stringify(message);
      }

      if (this.loggingEnabled) {
        console.log("Posting message:", message);
      }

      window.parent.postMessage(message, this.origin);
    }
  }, {
    key: "setSize",
    value: function setSize(type, width, height) {
      this.postMessage("set-size", { type: type, width: width, height: height }, function (data) {});
    }
  }, {
    key: "requestPermissions",
    value: function requestPermissions(permissions, callback) {
      this.postMessage("request-permissions", { permissions: permissions }, function (data) {
        callback && callback();
      }.bind(this));
    }
  }, {
    key: "streamItems",
    value: function streamItems(contentTypes, callback) {
      if (!Array.isArray(contentTypes)) {
        contentTypes = [contentTypes];
      }
      this.postMessage("stream-items", { content_types: contentTypes }, function (data) {
        callback(data.items);
      }.bind(this));
    }
  }, {
    key: "streamContextItem",
    value: function streamContextItem(callback) {
      this.postMessage("stream-context-item", null, function (data) {
        var item = data.item;
        /*
          When an item is saved via saveItem, its updated_at value is set client side to the current date.
          If we make a change locally, then for whatever reason receive an item via streamItems/streamContextItem,
          we want to ignore that change if it was made prior to the latest change we've made.
           Update 1/22/18: However, if a user is restoring a note from version history, this change
          will not pass through this filter and will thus be ignored. Because the client now handles
          this case with isMetadataUpdate, we no longer need the below.
        */
        // if(this.streamedContextItem && this.streamedContextItem.uuid == item.uuid
        //   && this.streamedContextItem.updated_at > item.updated_at) {
        //   return;
        // }
        // this.streamedContextItem = item;
        callback(item);
      });
    }
  }, {
    key: "selectItem",
    value: function selectItem(item) {
      this.postMessage("select-item", { item: this.jsonObjectForItem(item) });
    }
  }, {
    key: "createItem",
    value: function createItem(item, callback) {
      this.postMessage("create-item", { item: this.jsonObjectForItem(item) }, function (data) {
        var item = data.item;

        // A previous version of the SN app had an issue where the item in the reply to create-item
        // would be nested inside "items" and not "item". So handle both cases here.
        if (!item && data.items && data.items.length > 0) {
          item = data.items[0];
        }

        this.associateItem(item);
        callback && callback(item);
      }.bind(this));
    }
  }, {
    key: "createItems",
    value: function createItems(items, callback) {
      var _this2 = this;

      var mapped = items.map(function (item) {
        return _this2.jsonObjectForItem(item);
      });
      this.postMessage("create-items", { items: mapped }, function (data) {
        callback && callback(data.items);
      }.bind(this));
    }
  }, {
    key: "associateItem",
    value: function associateItem(item) {
      this.postMessage("associate-item", { item: this.jsonObjectForItem(item) });
    }
  }, {
    key: "deassociateItem",
    value: function deassociateItem(item) {
      this.postMessage("deassociate-item", { item: this.jsonObjectForItem(item) });
    }
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.postMessage("clear-selection", { content_type: "Tag" });
    }
  }, {
    key: "deleteItem",
    value: function deleteItem(item, callback) {
      this.deleteItems([item], callback);
    }
  }, {
    key: "deleteItems",
    value: function deleteItems(items, callback) {
      var params = {
        items: items.map(function (item) {
          return this.jsonObjectForItem(item);
        }.bind(this))
      };

      this.postMessage("delete-items", params, function (data) {
        callback && callback(data);
      });
    }
  }, {
    key: "sendCustomEvent",
    value: function sendCustomEvent(action, data, callback) {
      this.postMessage(action, data, function (data) {
        callback && callback(data);
      }.bind(this));
    }
  }, {
    key: "saveItem",
    value: function saveItem(item, callback) {
      var skipDebouncer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      this.saveItems([item], callback, skipDebouncer);
    }

    /* Presave allows clients to perform any actions last second before the save actually occurs (like setting previews).
       Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
       hook into the debounce cycle so that clients don't have to implement their own debouncing.
     */

  }, {
    key: "saveItemWithPresave",
    value: function saveItemWithPresave(item, presave, callback) {
      this.saveItemsWithPresave([item], presave, callback);
    }
  }, {
    key: "saveItemsWithPresave",
    value: function saveItemsWithPresave(items, presave, callback) {
      this.saveItems(items, callback, false, presave);
    }

    /*
    skipDebouncer allows saves to go through right away rather than waiting for timeout.
    This should be used when saving items via other means besides keystrokes.
     */

  }, {
    key: "saveItems",
    value: function saveItems(items, callback) {
      var _this3 = this;

      var skipDebouncer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var presave = arguments[3];

      var saveBlock = function saveBlock() {
        // presave block allows client to gain the benefit of performing something in the debounce cycle.
        presave && presave();

        var mappedItems = items.map(function (item) {
          item.updated_at = new Date();
          return this.jsonObjectForItem(item);
        }.bind(_this3));

        _this3.postMessage("save-items", { items: mappedItems }, function (data) {
          callback && callback();
        });
      };

      /*
        Coallesed saving prevents saves from being made after every keystroke, and instead
        waits coallesedSavingDelay before performing action. For example, if a user types a keystroke, and the clienet calls saveItem,
        a 250ms delay will begin. If they type another keystroke within 250ms, the previously pending
        save will be cancelled, and another 250ms delay occurs. If ater 250ms the pending delay is not cleared by a future call,
        the save will finally trigger.
         Note: it's important to modify saving items updated_at immediately and not after delay. If you modify after delay,
        a delayed sync could just be wrapping up, and will send back old data and replace what the user has typed.
      */
      if (this.coallesedSaving == true && !skipDebouncer) {
        if (this.pendingSave) {
          clearTimeout(this.pendingSave);
        }

        this.pendingSave = setTimeout(function () {
          saveBlock();
        }, this.coallesedSavingDelay);
      } else {
        saveBlock();
      }
    }
  }, {
    key: "jsonObjectForItem",
    value: function jsonObjectForItem(item) {
      var copy = Object.assign({}, item);
      copy.children = null;
      copy.parent = null;
      return copy;
    }
  }, {
    key: "getItemAppDataValue",
    value: function getItemAppDataValue(item, key) {
      var AppDomain = "org.standardnotes.sn";
      var data = item.content.appData && item.content.appData[AppDomain];
      if (data) {
        return data[key];
      } else {
        return null;
      }
    }

    /* Themes */

  }, {
    key: "activateThemes",
    value: function activateThemes(incomingUrls) {
      if (this.loggingEnabled) {
        console.log("Incoming themes", incomingUrls);
      }
      if (this.activeThemes.sort().toString() == incomingUrls.sort().toString()) {
        // incoming are same as active, do nothing
        return;
      }

      var themesToActivate = incomingUrls || [];
      var themesToDeactivate = [];

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.activeThemes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var activeUrl = _step2.value;

          if (!incomingUrls.includes(activeUrl)) {
            // active not present in incoming, deactivate it
            themesToDeactivate.push(activeUrl);
          } else {
            // already present in active themes, remove it from themesToActivate
            themesToActivate = themesToActivate.filter(function (candidate) {
              return candidate != activeUrl;
            });
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      if (this.loggingEnabled) {
        console.log("Deactivating themes:", themesToDeactivate);
        console.log("Activating themes:", themesToActivate);
      }

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = themesToDeactivate[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var theme = _step3.value;

          this.deactivateTheme(theme);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      this.activeThemes = incomingUrls;

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = themesToActivate[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var url = _step4.value;

          if (!url) {
            continue;
          }

          var link = document.createElement("link");
          link.id = btoa(url);
          link.href = url;
          link.type = "text/css";
          link.rel = "stylesheet";
          link.media = "screen,print";
          link.className = "custom-theme";
          document.getElementsByTagName("head")[0].appendChild(link);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }
  }, {
    key: "themeElementForUrl",
    value: function themeElementForUrl(url) {
      var elements = Array.from(document.getElementsByClassName("custom-theme")).slice();
      return elements.find(function (element) {
        // We used to search here by `href`, but on desktop, with local file:// urls, that didn't work for some reason.
        return element.id == btoa(url);
      });
    }
  }, {
    key: "deactivateTheme",
    value: function deactivateTheme(url) {
      var element = this.themeElementForUrl(url);
      if (element) {
        element.disabled = true;
        element.parentNode.removeChild(element);
      }
    }

    /* Theme caching is currently disabled. Might be enabled in the future if neccessary. */
    /*
    activateCachedThemes() {
      let themes = this.getCachedThemeUrls();
      let writeToCache = false;
      if(this.loggingEnabled) { console.log("Activating cached themes", themes); }
      this.activateThemes(themes, writeToCache);
    }
     cacheThemeUrls(urls) {
      if(this.loggingEnabled) { console.log("Caching theme urls", urls); }
      localStorage.setItem("cachedThemeUrls", JSON.stringify(urls));
    }
     decacheThemeUrls() {
      localStorage.removeItem("cachedThemeUrls");
    }
     getCachedThemeUrls() {
      let urls = localStorage.getItem("cachedThemeUrls");
      if(urls) {
        return JSON.parse(urls);
      } else {
        return [];
      }
    }
    */

    /* Utilities */

  }, {
    key: "generateUUID",
    value: function generateUUID() {
      var crypto = window.crypto || window.msCrypto;
      if (crypto) {
        var buf = new Uint32Array(4);
        crypto.getRandomValues(buf);
        var idx = -1;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          idx++;
          var r = buf[idx >> 3] >> idx % 8 * 4 & 15;
          var v = c == 'x' ? r : r & 0x3 | 0x8;
          return v.toString(16);
        });
      } else {
        var d = new Date().getTime();
        if (window.performance && typeof window.performance.now === "function") {
          d += performance.now(); //use high-precision timer if available
        }
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
        });
        return uuid;
      }
    }
  }]);

  return ComponentManager;
}();

if (typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = ComponentManager;
}

if (window) {
  window.ComponentManager = ComponentManager;
}

;'use strict';

angular.module('app', []);
var HomeCtrl = function HomeCtrl($rootScope, $scope, $timeout) {
  _classCallCheck2(this, HomeCtrl);

  var smartTagContentType = "SN|SmartTag";

  var componentManager = new window.ComponentManager([], function () {
    // on ready
    $rootScope.platform = componentManager.platform;
  });

  var delimiter = ".";

  $scope.resolveRawTags = function (masterTag) {
    var sortTags = function sortTags(tags) {
      return tags.sort(function (a, b) {
        return (a.content.title > b.content.title) - (a.content.title < b.content.title);
      });
    };
    var resolved = masterTag.rawTags.slice();

    var findResolvedTag = function findResolvedTag(title) {
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = masterTag.rawTags[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var tag = _step5.value;

          if (tag.content.title === title) {
            return tag;
          }
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      return null;
    };

    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
      for (var _iterator6 = masterTag.rawTags[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
        var tag = _step6.value;

        var pendingDummy = tag.children && tag.children.find(function (c) {
          return c.dummy;
        });
        tag.children = [];
        tag.parent = null;

        if (pendingDummy) {
          tag.children.unshift(pendingDummy);
        }
      }
    } catch (err) {
      _didIteratorError6 = true;
      _iteratorError6 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion6 && _iterator6.return) {
          _iterator6.return();
        }
      } finally {
        if (_didIteratorError6) {
          throw _iteratorError6;
        }
      }
    }

    ;

    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
      for (var _iterator7 = masterTag.rawTags[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
        var tag = _step7.value;

        var name = tag.content.title;
        var comps = name.split(delimiter);
        tag.displayTitle = comps[comps.length - 1];
        if (comps.length == 1) {
          tag.parent = masterTag;
          continue;
        }

        var getParent = function getParent() {
          var depth = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

          var parentTitle = comps.slice(0, comps.length - depth).join(delimiter);
          if (parentTitle.length == 0) {
            return null;
          }
          var parent = findResolvedTag(parentTitle);

          // didn't find parent, try again.
          // just make sure we're not deeper in search than we can go
          if (!parent && depth < comps.length - 1) {
            return getParent(depth + 1);
          }

          // remove parent from name and keep this full tag name to display
          var tagTitle = tag.content.title.slice(parentTitle.length + 1);
          tag.displayTitle = tagTitle;

          return parent;
        };

        var parent = getParent();

        // no parent at all up the tree, fall back to root with full name
        if (!parent) {
          tag.displayTitle = tag.content.title;
          tag.parent = masterTag;
          continue;
        }

        parent.children.push(tag);
        parent.children = sortTags(parent.children);
        tag.parent = parent;

        // remove chid from master list
        var index = resolved.indexOf(tag);
        resolved.splice(index, 1);

        if ($scope.selectedTag && $scope.selectedTag.uuid == tag.uuid) {
          $scope.selectedTag = tag;
          $scope.setSelectedForTag(tag, true);
        }
      }
    } catch (err) {
      _didIteratorError7 = true;
      _iteratorError7 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion7 && _iterator7.return) {
          _iterator7.return();
        }
      } finally {
        if (_didIteratorError7) {
          throw _iteratorError7;
        }
      }
    }

    var pendingDummy = masterTag.children && masterTag.children.find(function (c) {
      return c.dummy;
    });
    masterTag.children = sortTags(resolved);
    if (pendingDummy) {
      masterTag.children.unshift(pendingDummy);
    }
  };

  $scope.changeParent = function (sourceId, targetId) {
    var source = $scope.masterTag.rawTags.filter(function (tag) {
      return tag.uuid === sourceId;
    })[0];

    var target = targetId === "0" ? $scope.masterTag : $scope.masterTag.rawTags.filter(function (tag) {
      return tag.uuid === targetId;
    })[0];

    if (target.parent === source) {
      return;
    }

    var needsSave = [source];

    var adjustChildren = function adjustChildren(source) {
      var _iteratorNormalCompletion8 = true;
      var _didIteratorError8 = false;
      var _iteratorError8 = undefined;

      try {
        for (var _iterator8 = source.children[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
          var child = _step8.value;

          var newTitle = source.content.title + delimiter + child.content.title.split(delimiter).slice(-1)[0];
          child.content.title = newTitle;
          needsSave.push(child);
          adjustChildren(child);
        }
      } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion8 && _iterator8.return) {
            _iterator8.return();
          }
        } finally {
          if (_didIteratorError8) {
            throw _iteratorError8;
          }
        }
      }
    };

    var newTitle;
    if (target.master) {
      newTitle = source.content.title.split(delimiter).slice(-1)[0];
    } else {
      newTitle = target.content.title + delimiter + source.content.title.split(delimiter).slice(-1)[0];
    }
    source.content.title = newTitle;
    adjustChildren(source);
    $scope.resolveRawTags($scope.masterTag);

    componentManager.saveItems(needsSave);
  };

  $scope.createTag = function (tag) {
    var title = tag.content.title;
    if (title.startsWith("![")) {
      // Create smart tag
      /*
      !["Untagged", "tags.length", "=", 0]
      !["B-tags", "tags", "includes", ["title", "startsWith", "b"]]
      !["Foo Notes", "title", "startsWith", "Foo"]
      !["Archived", "archived", "=", true]
      !["Pinned", "pinned", "=", true]
      !["Not Pinned", "pinned", "=", false]
      !["Last Day", "updated_at", ">", "1.days.ago"]
      !["Long", "text.length", ">", 500]
      */
      try {
        var components = JSON.parse(title.substring(1, title.length));
      } catch (e) {
        alert("There was an error parsing your smart tag syntax. Please ensure the value after the exclamation mark is valid JSON, and try again.");
        return;
      }
      var smartTag = {
        content_type: smartTagContentType,
        content: {
          title: components[0],
          predicate: {
            keypath: components[1],
            operator: components[2],
            value: components[3]
          }
        }
      };
      componentManager.createItem(smartTag, function (createdTag) {
        // We don't want to select the tag right away because it hasn't been added yet.
        // If you do $scope.selectTag(createdTag), an issue occurs where selecting another tag
        // after that will not dehighlight this one.
        $scope.selectOnLoad = createdTag;
      });
    } else {
      tag.content_type = "Tag";
      var title;
      if (tag.parent.master) {
        title = tag.content.title;
      } else {
        title = tag.parent.content.title + delimiter + tag.content.title;
      }
      tag.content.title = title;
      tag.dummy = false;
      componentManager.createItem(tag, function (createdTag) {
        $scope.selectOnLoad = createdTag;
      });
    }
  };

  $scope.selectTag = function (tag, multiSelect) {
    var isSmartTag = tag.content_type == smartTagContentType;
    // Multi selection for smart tags is not possible.
    if (isSmartTag) {
      multiSelect = false;
    }

    var clearMultipleTagsSelection = function clearMultipleTagsSelection() {
      if ($scope.multipleTags) {
        var _iteratorNormalCompletion9 = true;
        var _didIteratorError9 = false;
        var _iteratorError9 = undefined;

        try {
          for (var _iterator9 = $scope.multipleTags[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var selectedTag = _step9.value;

            $scope.setSelectedForTag(selectedTag, false);
          }
        } catch (err) {
          _didIteratorError9 = true;
          _iteratorError9 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion9 && _iterator9.return) {
              _iterator9.return();
            }
          } finally {
            if (_didIteratorError9) {
              throw _iteratorError9;
            }
          }
        }
      }
    };

    if (tag.master || tag.smartMaster) {
      clearMultipleTagsSelection();
      $scope.multipleTags = [];
      componentManager.clearSelection();
    } else {
      if (!$scope.multipleTags) {
        $scope.multipleTags = [];
      }
      if (!isSmartTag) {
        $scope.multipleTags.push(tag);
      }
      if (multiSelect && $scope.multipleTags.length > 1) {
        var smartTag = $scope.createEphemeralSmartTagForMultiTags();
        componentManager.selectItem(smartTag);
      } else {
        clearMultipleTagsSelection();
        $scope.multipleTags = isSmartTag ? [] : [tag];
        componentManager.selectItem(tag);
      }
    }

    // if multiselect, we don't want to clear selected tag. But if master is selected,
    // and multi select other tag, we do want to clear master. Rather than creating a large if
    // statement, we'll just an if else.

    if (!multiSelect && $scope.selectedTag && $scope.selectedTag != tag) {
      $scope.setSelectedForTag($scope.selectedTag, false);
      $scope.selectedTag.editing = false;
    } else if ($scope.selectedTag.master || $scope.selectedTag.smartMaster || $scope.selectedTag.content_type == smartTagContentType) {
      $scope.setSelectedForTag($scope.selectedTag, false);
    }

    if ($scope.selectedTag === tag && !tag.master) {
      tag.editing = true;
    }

    $scope.selectedTag = tag;
    $scope.setSelectedForTag(tag, true);
  };

  $scope.createEphemeralSmartTagForMultiTags = function () {
    var smartTag = {
      uuid: Math.random(),
      content_type: "SN|SmartTag",
      content: {
        title: "Multiple tags"
      }
    };

    var tagNames = $scope.multipleTags.map(function (tag) {
      return tag.content.title;
    });
    var predicate = ["tags", "includes", ["title", "in", tagNames]];
    smartTag.content.predicate = predicate;
    return smartTag;
  };

  $scope.toggleCollapse = function (tag) {
    tag.clientData.collapsed = !tag.clientData.collapsed;
    if (!tag.master) {
      componentManager.saveItem(tag);
    }
  };

  $scope.saveTags = function (tags) {
    componentManager.saveItems(tags);
  };

  $scope.setSelectedForTag = function (tag, selected) {
    tag.selected = selected;
  };

  componentManager.streamItems(["Tag", smartTagContentType], function (newTags) {
    $timeout(function () {
      var allTags = $scope.masterTag ? $scope.masterTag.rawTags : [];
      var smartTags = $scope.smartMasterTag ? $scope.smartMasterTag.rawTags : [];
      var _iteratorNormalCompletion10 = true;
      var _didIteratorError10 = false;
      var _iteratorError10 = undefined;

      try {
        for (var _iterator10 = newTags[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
          var tag = _step10.value;

          var isSmartTag = tag.content_type == smartTagContentType;
          var arrayToUse = isSmartTag ? smartTags : allTags;

          var existing = arrayToUse.filter(function (tagCandidate) {
            return tagCandidate.uuid === tag.uuid;
          })[0];

          if (existing) {
            Object.assign(existing, tag);
          } else if (tag.content.title) {
            arrayToUse.push(tag);
          }

          if (tag.deleted) {
            var index = arrayToUse.indexOf(existing || tag);
            arrayToUse.splice(index, 1);
          } else {
            if ($scope.selectOnLoad && $scope.selectOnLoad.uuid == tag.uuid) {
              $scope.selectOnLoad = null;
              $scope.selectTag(tag);
            } else if (existing && $scope.selectedTag.uuid == existing.uuid) {
              // Don't call $scope.selectTag(existing) as this will double select a tag, which will enable editing for it.
              $scope.setSelectedForTag(existing, true);
            }
          }
        }
      } catch (err) {
        _didIteratorError10 = true;
        _iteratorError10 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion10 && _iterator10.return) {
            _iterator10.return();
          }
        } finally {
          if (_didIteratorError10) {
            throw _iteratorError10;
          }
        }
      }

      if (!$scope.masterTag) {
        $scope.masterTag = {
          master: true,
          content: {
            title: ""
          },
          displayTitle: "All",
          uuid: "0",
          clientData: {}
        };
      }

      if (!$scope.smartMasterTag) {
        $scope.smartMasterTag = {
          master: true,
          smartMaster: true,
          content: {
            title: ""
          },
          displayTitle: "Views",
          uuid: "1",
          clientData: {}
        };
      }

      $scope.masterTag.rawTags = allTags;
      $scope.smartMasterTag.rawTags = smartTags;

      if (!$scope.selectedTag || $scope.selectedTag && $scope.selectedTag.master) {
        if ($scope.selectedTag && $scope.selectedTag.smartMaster) {
          $scope.selectedTag = $scope.smartMasterTag;
          $scope.setSelectedForTag($scope.masterTag, false);
        } else {
          $scope.selectedTag = $scope.masterTag;
          $scope.setSelectedForTag($scope.smartMasterTag, false);
        }
        $scope.setSelectedForTag($scope.selectedTag, true);
      }

      if ($scope.selectedTag.deleted) {
        $scope.selectTag($scope.masterTag);
      }

      $scope.resolveRawTags($scope.masterTag);
      $scope.resolveRawTags($scope.smartMasterTag);
    });
  });

  $scope.deleteTag = function (tag) {
    var isSmartTag = tag.content_type == smartTagContentType;
    var arrayToUse = isSmartTag ? $scope.smartMasterTag.rawTags : $scope.masterTag.rawTags;

    var tag = arrayToUse.filter(function (tagCandidate) {
      return tagCandidate.uuid === tag.uuid;
    })[0];

    var deleteChain = [];

    function addChildren(tag) {
      deleteChain.push(tag);
      if (tag.children) {
        var _iteratorNormalCompletion11 = true;
        var _didIteratorError11 = false;
        var _iteratorError11 = undefined;

        try {
          for (var _iterator11 = tag.children[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
            var child = _step11.value;

            addChildren(child);
          }
        } catch (err) {
          _didIteratorError11 = true;
          _iteratorError11 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion11 && _iterator11.return) {
              _iterator11.return();
            }
          } finally {
            if (_didIteratorError11) {
              throw _iteratorError11;
            }
          }
        }
      }
    }

    addChildren(tag);

    componentManager.deleteItems(deleteChain);
  };
};

// required for firefox


HomeCtrl.$$ngIsClass = true;

angular.module('app').controller('HomeCtrl', HomeCtrl);
;angular.module('app').directive('mbAutofocus', ['$timeout', function ($timeout) {
  return {
    restrict: 'A',
    scope: {
      shouldFocus: "="
    },
    link: function link($scope, $element) {
      $timeout(function () {
        if ($scope.shouldFocus) {
          $element[0].focus();
        }
      });
    }
  };
}]);
;angular.module('app').directive('draggable', function () {
  return {
    scope: {
      tagId: "=",
      drop: '&',
      isDraggable: "=",
      isDroppable: "="
    },
    link: function link(scope, element, attrs) {
      // 'ngInject';
      var el = element[0];

      el.draggable = scope.isDraggable;

      var counter = 0;

      el.addEventListener('dragstart', function (e) {
        counter = 0;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('TagId', JSON.stringify(scope.tagId));
        this.classList.add('drag');
        return false;
      }, false);

      el.addEventListener('dragend', function (e) {
        this.classList.remove('drag');
        this.classList.remove('over');
        return false;
      }, false);

      el.addEventListener('dragover', function (e) {
        e.dataTransfer.dropEffect = 'move';
        // allows us to drop
        if (e.preventDefault) e.preventDefault();
        if (scope.isDroppable) {
          this.classList.add('over');
        }
        return false;
      }, false);

      el.addEventListener('dragenter', function (e) {
        counter++;
        if (scope.isDroppable) {
          this.classList.add('over');
        }
        return false;
      }, false);

      el.addEventListener('dragleave', function (e) {
        counter--;
        if (counter === 0) {
          this.classList.remove('over');
        }
        return false;
      }, false);

      el.addEventListener('dragexit', function (e) {
        // counter--;
        //  if (counter === 0) {
        this.classList.remove('over');
        //  }
        return false;
      }, false);

      el.addEventListener('drop', function (e) {

        // Stops some browsers from redirecting.
        counter = 0;
        if (e.stopPropagation) e.stopPropagation();

        this.classList.remove('over');

        var targetId = JSON.parse(e.dataTransfer.getData('TagId'));
        if (targetId === scope.tagId) {
          return;
        }
        scope.$apply(function (scope) {
          scope.drop()(targetId, scope.tagId);
        });

        return false;
      }, false);
    }
  };
});
;
var TagTree = function () {
  function TagTree() {
    _classCallCheck2(this, TagTree);

    this.restrict = "C";
    this.templateUrl = "directives/tag_tree.html";
    this.scope = {
      tag: "=",
      changeParent: "&",
      onSelect: "&",
      createTag: "&",
      saveTags: "&",
      deleteTag: "&",
      onToggleCollapse: "&"
    };
  }

  _createClass2(TagTree, [{
    key: "controller",
    value: function controller($scope, $timeout) {
      'ngInject';

      $scope.isDraggable = function () {
        return !$scope.tag.master && $scope.tag.content_type != 'SN|SmartTag';
      };

      $scope.isDroppable = function () {
        return !$scope.tag.smartMaster && $scope.tag.content_type != 'SN|SmartTag';
      };

      $scope.onDrop = function (sourceId, targetId) {
        $scope.changeParent()(sourceId, targetId);
      };

      $scope.onDragOver = function (event) {};

      $scope.onDragStart = function (event) {};

      $scope.selectTag = function (event) {
        var multiSelect = event.ctrlKey || event.metaKey;
        $scope.onSelect()($scope.tag, multiSelect);
      };

      $scope.addChild = function ($event, parent) {
        $event.stopPropagation();
        var addingTag = { dummy: true, parent: parent, content: { title: "" } };
        parent.children.unshift(addingTag);
      };

      $scope.saveNewTag = function (tag) {
        if (tag.content.title && tag.content.title.length > 0) {
          $scope.createTag()(tag);
        }
        tag.parent.children.splice(tag.parent.children.indexOf(tag), 1);
      };

      $scope.removeTag = function (tag) {
        $scope.deleteTag()(tag);
      };

      $scope.innerCollapse = function (tag) {
        if ($scope.onToggleCollapse()) {
          $scope.onToggleCollapse()(tag);
        }
      };

      $scope.saveTagRename = function (tag) {
        if (!tag.displayTitle || tag.displayTitle.length == 0) {
          // Delete
          $scope.deleteTag()(tag);
          return;
        }
        var delimiter = ".";
        var tags = [tag];
        var title;
        if (tag.parent.master) {
          title = tag.displayTitle;
        } else {
          title = tag.parent.content.title + delimiter + tag.displayTitle;
        }

        tag.content.title = title;

        function renameChildren(tag) {
          var _iteratorNormalCompletion12 = true;
          var _didIteratorError12 = false;
          var _iteratorError12 = undefined;

          try {
            for (var _iterator12 = tag.children[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
              var child = _step12.value;

              child.content.title = child.parent.content.title + delimiter + child.displayTitle;
              tags.push(child);
              renameChildren(child);
            }
          } catch (err) {
            _didIteratorError12 = true;
            _iteratorError12 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion12 && _iterator12.return) {
                _iterator12.return();
              }
            } finally {
              if (_didIteratorError12) {
                throw _iteratorError12;
              }
            }
          }
        }

        renameChildren(tag);

        tag.editing = false;

        $scope.saveTags()(tags);
      };

      $scope.generationForTag = function (tag) {
        var generation = 0;
        var parent = tag.parent;
        while (parent) {
          generation++;
          parent = parent.parent;
        }

        return generation;
      };

      $scope.circleClassForTag = function (tag) {
        if (tag.content_type == "SN|SmartTag") {
          return "success";
        }

        // is newly creating tag
        if (!tag.uuid) {
          return "contrast";
        }

        var gen = $scope.generationForTag(tag);
        var circleClass = {
          0: "info",
          1: "info",
          2: "success",
          3: "danger",
          4: "warning"
        }[gen];

        if (!circleClass) {
          circleClass = "neutral";
        }

        // Newly creating tags don't have client data
        if (tag.clientData && tag.clientData.collapsed) {
          circleClass += " no-bg";
        }

        return circleClass;
      };
    }
  }]);

  return TagTree;
}();

TagTree.$$ngIsClass = true;

angular.module('app').directive('tagTree', function () {
  return new TagTree();
});


},{}]},{},[1]);
