// A cross-browser javascript shim for html5 audio
(function(audiojs, audiojsInstance, container) {
  // Use the path to the audio.js file to create relative paths to the player graphics
  // Remember that some systems (e.g. ruby on rails) append strings like '?1301478336' to asset paths
  var path = (function() {
    var re = new RegExp('audio(\.min)?\.js.*'),
        scripts = document.getElementsByTagName('script');
    for (var i = 0, ii = scripts.length; i < ii; i++) {
      var path = scripts[i].getAttribute('src');
      if(re.test(path))
      {
        var f = path.split ( '/' );
        f.pop ();
        return f.join ( '/' ) + '/';
      }
    }
    // when no script found, an empty string causes the least confusion.
    return '';
  })();

  // ##The audiojs interface
  // This is the global object which provides an interface for creating new `audiojs` instances.
  // It also stores all of the construction helper methods and variables.
  container[audiojs] = {
    instanceCount: 0,
    instances: {},

    // ### The main settings object
    // Where all the default settings are stored. Each of these variables and methods can be overwritten by the user-provided `options` object.
    settings: {
      autoplay: false,
      loop: false,
      preload: true,
      imageLocation: path + 'player-graphics.gif',
      retinaImageLocation: path + 'player-graphics@2x.gif',
      playbackRates: [1.0, 1.25, 1.5, 1.75, 2.0],
      // Used to get the duration if preload='none'.
      feedURL: null,
      // The default markup and classes for creating the player:
      createPlayer: {
        markup:
          '<div class="play-pause">' +
          '  <p class="play"></p>' +
          '  <p class="pause"></p>' +
          '  <p class="loading"></p>' +
          '  <p class="error"></p>' +
          '</div>' +
          '<div class="scrubber">' +
          '  <div class="progress"></div>' +
          '  <div class="loaded"></div>' +
          '</div>' +
          '<div class="time">' +
          '  <em class="played">00:00</em>/<strong class="duration">00:00</strong>' +
          '</div>' +
          '<div class="playback-rate">1.0x</div>' +
          '<div class="error-message"></div>',
        playPauseClass: 'play-pause',
        scrubberClass: 'scrubber',
        progressClass: 'progress',
        loaderClass: 'loaded',
        timeClass: 'time',
        durationClass: 'duration',
        playedClass: 'played',
        errorMessageClass: 'error-message',
        playingClass: 'playing',
        loadingClass: 'loading',
        playbackRateClass: 'playback-rate',
        errorClass: 'error'
      },
      // The css used by the default player. This is is dynamically injected into a `<style>` tag in the top of the head.
      css:
        '.audiojs audio { position: absolute; left: -1px; }' +
        '.audiojs { display: flex; height: 36px; background: #404040; overflow: hidden; font-family: monospace; font-size: 12px;' +
        '  background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0, #444), color-stop(0.5, #555), color-stop(0.51, #444), color-stop(1, #444));' +
        '  background-image: -moz-linear-gradient(center top, #444 0%, #555 50%, #444 51%, #444 100%);' +
        '  -webkit-box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); -moz-box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3);' +
        '  -o-box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); }' +
        '.audiojs .play-pause { width: 25px; height: 40px; padding: 4px 6px; margin: 0px; overflow: hidden; border-right: 1px solid #000; }' +
        '.audiojs p { display: none; width: 25px; height: 40px; margin: 0px; cursor: pointer; }' +
        '.audiojs .play { display: block; }' +
        '.audiojs .scrubber { position: relative; flex: 1; background: #5a5a5a; height: 14px; margin: 10px 12px; border-top: 1px solid #3f3f3f; border-left: 0px; border-bottom: 0px; overflow: hidden; }' +
        '.audiojs .progress { position: absolute; top: 0px; left: 0px; height: 14px; width: 0px; background: #ccc; z-index: 1;' +
        '  background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0, #ccc), color-stop(0.5, #ddd), color-stop(0.51, #ccc), color-stop(1, #ccc));' +
        '  background-image: -moz-linear-gradient(center top, #ccc 0%, #ddd 50%, #ccc 51%, #ccc 100%); }' +
        '.audiojs .loaded { position: absolute; top: 0px; left: 0px; height: 14px; width: 0px; background: #000;' +
        '  background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0, #222), color-stop(0.5, #333), color-stop(0.51, #222), color-stop(1, #222));' +
        '  background-image: -moz-linear-gradient(center top, #222 0%, #333 50%, #222 51%, #222 100%); }' +
        '.audiojs .time, .audiojs .playback-rate { height: 36px; line-height: 36px; padding: 0px 12px; border-left: 1px solid #000; color: #ddd; text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5); }' +
        '.audiojs .time em { padding: 0px 2px 0px 0px; color: #f9f9f9; font-style: normal; }' +
        '.audiojs .time strong { padding: 0px 0px 0px 2px; font-weight: normal; }' +
        '.audiojs .playback-rate { cursor: pointer; }' +
        '.audiojs .error-message { flex: 1; display: none; margin: 0px 10px; height: 36px; width: 400px; overflow: hidden; line-height: 36px; white-space: nowrap; color: #fff;' +
        '  text-overflow: ellipsis; -o-text-overflow: ellipsis; -icab-text-overflow: ellipsis; -khtml-text-overflow: ellipsis; -moz-text-overflow: ellipsis; -webkit-text-overflow: ellipsis; }' +
        '.audiojs .error-message a { color: #eee; text-decoration: none; padding-bottom: 1px; border-bottom: 1px solid #999; white-space: wrap; }' +
        '' +
        '.audiojs .play { background: url("$1") -2px -1px no-repeat; }' +
        '.audiojs .loading { background: url("$1") -2px -31px no-repeat; }' +
        '.audiojs .error { background: url("$1") -2px -61px no-repeat; }' +
        '.audiojs .pause { background: url("$1") -2px -91px no-repeat; }' +
        '' +
        '@media only screen and (-webkit-min-device-pixel-ratio: 2),' +
        '  only screen and (min--moz-device-pixel-ratio: 2),' +
        '  only screen and (min-moz-device-pixel-ratio: 2),' +
        '  only screen and (-o-min-device-pixel-ratio: 2/1),' +
        '  only screen and (min-device-pixel-ratio: 2) {' +
        '    .audiojs .play, .audiojs .loading, .audiojs .error, .audiojs .pause {' +
        '      background-image: url("$2");' +
        '      -webkit-background-size: 30px 120px;' +
        '      -moz-background-size: 30px 120px;' +
        '      -o-background-size: 30px 120px;' +
        '      background-size: 30px 120px;' +
        '    }' +
        '}' +
        '' +
        '.playing .play, .playing .loading, .playing .error { display: none; }' +
        '.playing .pause { display: block; }' +
        '' +
        '.loading .play, .loading .pause, .loading .error { display: none; }' +
        '.loading .loading { display: block; }' +
        '' +
        '.error .time, .error .play, .error .pause, .error .scrubber, .error .loading, .error .playback-rate { display: none; }' +
        '.error .error { display: block; }' +
        '.error .play-pause p { cursor: auto; }' +
        '.error .error-message { display: block; }',
      // The default event callbacks:
      trackEnded: function(e) {},
      loadError: function(e) {
        var player = this.settings.createPlayer,
            errorMessage = getByClass(player.errorMessageClass, this.wrapper);
        container[audiojs].helpers.removeClass(this.wrapper, player.loadingClass);
        container[audiojs].helpers.addClass(this.wrapper, player.errorClass);
        errorMessage.innerHTML = 'Error loading: "'+this.mp3+'"';
      },
      init: function() {
        var player = this.settings.createPlayer;
        container[audiojs].helpers.addClass(this.wrapper, player.loadingClass);
      },
      loadStarted: function() {
        var player = this.settings.createPlayer,
            duration = getByClass(player.durationClass, this.wrapper),
            m = Math.floor(this.duration / 60),
            s = Math.floor(this.duration % 60);
        container[audiojs].helpers.removeClass(this.wrapper, player.loadingClass);
        duration.innerHTML = ((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      },
      loadProgress: function(percent) {
        var player = this.settings.createPlayer,
            loaded = getByClass(player.loaderClass, this.wrapper);
        loaded.style.width = Math.round(100 * percent) + '%';
      },
      playPause: function() {
        if (this.playing) this.settings.play();
        else this.settings.pause();
      },
      play: function() {
        var player = this.settings.createPlayer;
        container[audiojs].helpers.removeClass(this.wrapper, player.errorClass);
        container[audiojs].helpers.addClass(this.wrapper, player.playingClass);
      },
      pause: function() {
        var player = this.settings.createPlayer;
        container[audiojs].helpers.removeClass(this.wrapper, player.playingClass);
      },
      updateDuration: function(durationSeconds) {
        this.duration = durationSeconds;
        let player = this.settings.createPlayer,
            duration = getByClass(player.durationClass, this.wrapper),
            m = Math.floor(this.duration / 60),
            s = Math.floor(this.duration % 60);
        duration.innerHTML = ((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      },
      updatePlayhead: function(percent) {
        var player = this.settings.createPlayer,
            progress = getByClass(player.progressClass, this.wrapper);
        progress.style.width = Math.round(100 * percent) + '%';

        var played = getByClass(player.playedClass, this.wrapper),
            p = this.duration * percent,
            m = Math.floor(p / 60),
            s = Math.floor(p % 60);
        played.innerHTML = ((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      },
      updatePlaybackRate: function() {
        var player = this.settings.createPlayer,
            playbackRate = getByClass(player.playbackRateClass, this.wrapper);
        playbackRate.innerHTML = this.playbackRate + 'x';
      }
    },

    // ### Contructor functions

    // `create()`
    // Used to create a single `audiojs` instance.
    // If an array is passed then it calls back to `createAll()`.
    // Otherwise, it creates a single instance and returns it.
    create: function(element, options) {
      var options = options || {}
      if (element.length) {
        return this.createAll(options, element);
      } else {
        return this.newInstance(element, options);
      }
    },

    // `createAll()`
    // Creates multiple `audiojs` instances.
    // If `elements` is `null`, then automatically find any `<audio>` tags on the page and create `audiojs` instances for them.
    createAll: function(options, elements) {
      var audioElements = elements || document.getElementsByTagName('audio'),
          instances = []
          options = options || {};
      for (var i = 0, ii = audioElements.length; i < ii; i++) {

        if ((" " + audioElements[i].parentNode.className + " ").replace(/[\n\t]/g, " ").indexOf(" audiojs ") > -1)
          continue;

        instances.push(this.newInstance(audioElements[i], options));
      }
      if (options.feedURL) {
        this.loadTrackLengthsFromFeed(options.feedURL, instances);
      }
      return instances;
    },

    // ### Creating and returning a new instance
    // This goes through all the steps required to build out a usable `audiojs` instance.
    newInstance: function(element, options) {
      var element = element,
          s = this.helpers.clone(this.settings),
          id = 'audiojs'+this.instanceCount,
          wrapperId = 'audiojs_wrapper'+this.instanceCount,
          instanceCount = this.instanceCount++;

      // Check for `autoplay`, `loop` and `preload` attributes and write them into the settings.
      if (element.getAttribute('autoplay') != null) s.autoplay = true;
      if (element.getAttribute('loop') != null) s.loop = true;
      if (element.getAttribute('preload') == 'none') s.preload = false;
      // Merge the default settings with the user-defined `options`.
      if (options) this.helpers.merge(s, options);

      // Inject the player html if required.
      if (s.createPlayer.markup) element = this.createPlayer(element, s.createPlayer, wrapperId);
      else element.parentNode.setAttribute('id', wrapperId);

      // Return a new `audiojs` instance.
      var audio = new container[audiojsInstance](element, s);

      // If css has been passed in, dynamically inject it into the `<head>`.
      if (s.css) this.helpers.injectCss(audio, s.css);

      // Attach event callbacks to the new audiojs instance.
      this.attachEvents(audio.wrapper, audio);

      // Store the newly-created `audiojs` instance.
      this.instances[id] = audio;
      return audio;
    },

    // ### Helper methods for constructing a working player
    // Inject a wrapping div and the markup for the html player.
    createPlayer: function(element, player, id) {
      var wrapper = document.createElement('div'),
          newElement = element.cloneNode(true);
      wrapper.setAttribute('class', 'audiojs');
      wrapper.setAttribute('className', 'audiojs');
      wrapper.setAttribute('id', id);

      // Fix IE's broken implementation of `innerHTML` & `cloneNode` for HTML5 elements.
      if (newElement.outerHTML && !document.createElement('audio').canPlayType) {
        newElement = this.helpers.cloneHtml5Node(element);
        wrapper.innerHTML = player.markup;
        wrapper.appendChild(newElement);
        element.outerHTML = wrapper.outerHTML;
        wrapper = document.getElementById(id);
      } else {
        wrapper.appendChild(newElement);
        wrapper.innerHTML = wrapper.innerHTML + player.markup;
        element.parentNode.replaceChild(wrapper, element);
      }
      return wrapper.getElementsByTagName('audio')[0];
    },

    // Attaches useful event callbacks to an `audiojs` instance.
    attachEvents: function(wrapper, audio) {
      if (!audio.settings.createPlayer) return;
      var player = audio.settings.createPlayer,
          playPause = getByClass(player.playPauseClass, wrapper),
          scrubber = getByClass(player.scrubberClass, wrapper),
          playbackRate = getByClass(player.playbackRateClass, wrapper);

      container[audiojs].events.addListener(playPause, 'click', function(e) {
        audio.playPause.apply(audio);
      });

      container[audiojs].events.addListener(scrubber, 'click', function(e) {
        var relativeLeft = e.clientX - this.getBoundingClientRect().left;
        audio.skipTo(relativeLeft / scrubber.offsetWidth);
      });

      if (playbackRate) {
        container[audiojs].events.addListener(playbackRate, 'click', function(e) {
          audio.nextPlaybackRate.apply(audio);
        });
      }

      container[audiojs].events.addListener(audio.element, 'timeupdate', function(e) {
        audio.updatePlayhead.apply(audio);
      });

      container[audiojs].events.addListener(audio.element, 'ended', function(e) {
        audio.trackEnded.apply(audio);
      });

      container[audiojs].events.addListener(audio.element, 'progress', function(e) {
        audio.loadProgress.apply(audio);
      });

      container[audiojs].events.addListener(audio.source, 'error', function(e) {
        // on error, cancel any timers that are running.
        clearInterval(audio.readyTimer);
        audio.settings.loadError.apply(audio);
      });

      // Start tracking the load progress of the track.
      container[audiojs].events.trackLoadProgress(audio);
    },

    loadTrackLengthsFromFeed: function(feedURL, audiojsInstances) {
      fetch(feedURL).then(function(response) {
        response.text().then(function(feedText) {
          let domparser = new DOMParser();
          let doc = domparser.parseFromString(feedText, 'text/xml');
          for (let instance of audiojsInstances) {
            if (instance.settings.preload) {
              continue;
            }
            let xpathResult = document.evaluate(`//item[enclosure[@url="${instance.mp3}"]]`, doc, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null)
            let item = xpathResult.singleNodeValue;
            if (!item) {
              continue;
            }
            let durationTag = item.getElementsByTagName('itunes:duration');
            if (!durationTag || durationTag.length != 1) {
              continue;
            }
            let durationText = durationTag[0].textContent;
            let durationSeconds = durationText.split(':')
                .map(token => parseInt(token, 10))
                .reduce((previous, current) => previous * 60 + current, 0);
            instance.settings.updateDuration.apply(instance, [durationSeconds]);
          }
        });
      })
    },

    // ## Helper functions
    helpers: {
      // **Merge two objects, with `obj2` overwriting `obj1`**
      // The merge is shallow, but that's all that is required for our purposes.
      merge: function(obj1, obj2) {
        for (attr in obj2) {
          if (obj1.hasOwnProperty(attr) || obj2.hasOwnProperty(attr)) {
            obj1[attr] = obj2[attr];
          }
        }
      },
      // **Clone a javascript object (recursively)**
      clone: function(obj){
        // Consider replacing with a shallow copy since we only do a shallow
        // merge anyway.
        function _clone(obj) {
          if (obj == null || typeof(obj) !== 'object') return obj;
          var temp = new obj.constructor();
          for (var key in obj) temp[key] = _clone(obj[key]);
          return temp;
        }
        return _clone(obj);
      },
      // **Adding/removing classnames from elements**
      addClass: function(element, className) {
        var re = new RegExp('(\\s|^)'+className+'(\\s|$)');
        if (re.test(element.className)) return;
        element.className += ' ' + className;
      },
      removeClass: function(element, className) {
        var re = new RegExp('(\\s|^)'+className+'(\\s|$)');
        element.className = element.className.replace(re,' ');
      },
      // **Dynamic CSS injection**
      // Takes a string of css, inserts it into a `<style>`, then injects it in at the very top of the `<head>`. This ensures any user-defined styles will take precedence.
      injectCss: function(audio, string) {

        // If an `audiojs` `<style>` tag already exists, then append to it rather than creating a whole new `<style>`.
        var prepend = '',
            styles = document.getElementsByTagName('style'),
            css = string.replace(/\$1/g, audio.settings.imageLocation);
            css = css.replace(/\$2/g, audio.settings.retinaImageLocation);

        for (var i = 0, ii = styles.length; i < ii; i++) {
          var title = styles[i].getAttribute('title');
          if (title && ~title.indexOf('audiojs')) {
            style = styles[i];
            if (style.innerHTML === css) return;
            prepend = style.innerHTML;
            break;
          }
        };

        var head = document.getElementsByTagName('head')[0],
            firstchild = head.firstChild,
            style = document.createElement('style');

        if (!head) return;

        style.setAttribute('type', 'text/css');
        style.setAttribute('title', 'audiojs');

        if (style.styleSheet) style.styleSheet.cssText = prepend + css;
        else style.appendChild(document.createTextNode(prepend + css));

        if (firstchild) head.insertBefore(style, firstchild);
        else head.appendChild(style);
      },
      // **Handle all the IE6+7 requirements for cloning `<audio>` nodes**
      // Create a html5-safe document fragment by injecting an `<audio>` element into the document fragment.
      cloneHtml5Node: function(audioTag) {
        var fragment = document.createDocumentFragment(),
            doc = fragment.createElement ? fragment : document;
        doc.createElement('audio');
        var div = doc.createElement('div');
        fragment.appendChild(div);
        div.innerHTML = audioTag.outerHTML;
        return div.firstChild;
      }
    },
    // ## Event-handling
    events: {
      memoryLeaking: false,
      listeners: [],
      // **A simple cross-browser event handler abstraction**
      addListener: function(element, eventName, func) {
        // For modern browsers use the standard DOM-compliant `addEventListener`.
        if (element.addEventListener) {
          element.addEventListener(eventName, func, false);
          // For older versions of Internet Explorer, use `attachEvent`.
          // Also provide a fix for scoping `this` to the calling element and register each listener so the containing elements can be purged on page unload.
        } else if (element.attachEvent) {
          this.listeners.push(element);
          if (!this.memoryLeaking) {
            window.attachEvent('onunload', function() {
              if(this.listeners) {
                for (var i = 0, ii = this.listeners.length; i < ii; i++) {
                  container[audiojs].events.purge(this.listeners[i]);
                }
              }
            });
            this.memoryLeaking = true;
          }
          element.attachEvent('on' + eventName, function() {
            func.call(element, window.event);
          });
        }
      },

      trackLoadProgress: function(audio) {
        // If `preload` has been set to `none`, then we don't want to start loading the track yet.
        if (!audio.settings.preload) return;
        var readyTimer,
            audio = audio,
            ios = (/(ipod|iphone|ipad)/i).test(navigator.userAgent);

        // Use timers here rather than the official `progress` event, as Chrome has issues calling `progress` when loading mp3 files from cache.
        readyTimer = setInterval(function() {
          if (audio.element.readyState > -1) {
            // iOS doesn't start preloading the mp3 until the user interacts manually, so this stops the loader being displayed prematurely.
            if (!ios) audio.init.apply(audio);
          }
          if (audio.element.readyState > 1) {
            if (audio.settings.autoplay) audio.play.apply(audio);
            clearInterval(readyTimer);
            audio.loadProgress.apply(audio);
          }
        }, 200);
        audio.readyTimer = readyTimer;
      },

      // **Douglas Crockford's IE6 memory leak fix**
      // <http://javascript.crockford.com/memory/leak.html>
      // This is used to release the memory leak created by the circular references created when fixing `this` scoping for IE. It is called on page unload.
      purge: function(d) {
        var a = d.attributes, i;
        if (a) {
          for (i = 0; i < a.length; i += 1) {
            if (typeof d[a[i].name] === 'function') d[a[i].name] = null;
          }
        }
        a = d.childNodes;
        if (a) {
          for (i = 0; i < a.length; i += 1) purge(d.childNodes[i]);
        }
      },

      // **DOMready function**
      // As seen here: <https://github.com/dperini/ContentLoaded/>.
      ready: (function() { return function(fn) {
        var win = window, done = false, top = true,
        doc = win.document, root = doc.documentElement,
        add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
        rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
        pre = doc.addEventListener ? '' : 'on',
        init = function(e) {
          if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
          (e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
          if (!done && (done = true)) fn.call(win, e.type || e);
        },
        poll = function() {
          try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
          init('poll');
        };
        if (doc.readyState == 'complete') fn.call(win, 'lazy');
        else {
          if (doc.createEventObject && root.doScroll) {
            try { top = !win.frameElement; } catch(e) { }
            if (top) poll();
          }
          doc[add](pre + 'DOMContentLoaded', init, false);
          doc[add](pre + 'readystatechange', init, false);
          win[add](pre + 'load', init, false);
        }
      }
      })()

    }
  }

  // ## The audiojs class
  // We create one of these per `<audio>` and then push them into `audiojs['instances']`.
  container[audiojsInstance] = function(element, settings) {
    // Each audio instance returns an object which contains an API back into the `<audio>` element.
    this.element = element;
    this.wrapper = element.parentNode;
    this.source = element.getElementsByTagName('source')[0] || element;
    // First check the `<audio>` element directly for a src and if one is not found, look for a `<source>` element.
    this.mp3 = (function(element) {
      var source = element.getElementsByTagName('source')[0];
      return element.getAttribute('src') || (source ? source.getAttribute('src') : null);
    })(element);
    this.settings = settings;
    this.loadStartedCalled = false;
    this.loadedPercent = 0;
    this.duration = 1;
    this.playing = false;
    this.playbackRate = 1.0;
  }

  container[audiojsInstance].prototype = {
    // API access events:
    // Each of these do what they need do and then call the matching methods defined in the settings object.
    updatePlayhead: function() {
      var percent = this.element.currentTime / this.duration;
      this.settings.updatePlayhead.apply(this, [percent]);
    },
    skipTo: function(percent) {
      if (this.element.readyState >= HTMLMediaElement.HAVE_METADATA) {
        this.element.currentTime = this.duration * percent;
        this.updatePlayhead();
      }
    },
    load: function(mp3) {
      this.loadStartedCalled = false;
      this.playbackRate = 1.0;
      this.source.setAttribute('src', mp3);
      // The now outdated `load()` method is required for Safari 4
      this.element.load();
      this.mp3 = mp3;
      container[audiojs].events.trackLoadProgress(this);
      this.settings.updatePlaybackRate.apply(this);
    },
    loadError: function() {
      this.settings.loadError.apply(this);
    },
    init: function() {
      this.settings.init.apply(this);
    },
    loadStarted: function() {
      // Wait until `element.duration` exists before setting up the audio player.
      if (!this.element.duration) return false;

      this.duration = this.element.duration;
      this.updatePlayhead();
      this.settings.loadStarted.apply(this);
    },
    loadProgress: function() {
      if (this.element.buffered != null && this.element.buffered.length) {
        // Ensure `loadStarted()` is only called once.
        if (!this.loadStartedCalled) {
          this.loadStartedCalled = this.loadStarted();
        }
        var durationLoaded = this.element.buffered.end(this.element.buffered.length - 1);
        this.loadedPercent = durationLoaded / this.duration;

        this.settings.loadProgress.apply(this, [this.loadedPercent]);
      }
    },
    playPause: function() {
      if (this.playing) this.pause();
      else this.play();
    },
    play: function() {
      var ios = (/(ipod|iphone|ipad)/i).test(navigator.userAgent);
      // On iOS this interaction will trigger loading the mp3, so run `init()`.
      if (ios && this.element.readyState == 0) this.init.apply(this);
      // If the audio hasn't started preloading, then start it now.
      // Then set `preload` to `true`, so that any tracks loaded in subsequently are loaded straight away.
      if (!this.settings.preload) {
        this.settings.preload = true;
        this.element.setAttribute('preload', 'auto');
        container[audiojs].events.trackLoadProgress(this);
      }
      this.element.play().then(() => {
        this.playing = true;
        this.settings.play.apply(this);
      }).catch((error) => {
        console.log('Error trying to play audio', error);
        this.settings.pause.apply(this);
      });
    },
    pause: function() {
      this.playing = false;
      this.element.pause();
      this.settings.pause.apply(this);
    },
    nextPlaybackRate: function() {
      let idx = (this.settings.playbackRates.indexOf(this.playbackRate) + 1) % this.settings.playbackRates.length;
      this.playbackRate = this.settings.playbackRates[idx];
      this.element.playbackRate = this.playbackRate;
      this.settings.updatePlaybackRate.apply(this);
    },
    setVolume: function(v) {
      this.element.volume = v;
    },
    trackEnded: function(e) {
      this.skipTo.apply(this, [0]);
      if (!this.settings.loop) this.pause.apply(this);
      this.settings.trackEnded.apply(this);
    }
  }

  // **getElementsByClassName**
  // Having to rely on `getElementsByTagName` is pretty inflexible internally, so a modified version of Dustin Diaz's `getElementsByClassName` has been included.
  // This version cleans things up and prefers the native DOM method if it's available.
  var getByClass = function(searchClass, node) {
    var matches = [];
    node = node || document;

    if (node.getElementsByClassName) {
      matches = node.getElementsByClassName(searchClass);
    } else {
      var i, l,
          els = node.getElementsByTagName("*"),
          pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");

      for (i = 0, l = els.length; i < l; i++) {
        if (pattern.test(els[i].className)) {
          matches.push(els[i]);
        }
      }
    }
    return matches.length > 1 ? matches : matches[0];
  };
// The global variable names are passed in here and can be changed if they conflict with anything else.
})('audiojs', 'audiojsInstance', this);
