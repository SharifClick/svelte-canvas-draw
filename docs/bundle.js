
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var Point_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Point =
    /**
     *
     * @param {number} x
     * @param {number} y
     */
    function Point(x, y) {
      _classCallCheck(this, Point);

      this.x = x;
      this.y = y;
    };

    exports.default = Point;
    });

    unwrapExports(Point_1);

    var LazyPoint_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



    var _Point3 = _interopRequireDefault(Point_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var LazyPoint = function (_Point) {
      _inherits(LazyPoint, _Point);

      function LazyPoint() {
        _classCallCheck(this, LazyPoint);

        return _possibleConstructorReturn(this, (LazyPoint.__proto__ || Object.getPrototypeOf(LazyPoint)).apply(this, arguments));
      }

      _createClass(LazyPoint, [{
        key: 'update',

        /**
         * Update the x and y values
         *
         * @param {Point} point
         */
        value: function update(point) {
          this.x = point.x;
          this.y = point.y;
        }

        /**
         * Move the point to another position using an angle and distance
         *
         * @param {number} angle The angle in radians
         * @param {number} distance How much the point should be moved
         */

      }, {
        key: 'moveByAngle',
        value: function moveByAngle(angle, distance) {
          // Rotate the angle based on the browser coordinate system ([0,0] in the top left)
          var angleRotated = angle + Math.PI / 2;

          this.x = this.x + Math.sin(angleRotated) * distance, this.y = this.y - Math.cos(angleRotated) * distance;
        }

        /**
         * Check if this point is the same as another point
         *
         * @param {Point} point
         * @returns {boolean}
         */

      }, {
        key: 'equalsTo',
        value: function equalsTo(point) {
          return this.x === point.x && this.y === point.y;
        }

        /**
         * Get the difference for x and y axis to another point
         *
         * @param {Point} point
         * @returns {Point}
         */

      }, {
        key: 'getDifferenceTo',
        value: function getDifferenceTo(point) {
          return new _Point3.default(this.x - point.x, this.y - point.y);
        }

        /**
         * Calculate distance to another point
         *
         * @param {Point} point
         * @returns {Point}
         */

      }, {
        key: 'getDistanceTo',
        value: function getDistanceTo(point) {
          var diff = this.getDifferenceTo(point);

          return Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
        }

        /**
         * Calculate the angle to another point
         *
         * @param {Point} point
         * @returns {Point}
         */

      }, {
        key: 'getAngleTo',
        value: function getAngleTo(point) {
          var diff = this.getDifferenceTo(point);

          return Math.atan2(diff.y, diff.x);
        }

        /**
         * Return a simple object with x and y properties
         *
         * @returns {object}
         */

      }, {
        key: 'toObject',
        value: function toObject() {
          return {
            x: this.x,
            y: this.y
          };
        }
      }]);

      return LazyPoint;
    }(_Point3.default);

    exports.default = LazyPoint;
    });

    unwrapExports(LazyPoint_1);

    var LazyBrush_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



    var _LazyPoint2 = _interopRequireDefault(LazyPoint_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var RADIUS_DEFAULT = 30;

    var LazyBrush = function () {
      /**
       * constructor
       *
       * @param {object} settings
       * @param {number} settings.radius The radius for the lazy area
       * @param {boolean} settings.enabled
       */
      function LazyBrush() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$radius = _ref.radius,
            radius = _ref$radius === undefined ? RADIUS_DEFAULT : _ref$radius,
            _ref$enabled = _ref.enabled,
            enabled = _ref$enabled === undefined ? true : _ref$enabled,
            _ref$initialPoint = _ref.initialPoint,
            initialPoint = _ref$initialPoint === undefined ? { x: 0, y: 0 } : _ref$initialPoint;

        _classCallCheck(this, LazyBrush);

        this.radius = radius;
        this._isEnabled = enabled;

        this.pointer = new _LazyPoint2.default(initialPoint.x, initialPoint.y);
        this.brush = new _LazyPoint2.default(initialPoint.x, initialPoint.y);

        this.angle = 0;
        this.distance = 0;
        this._hasMoved = false;
      }

      /**
       * Enable lazy brush calculations.
       *
       */


      _createClass(LazyBrush, [{
        key: 'enable',
        value: function enable() {
          this._isEnabled = true;
        }

        /**
         * Disable lazy brush calculations.
         *
         */

      }, {
        key: 'disable',
        value: function disable() {
          this._isEnabled = false;
        }

        /**
         * @returns {boolean}
         */

      }, {
        key: 'isEnabled',
        value: function isEnabled() {
          return this._isEnabled;
        }

        /**
         * Update the radius
         *
         * @param {number} radius
         */

      }, {
        key: 'setRadius',
        value: function setRadius(radius) {
          this.radius = radius;
        }

        /**
         * Return the current radius
         *
         * @returns {number}
         */

      }, {
        key: 'getRadius',
        value: function getRadius() {
          return this.radius;
        }

        /**
         * Return the brush coordinates as a simple object
         *
         * @returns {object}
         */

      }, {
        key: 'getBrushCoordinates',
        value: function getBrushCoordinates() {
          return this.brush.toObject();
        }

        /**
         * Return the pointer coordinates as a simple object
         *
         * @returns {object}
         */

      }, {
        key: 'getPointerCoordinates',
        value: function getPointerCoordinates() {
          return this.pointer.toObject();
        }

        /**
         * Return the brush as a LazyPoint
         *
         * @returns {LazyPoint}
         */

      }, {
        key: 'getBrush',
        value: function getBrush() {
          return this.brush;
        }

        /**
         * Return the pointer as a LazyPoint
         *
         * @returns {LazyPoint}
         */

      }, {
        key: 'getPointer',
        value: function getPointer() {
          return this.pointer;
        }

        /**
         * Return the angle between pointer and brush
         *
         * @returns {number} Angle in radians
         */

      }, {
        key: 'getAngle',
        value: function getAngle() {
          return this.angle;
        }

        /**
         * Return the distance between pointer and brush
         *
         * @returns {number} Distance in pixels
         */

      }, {
        key: 'getDistance',
        value: function getDistance() {
          return this.distance;
        }

        /**
         * Return if the previous update has moved the brush.
         *
         * @returns {boolean} Whether the brush moved previously.
         */

      }, {
        key: 'brushHasMoved',
        value: function brushHasMoved() {
          return this._hasMoved;
        }

        /**
         * Updates the pointer point and calculates the new brush point.
         *
         * @param {Point} newPointerPoint
         * @param {Object} options
         * @param {Boolean} options.both Force update pointer and brush
         * @returns {Boolean} Whether any of the two points changed
         */

      }, {
        key: 'update',
        value: function update(newPointerPoint) {
          var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
              _ref2$both = _ref2.both,
              both = _ref2$both === undefined ? false : _ref2$both;

          this._hasMoved = false;
          if (this.pointer.equalsTo(newPointerPoint) && !both) {
            return false;
          }

          this.pointer.update(newPointerPoint);

          if (both) {
            this._hasMoved = true;
            this.brush.update(newPointerPoint);
            return true;
          }

          if (this._isEnabled) {
            this.distance = this.pointer.getDistanceTo(this.brush);
            this.angle = this.pointer.getAngleTo(this.brush);

            if (this.distance > this.radius) {
              this.brush.moveByAngle(this.angle, this.distance - this.radius);
              this._hasMoved = true;
            }
          } else {
            this.distance = 0;
            this.angle = 0;
            this.brush.update(newPointerPoint);
            this._hasMoved = true;
          }

          return true;
        }
      }]);

      return LazyBrush;
    }();

    exports.default = LazyBrush;
    });

    unwrapExports(LazyBrush_1);

    var lib = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.LazyPoint = exports.Point = exports.LazyBrush = undefined;



    var _LazyBrush2 = _interopRequireDefault(LazyBrush_1);



    var _Point2 = _interopRequireDefault(Point_1);



    var _LazyPoint2 = _interopRequireDefault(LazyPoint_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.LazyBrush = _LazyBrush2.default;
    exports.Point = _Point2.default;
    exports.LazyPoint = _LazyPoint2.default;
    });

    unwrapExports(lib);
    var lib_1 = lib.LazyPoint;
    var lib_2 = lib.Point;
    var lib_3 = lib.LazyBrush;

    var Point_1$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Point = function () {
      /**
       *
       * @param {number} x
       * @param {number} y
       */
      function Point(x, y) {
        _classCallCheck(this, Point);

        this.x = x;
        this.y = y;
      }

      /**
       * Update the x and y values
       *
       * @param {Point} point
       */


      _createClass(Point, [{
        key: "update",
        value: function update(point) {
          this.x = point.x;
          this.y = point.y;
        }

        /**
         * Get the difference for x and y axis to another point
         *
         * @param {Point} point
         * @returns {Point}
         */

      }, {
        key: "getDifferenceTo",
        value: function getDifferenceTo(point) {
          return new Point(this.x - point.x, this.y - point.y);
        }

        /**
         * Calculate distance to another point
         *
         * @param {Point} point
         * @returns {Point}
         */

      }, {
        key: "getDistanceTo",
        value: function getDistanceTo(point) {
          var diff = this.getDifferenceTo(point);

          return Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
        }
      }]);

      return Point;
    }();

    exports.default = Point;
    });

    unwrapExports(Point_1$1);

    var Catenary_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Given two points and a length, calculate and draw the catenary.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * JavaScript implementation:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Copyright (c) 2018 Jan Hug <me@dulnan.net>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Released under the MIT license.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * ----------------------------------------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Original ActionScript implementation:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Copyright poiasd ( http://wonderfl.net/user/poiasd )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * MIT License ( http://www.opensource.org/licenses/mit-license.php )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Downloaded from: http://wonderfl.net/c/8Bnl
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * ----------------------------------------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Archived by and downloaded from:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * http://wa.zozuar.org/code.php?c=8Bnl
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          */




    var _Point2 = _interopRequireDefault(Point_1$1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var EPSILON = 1e-6;

    var Catenary = function () {
      /**
       * constructor
       *
       * @param {Object} settings
       * @param {Number} settings.segments Number of segments of the chain.
       * @param {Number} settings.iterationLimit Maximum amount iterations for getting catenary parameters.
       */
      function Catenary() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$segments = _ref.segments,
            segments = _ref$segments === undefined ? 50 : _ref$segments,
            _ref$iterationLimit = _ref.iterationLimit,
            iterationLimit = _ref$iterationLimit === undefined ? 100 : _ref$iterationLimit;

        _classCallCheck(this, Catenary);

        this.p1 = new _Point2.default();
        this.p2 = new _Point2.default();

        this.segments = segments;
        this.iterationLimit = iterationLimit;
      }

      /**
       * Draws a catenary given two coordinates, a length and a context.
       * 
       * @param {CanvasRenderingContext2D} context The canvas context to draw the catenary on to.
       * @param {Point} p1 First point
       * @param {Point} p2 Second point
       * @param {Number} chainLength The length of the catenary
       */


      _createClass(Catenary, [{
        key: 'drawToCanvas',
        value: function drawToCanvas(context, point1, point2, chainLength) {
          this.p1.update(point1);
          this.p2.update(point2);

          var isFlipped = this.p1.x > this.p2.x;

          var p1 = isFlipped ? this.p2 : this.p1;
          var p2 = isFlipped ? this.p1 : this.p2;

          var distance = p1.getDistanceTo(p2);

          var curveData = [];
          var isStraight = true;

          // Prevent "expensive" catenary calculations if it would only result
          // in a straight line.
          if (distance < chainLength) {
            var diff = p2.x - p1.x;

            // If the distance on the x axis of both points is too small, don't
            // calculate a catenary.
            if (diff > 0.01) {
              var h = p2.x - p1.x;
              var v = p2.y - p1.y;
              var a = -this.getCatenaryParameter(h, v, chainLength, this.iterationLimit);
              var x = (a * Math.log((chainLength + v) / (chainLength - v)) - h) * 0.5;
              var y = a * Math.cosh(x / a);
              var offsetX = p1.x - x;
              var offsetY = p1.y - y;
              curveData = this.getCurve(a, p1, p2, offsetX, offsetY, this.segments);
              isStraight = false;
            } else {
              var mx = (p1.x + p2.x) * 0.5;
              var my = (p1.y + p2.y + chainLength) * 0.5;

              curveData = [[p1.x, p1.y], [mx, my], [p2.x, p2.y]];
            }
          } else {
            curveData = [[p1.x, p1.y], [p2.x, p2.y]];
          }

          if (isStraight) {
            this.drawLine(curveData, context);
          } else {
            this.drawCurve(curveData, context);
          }

          return curveData;
        }

        /**
         * Determines catenary parameter.
         * 
         * @param {Number} h Horizontal distance of both points.
         * @param {Number} v Vertical distance of both points.
         * @param {Number} length The catenary length.
         * @param {Number} limit Maximum amount of iterations to find parameter.
         */

      }, {
        key: 'getCatenaryParameter',
        value: function getCatenaryParameter(h, v, length, limit) {
          var m = Math.sqrt(length * length - v * v) / h;
          var x = Math.acosh(m) + 1;
          var prevx = -1;
          var count = 0;

          while (Math.abs(x - prevx) > EPSILON && count < limit) {
            prevx = x;
            x = x - (Math.sinh(x) - m * x) / (Math.cosh(x) - m);
            count++;
          }

          return h / (2 * x);
        }

        /**
         * Calculate the catenary curve.
         * Increasing the segments value will produce a catenary closer
         * to reality, but will require more calcluations.
         * 
         * @param {Number} a The catenary parameter.
         * @param {Point} p1 First point
         * @param {Point} p2 Second point
         * @param {Number} offsetX The calculated offset on the x axis.
         * @param {Number} offsetY The calculated offset on the y axis.
         * @param {Number} segments How many "parts" the chain should be made of.
         */

      }, {
        key: 'getCurve',
        value: function getCurve(a, p1, p2, offsetX, offsetY, segments) {
          var data = [p1.x, a * Math.cosh((p1.x - offsetX) / a) + offsetY];

          var d = p2.x - p1.x;
          var length = segments - 1;

          for (var i = 0; i < length; i++) {
            var x = p1.x + d * (i + 0.5) / length;
            var y = a * Math.cosh((x - offsetX) / a) + offsetY;
            data.push(x, y);
          }

          data.push(p2.x, a * Math.cosh((p2.x - offsetX) / a) + offsetY);

          return data;
        }

        /**
         * Draws a straight line between two points.
         *
         * @param {Array} data Even indices are x, odd are y.
         * @param {CanvasRenderingContext2D} context The context to draw to.
         */

      }, {
        key: 'drawLine',
        value: function drawLine(data, context) {
          context.moveTo(data[0][0], data[0][1]);

          context.lineTo(data[1][0], data[1][1]);
        }

        /**
         * Draws a quadratic curve between every calculated catenary segment,
         * so that the segments don't look like straight lines.
         *
         * @param {Array} data Even indices are x, odd are y.
         * @param {CanvasRenderingContext2D} context The context to draw to.
         * 
         * @returns {Array} The original segment coordinates.
         */

      }, {
        key: 'drawCurve',
        value: function drawCurve(data, context) {
          var length = data.length * 0.5 - 1;
          var ox = data[2];
          var oy = data[3];

          var temp = [];

          context.moveTo(data[0], data[1]);

          for (var i = 2; i < length; i++) {
            var x = data[i * 2];
            var y = data[i * 2 + 1];
            var mx = (x + ox) * 0.5;
            var my = (y + oy) * 0.5;
            temp.push([ox, oy, mx, my]);
            context.quadraticCurveTo(ox, oy, mx, my);
            ox = x;
            oy = y;
          }

          length = data.length;
          context.quadraticCurveTo(data[length - 4], data[length - 3], data[length - 2], data[length - 1]);

          return temp;
        }
      }]);

      return Catenary;
    }();

    exports.default = Catenary;
    });

    unwrapExports(Catenary_1);

    var lib$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.Point = exports.Catenary = undefined;



    var _Catenary2 = _interopRequireDefault(Catenary_1);



    var _Point2 = _interopRequireDefault(Point_1$1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.Catenary = _Catenary2.default;
    exports.Point = _Point2.default;
    });

    unwrapExports(lib$1);
    var lib_1$1 = lib$1.Point;
    var lib_2$1 = lib$1.Catenary;

    /**
     * A collection of shims that provide minimal functionality of the ES6 collections.
     *
     * These implementations are not meant to be used outside of the ResizeObserver
     * modules as they cover only a limited range of use cases.
     */
    /* eslint-disable require-jsdoc, valid-jsdoc */
    var MapShim = (function () {
        if (typeof Map !== 'undefined') {
            return Map;
        }
        /**
         * Returns index in provided array that matches the specified key.
         *
         * @param {Array<Array>} arr
         * @param {*} key
         * @returns {number}
         */
        function getIndex(arr, key) {
            var result = -1;
            arr.some(function (entry, index) {
                if (entry[0] === key) {
                    result = index;
                    return true;
                }
                return false;
            });
            return result;
        }
        return /** @class */ (function () {
            function class_1() {
                this.__entries__ = [];
            }
            Object.defineProperty(class_1.prototype, "size", {
                /**
                 * @returns {boolean}
                 */
                get: function () {
                    return this.__entries__.length;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {*} key
             * @returns {*}
             */
            class_1.prototype.get = function (key) {
                var index = getIndex(this.__entries__, key);
                var entry = this.__entries__[index];
                return entry && entry[1];
            };
            /**
             * @param {*} key
             * @param {*} value
             * @returns {void}
             */
            class_1.prototype.set = function (key, value) {
                var index = getIndex(this.__entries__, key);
                if (~index) {
                    this.__entries__[index][1] = value;
                }
                else {
                    this.__entries__.push([key, value]);
                }
            };
            /**
             * @param {*} key
             * @returns {void}
             */
            class_1.prototype.delete = function (key) {
                var entries = this.__entries__;
                var index = getIndex(entries, key);
                if (~index) {
                    entries.splice(index, 1);
                }
            };
            /**
             * @param {*} key
             * @returns {void}
             */
            class_1.prototype.has = function (key) {
                return !!~getIndex(this.__entries__, key);
            };
            /**
             * @returns {void}
             */
            class_1.prototype.clear = function () {
                this.__entries__.splice(0);
            };
            /**
             * @param {Function} callback
             * @param {*} [ctx=null]
             * @returns {void}
             */
            class_1.prototype.forEach = function (callback, ctx) {
                if (ctx === void 0) { ctx = null; }
                for (var _i = 0, _a = this.__entries__; _i < _a.length; _i++) {
                    var entry = _a[_i];
                    callback.call(ctx, entry[1], entry[0]);
                }
            };
            return class_1;
        }());
    })();

    /**
     * Detects whether window and document objects are available in current environment.
     */
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && window.document === document;

    // Returns global object of a current environment.
    var global$1 = (function () {
        if (typeof global !== 'undefined' && global.Math === Math) {
            return global;
        }
        if (typeof self !== 'undefined' && self.Math === Math) {
            return self;
        }
        if (typeof window !== 'undefined' && window.Math === Math) {
            return window;
        }
        // eslint-disable-next-line no-new-func
        return Function('return this')();
    })();

    /**
     * A shim for the requestAnimationFrame which falls back to the setTimeout if
     * first one is not supported.
     *
     * @returns {number} Requests' identifier.
     */
    var requestAnimationFrame$1 = (function () {
        if (typeof requestAnimationFrame === 'function') {
            // It's required to use a bounded function because IE sometimes throws
            // an "Invalid calling object" error if rAF is invoked without the global
            // object on the left hand side.
            return requestAnimationFrame.bind(global$1);
        }
        return function (callback) { return setTimeout(function () { return callback(Date.now()); }, 1000 / 60); };
    })();

    // Defines minimum timeout before adding a trailing call.
    var trailingTimeout = 2;
    /**
     * Creates a wrapper function which ensures that provided callback will be
     * invoked only once during the specified delay period.
     *
     * @param {Function} callback - Function to be invoked after the delay period.
     * @param {number} delay - Delay after which to invoke callback.
     * @returns {Function}
     */
    function throttle (callback, delay) {
        var leadingCall = false, trailingCall = false, lastCallTime = 0;
        /**
         * Invokes the original callback function and schedules new invocation if
         * the "proxy" was called during current request.
         *
         * @returns {void}
         */
        function resolvePending() {
            if (leadingCall) {
                leadingCall = false;
                callback();
            }
            if (trailingCall) {
                proxy();
            }
        }
        /**
         * Callback invoked after the specified delay. It will further postpone
         * invocation of the original function delegating it to the
         * requestAnimationFrame.
         *
         * @returns {void}
         */
        function timeoutCallback() {
            requestAnimationFrame$1(resolvePending);
        }
        /**
         * Schedules invocation of the original function.
         *
         * @returns {void}
         */
        function proxy() {
            var timeStamp = Date.now();
            if (leadingCall) {
                // Reject immediately following calls.
                if (timeStamp - lastCallTime < trailingTimeout) {
                    return;
                }
                // Schedule new call to be in invoked when the pending one is resolved.
                // This is important for "transitions" which never actually start
                // immediately so there is a chance that we might miss one if change
                // happens amids the pending invocation.
                trailingCall = true;
            }
            else {
                leadingCall = true;
                trailingCall = false;
                setTimeout(timeoutCallback, delay);
            }
            lastCallTime = timeStamp;
        }
        return proxy;
    }

    // Minimum delay before invoking the update of observers.
    var REFRESH_DELAY = 20;
    // A list of substrings of CSS properties used to find transition events that
    // might affect dimensions of observed elements.
    var transitionKeys = ['top', 'right', 'bottom', 'left', 'width', 'height', 'size', 'weight'];
    // Check if MutationObserver is available.
    var mutationObserverSupported = typeof MutationObserver !== 'undefined';
    /**
     * Singleton controller class which handles updates of ResizeObserver instances.
     */
    var ResizeObserverController = /** @class */ (function () {
        /**
         * Creates a new instance of ResizeObserverController.
         *
         * @private
         */
        function ResizeObserverController() {
            /**
             * Indicates whether DOM listeners have been added.
             *
             * @private {boolean}
             */
            this.connected_ = false;
            /**
             * Tells that controller has subscribed for Mutation Events.
             *
             * @private {boolean}
             */
            this.mutationEventsAdded_ = false;
            /**
             * Keeps reference to the instance of MutationObserver.
             *
             * @private {MutationObserver}
             */
            this.mutationsObserver_ = null;
            /**
             * A list of connected observers.
             *
             * @private {Array<ResizeObserverSPI>}
             */
            this.observers_ = [];
            this.onTransitionEnd_ = this.onTransitionEnd_.bind(this);
            this.refresh = throttle(this.refresh.bind(this), REFRESH_DELAY);
        }
        /**
         * Adds observer to observers list.
         *
         * @param {ResizeObserverSPI} observer - Observer to be added.
         * @returns {void}
         */
        ResizeObserverController.prototype.addObserver = function (observer) {
            if (!~this.observers_.indexOf(observer)) {
                this.observers_.push(observer);
            }
            // Add listeners if they haven't been added yet.
            if (!this.connected_) {
                this.connect_();
            }
        };
        /**
         * Removes observer from observers list.
         *
         * @param {ResizeObserverSPI} observer - Observer to be removed.
         * @returns {void}
         */
        ResizeObserverController.prototype.removeObserver = function (observer) {
            var observers = this.observers_;
            var index = observers.indexOf(observer);
            // Remove observer if it's present in registry.
            if (~index) {
                observers.splice(index, 1);
            }
            // Remove listeners if controller has no connected observers.
            if (!observers.length && this.connected_) {
                this.disconnect_();
            }
        };
        /**
         * Invokes the update of observers. It will continue running updates insofar
         * it detects changes.
         *
         * @returns {void}
         */
        ResizeObserverController.prototype.refresh = function () {
            var changesDetected = this.updateObservers_();
            // Continue running updates if changes have been detected as there might
            // be future ones caused by CSS transitions.
            if (changesDetected) {
                this.refresh();
            }
        };
        /**
         * Updates every observer from observers list and notifies them of queued
         * entries.
         *
         * @private
         * @returns {boolean} Returns "true" if any observer has detected changes in
         *      dimensions of it's elements.
         */
        ResizeObserverController.prototype.updateObservers_ = function () {
            // Collect observers that have active observations.
            var activeObservers = this.observers_.filter(function (observer) {
                return observer.gatherActive(), observer.hasActive();
            });
            // Deliver notifications in a separate cycle in order to avoid any
            // collisions between observers, e.g. when multiple instances of
            // ResizeObserver are tracking the same element and the callback of one
            // of them changes content dimensions of the observed target. Sometimes
            // this may result in notifications being blocked for the rest of observers.
            activeObservers.forEach(function (observer) { return observer.broadcastActive(); });
            return activeObservers.length > 0;
        };
        /**
         * Initializes DOM listeners.
         *
         * @private
         * @returns {void}
         */
        ResizeObserverController.prototype.connect_ = function () {
            // Do nothing if running in a non-browser environment or if listeners
            // have been already added.
            if (!isBrowser || this.connected_) {
                return;
            }
            // Subscription to the "Transitionend" event is used as a workaround for
            // delayed transitions. This way it's possible to capture at least the
            // final state of an element.
            document.addEventListener('transitionend', this.onTransitionEnd_);
            window.addEventListener('resize', this.refresh);
            if (mutationObserverSupported) {
                this.mutationsObserver_ = new MutationObserver(this.refresh);
                this.mutationsObserver_.observe(document, {
                    attributes: true,
                    childList: true,
                    characterData: true,
                    subtree: true
                });
            }
            else {
                document.addEventListener('DOMSubtreeModified', this.refresh);
                this.mutationEventsAdded_ = true;
            }
            this.connected_ = true;
        };
        /**
         * Removes DOM listeners.
         *
         * @private
         * @returns {void}
         */
        ResizeObserverController.prototype.disconnect_ = function () {
            // Do nothing if running in a non-browser environment or if listeners
            // have been already removed.
            if (!isBrowser || !this.connected_) {
                return;
            }
            document.removeEventListener('transitionend', this.onTransitionEnd_);
            window.removeEventListener('resize', this.refresh);
            if (this.mutationsObserver_) {
                this.mutationsObserver_.disconnect();
            }
            if (this.mutationEventsAdded_) {
                document.removeEventListener('DOMSubtreeModified', this.refresh);
            }
            this.mutationsObserver_ = null;
            this.mutationEventsAdded_ = false;
            this.connected_ = false;
        };
        /**
         * "Transitionend" event handler.
         *
         * @private
         * @param {TransitionEvent} event
         * @returns {void}
         */
        ResizeObserverController.prototype.onTransitionEnd_ = function (_a) {
            var _b = _a.propertyName, propertyName = _b === void 0 ? '' : _b;
            // Detect whether transition may affect dimensions of an element.
            var isReflowProperty = transitionKeys.some(function (key) {
                return !!~propertyName.indexOf(key);
            });
            if (isReflowProperty) {
                this.refresh();
            }
        };
        /**
         * Returns instance of the ResizeObserverController.
         *
         * @returns {ResizeObserverController}
         */
        ResizeObserverController.getInstance = function () {
            if (!this.instance_) {
                this.instance_ = new ResizeObserverController();
            }
            return this.instance_;
        };
        /**
         * Holds reference to the controller's instance.
         *
         * @private {ResizeObserverController}
         */
        ResizeObserverController.instance_ = null;
        return ResizeObserverController;
    }());

    /**
     * Defines non-writable/enumerable properties of the provided target object.
     *
     * @param {Object} target - Object for which to define properties.
     * @param {Object} props - Properties to be defined.
     * @returns {Object} Target object.
     */
    var defineConfigurable = (function (target, props) {
        for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
            var key = _a[_i];
            Object.defineProperty(target, key, {
                value: props[key],
                enumerable: false,
                writable: false,
                configurable: true
            });
        }
        return target;
    });

    /**
     * Returns the global object associated with provided element.
     *
     * @param {Object} target
     * @returns {Object}
     */
    var getWindowOf = (function (target) {
        // Assume that the element is an instance of Node, which means that it
        // has the "ownerDocument" property from which we can retrieve a
        // corresponding global object.
        var ownerGlobal = target && target.ownerDocument && target.ownerDocument.defaultView;
        // Return the local global object if it's not possible extract one from
        // provided element.
        return ownerGlobal || global$1;
    });

    // Placeholder of an empty content rectangle.
    var emptyRect = createRectInit(0, 0, 0, 0);
    /**
     * Converts provided string to a number.
     *
     * @param {number|string} value
     * @returns {number}
     */
    function toFloat(value) {
        return parseFloat(value) || 0;
    }
    /**
     * Extracts borders size from provided styles.
     *
     * @param {CSSStyleDeclaration} styles
     * @param {...string} positions - Borders positions (top, right, ...)
     * @returns {number}
     */
    function getBordersSize(styles) {
        var positions = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            positions[_i - 1] = arguments[_i];
        }
        return positions.reduce(function (size, position) {
            var value = styles['border-' + position + '-width'];
            return size + toFloat(value);
        }, 0);
    }
    /**
     * Extracts paddings sizes from provided styles.
     *
     * @param {CSSStyleDeclaration} styles
     * @returns {Object} Paddings box.
     */
    function getPaddings(styles) {
        var positions = ['top', 'right', 'bottom', 'left'];
        var paddings = {};
        for (var _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
            var position = positions_1[_i];
            var value = styles['padding-' + position];
            paddings[position] = toFloat(value);
        }
        return paddings;
    }
    /**
     * Calculates content rectangle of provided SVG element.
     *
     * @param {SVGGraphicsElement} target - Element content rectangle of which needs
     *      to be calculated.
     * @returns {DOMRectInit}
     */
    function getSVGContentRect(target) {
        var bbox = target.getBBox();
        return createRectInit(0, 0, bbox.width, bbox.height);
    }
    /**
     * Calculates content rectangle of provided HTMLElement.
     *
     * @param {HTMLElement} target - Element for which to calculate the content rectangle.
     * @returns {DOMRectInit}
     */
    function getHTMLElementContentRect(target) {
        // Client width & height properties can't be
        // used exclusively as they provide rounded values.
        var clientWidth = target.clientWidth, clientHeight = target.clientHeight;
        // By this condition we can catch all non-replaced inline, hidden and
        // detached elements. Though elements with width & height properties less
        // than 0.5 will be discarded as well.
        //
        // Without it we would need to implement separate methods for each of
        // those cases and it's not possible to perform a precise and performance
        // effective test for hidden elements. E.g. even jQuery's ':visible' filter
        // gives wrong results for elements with width & height less than 0.5.
        if (!clientWidth && !clientHeight) {
            return emptyRect;
        }
        var styles = getWindowOf(target).getComputedStyle(target);
        var paddings = getPaddings(styles);
        var horizPad = paddings.left + paddings.right;
        var vertPad = paddings.top + paddings.bottom;
        // Computed styles of width & height are being used because they are the
        // only dimensions available to JS that contain non-rounded values. It could
        // be possible to utilize the getBoundingClientRect if only it's data wasn't
        // affected by CSS transformations let alone paddings, borders and scroll bars.
        var width = toFloat(styles.width), height = toFloat(styles.height);
        // Width & height include paddings and borders when the 'border-box' box
        // model is applied (except for IE).
        if (styles.boxSizing === 'border-box') {
            // Following conditions are required to handle Internet Explorer which
            // doesn't include paddings and borders to computed CSS dimensions.
            //
            // We can say that if CSS dimensions + paddings are equal to the "client"
            // properties then it's either IE, and thus we don't need to subtract
            // anything, or an element merely doesn't have paddings/borders styles.
            if (Math.round(width + horizPad) !== clientWidth) {
                width -= getBordersSize(styles, 'left', 'right') + horizPad;
            }
            if (Math.round(height + vertPad) !== clientHeight) {
                height -= getBordersSize(styles, 'top', 'bottom') + vertPad;
            }
        }
        // Following steps can't be applied to the document's root element as its
        // client[Width/Height] properties represent viewport area of the window.
        // Besides, it's as well not necessary as the <html> itself neither has
        // rendered scroll bars nor it can be clipped.
        if (!isDocumentElement(target)) {
            // In some browsers (only in Firefox, actually) CSS width & height
            // include scroll bars size which can be removed at this step as scroll
            // bars are the only difference between rounded dimensions + paddings
            // and "client" properties, though that is not always true in Chrome.
            var vertScrollbar = Math.round(width + horizPad) - clientWidth;
            var horizScrollbar = Math.round(height + vertPad) - clientHeight;
            // Chrome has a rather weird rounding of "client" properties.
            // E.g. for an element with content width of 314.2px it sometimes gives
            // the client width of 315px and for the width of 314.7px it may give
            // 314px. And it doesn't happen all the time. So just ignore this delta
            // as a non-relevant.
            if (Math.abs(vertScrollbar) !== 1) {
                width -= vertScrollbar;
            }
            if (Math.abs(horizScrollbar) !== 1) {
                height -= horizScrollbar;
            }
        }
        return createRectInit(paddings.left, paddings.top, width, height);
    }
    /**
     * Checks whether provided element is an instance of the SVGGraphicsElement.
     *
     * @param {Element} target - Element to be checked.
     * @returns {boolean}
     */
    var isSVGGraphicsElement = (function () {
        // Some browsers, namely IE and Edge, don't have the SVGGraphicsElement
        // interface.
        if (typeof SVGGraphicsElement !== 'undefined') {
            return function (target) { return target instanceof getWindowOf(target).SVGGraphicsElement; };
        }
        // If it's so, then check that element is at least an instance of the
        // SVGElement and that it has the "getBBox" method.
        // eslint-disable-next-line no-extra-parens
        return function (target) { return (target instanceof getWindowOf(target).SVGElement &&
            typeof target.getBBox === 'function'); };
    })();
    /**
     * Checks whether provided element is a document element (<html>).
     *
     * @param {Element} target - Element to be checked.
     * @returns {boolean}
     */
    function isDocumentElement(target) {
        return target === getWindowOf(target).document.documentElement;
    }
    /**
     * Calculates an appropriate content rectangle for provided html or svg element.
     *
     * @param {Element} target - Element content rectangle of which needs to be calculated.
     * @returns {DOMRectInit}
     */
    function getContentRect(target) {
        if (!isBrowser) {
            return emptyRect;
        }
        if (isSVGGraphicsElement(target)) {
            return getSVGContentRect(target);
        }
        return getHTMLElementContentRect(target);
    }
    /**
     * Creates rectangle with an interface of the DOMRectReadOnly.
     * Spec: https://drafts.fxtf.org/geometry/#domrectreadonly
     *
     * @param {DOMRectInit} rectInit - Object with rectangle's x/y coordinates and dimensions.
     * @returns {DOMRectReadOnly}
     */
    function createReadOnlyRect(_a) {
        var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
        // If DOMRectReadOnly is available use it as a prototype for the rectangle.
        var Constr = typeof DOMRectReadOnly !== 'undefined' ? DOMRectReadOnly : Object;
        var rect = Object.create(Constr.prototype);
        // Rectangle's properties are not writable and non-enumerable.
        defineConfigurable(rect, {
            x: x, y: y, width: width, height: height,
            top: y,
            right: x + width,
            bottom: height + y,
            left: x
        });
        return rect;
    }
    /**
     * Creates DOMRectInit object based on the provided dimensions and the x/y coordinates.
     * Spec: https://drafts.fxtf.org/geometry/#dictdef-domrectinit
     *
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} width - Rectangle's width.
     * @param {number} height - Rectangle's height.
     * @returns {DOMRectInit}
     */
    function createRectInit(x, y, width, height) {
        return { x: x, y: y, width: width, height: height };
    }

    /**
     * Class that is responsible for computations of the content rectangle of
     * provided DOM element and for keeping track of it's changes.
     */
    var ResizeObservation = /** @class */ (function () {
        /**
         * Creates an instance of ResizeObservation.
         *
         * @param {Element} target - Element to be observed.
         */
        function ResizeObservation(target) {
            /**
             * Broadcasted width of content rectangle.
             *
             * @type {number}
             */
            this.broadcastWidth = 0;
            /**
             * Broadcasted height of content rectangle.
             *
             * @type {number}
             */
            this.broadcastHeight = 0;
            /**
             * Reference to the last observed content rectangle.
             *
             * @private {DOMRectInit}
             */
            this.contentRect_ = createRectInit(0, 0, 0, 0);
            this.target = target;
        }
        /**
         * Updates content rectangle and tells whether it's width or height properties
         * have changed since the last broadcast.
         *
         * @returns {boolean}
         */
        ResizeObservation.prototype.isActive = function () {
            var rect = getContentRect(this.target);
            this.contentRect_ = rect;
            return (rect.width !== this.broadcastWidth ||
                rect.height !== this.broadcastHeight);
        };
        /**
         * Updates 'broadcastWidth' and 'broadcastHeight' properties with a data
         * from the corresponding properties of the last observed content rectangle.
         *
         * @returns {DOMRectInit} Last observed content rectangle.
         */
        ResizeObservation.prototype.broadcastRect = function () {
            var rect = this.contentRect_;
            this.broadcastWidth = rect.width;
            this.broadcastHeight = rect.height;
            return rect;
        };
        return ResizeObservation;
    }());

    var ResizeObserverEntry = /** @class */ (function () {
        /**
         * Creates an instance of ResizeObserverEntry.
         *
         * @param {Element} target - Element that is being observed.
         * @param {DOMRectInit} rectInit - Data of the element's content rectangle.
         */
        function ResizeObserverEntry(target, rectInit) {
            var contentRect = createReadOnlyRect(rectInit);
            // According to the specification following properties are not writable
            // and are also not enumerable in the native implementation.
            //
            // Property accessors are not being used as they'd require to define a
            // private WeakMap storage which may cause memory leaks in browsers that
            // don't support this type of collections.
            defineConfigurable(this, { target: target, contentRect: contentRect });
        }
        return ResizeObserverEntry;
    }());

    var ResizeObserverSPI = /** @class */ (function () {
        /**
         * Creates a new instance of ResizeObserver.
         *
         * @param {ResizeObserverCallback} callback - Callback function that is invoked
         *      when one of the observed elements changes it's content dimensions.
         * @param {ResizeObserverController} controller - Controller instance which
         *      is responsible for the updates of observer.
         * @param {ResizeObserver} callbackCtx - Reference to the public
         *      ResizeObserver instance which will be passed to callback function.
         */
        function ResizeObserverSPI(callback, controller, callbackCtx) {
            /**
             * Collection of resize observations that have detected changes in dimensions
             * of elements.
             *
             * @private {Array<ResizeObservation>}
             */
            this.activeObservations_ = [];
            /**
             * Registry of the ResizeObservation instances.
             *
             * @private {Map<Element, ResizeObservation>}
             */
            this.observations_ = new MapShim();
            if (typeof callback !== 'function') {
                throw new TypeError('The callback provided as parameter 1 is not a function.');
            }
            this.callback_ = callback;
            this.controller_ = controller;
            this.callbackCtx_ = callbackCtx;
        }
        /**
         * Starts observing provided element.
         *
         * @param {Element} target - Element to be observed.
         * @returns {void}
         */
        ResizeObserverSPI.prototype.observe = function (target) {
            if (!arguments.length) {
                throw new TypeError('1 argument required, but only 0 present.');
            }
            // Do nothing if current environment doesn't have the Element interface.
            if (typeof Element === 'undefined' || !(Element instanceof Object)) {
                return;
            }
            if (!(target instanceof getWindowOf(target).Element)) {
                throw new TypeError('parameter 1 is not of type "Element".');
            }
            var observations = this.observations_;
            // Do nothing if element is already being observed.
            if (observations.has(target)) {
                return;
            }
            observations.set(target, new ResizeObservation(target));
            this.controller_.addObserver(this);
            // Force the update of observations.
            this.controller_.refresh();
        };
        /**
         * Stops observing provided element.
         *
         * @param {Element} target - Element to stop observing.
         * @returns {void}
         */
        ResizeObserverSPI.prototype.unobserve = function (target) {
            if (!arguments.length) {
                throw new TypeError('1 argument required, but only 0 present.');
            }
            // Do nothing if current environment doesn't have the Element interface.
            if (typeof Element === 'undefined' || !(Element instanceof Object)) {
                return;
            }
            if (!(target instanceof getWindowOf(target).Element)) {
                throw new TypeError('parameter 1 is not of type "Element".');
            }
            var observations = this.observations_;
            // Do nothing if element is not being observed.
            if (!observations.has(target)) {
                return;
            }
            observations.delete(target);
            if (!observations.size) {
                this.controller_.removeObserver(this);
            }
        };
        /**
         * Stops observing all elements.
         *
         * @returns {void}
         */
        ResizeObserverSPI.prototype.disconnect = function () {
            this.clearActive();
            this.observations_.clear();
            this.controller_.removeObserver(this);
        };
        /**
         * Collects observation instances the associated element of which has changed
         * it's content rectangle.
         *
         * @returns {void}
         */
        ResizeObserverSPI.prototype.gatherActive = function () {
            var _this = this;
            this.clearActive();
            this.observations_.forEach(function (observation) {
                if (observation.isActive()) {
                    _this.activeObservations_.push(observation);
                }
            });
        };
        /**
         * Invokes initial callback function with a list of ResizeObserverEntry
         * instances collected from active resize observations.
         *
         * @returns {void}
         */
        ResizeObserverSPI.prototype.broadcastActive = function () {
            // Do nothing if observer doesn't have active observations.
            if (!this.hasActive()) {
                return;
            }
            var ctx = this.callbackCtx_;
            // Create ResizeObserverEntry instance for every active observation.
            var entries = this.activeObservations_.map(function (observation) {
                return new ResizeObserverEntry(observation.target, observation.broadcastRect());
            });
            this.callback_.call(ctx, entries, ctx);
            this.clearActive();
        };
        /**
         * Clears the collection of active observations.
         *
         * @returns {void}
         */
        ResizeObserverSPI.prototype.clearActive = function () {
            this.activeObservations_.splice(0);
        };
        /**
         * Tells whether observer has active observations.
         *
         * @returns {boolean}
         */
        ResizeObserverSPI.prototype.hasActive = function () {
            return this.activeObservations_.length > 0;
        };
        return ResizeObserverSPI;
    }());

    // Registry of internal observers. If WeakMap is not available use current shim
    // for the Map collection as it has all required methods and because WeakMap
    // can't be fully polyfilled anyway.
    var observers = typeof WeakMap !== 'undefined' ? new WeakMap() : new MapShim();
    /**
     * ResizeObserver API. Encapsulates the ResizeObserver SPI implementation
     * exposing only those methods and properties that are defined in the spec.
     */
    var ResizeObserver = /** @class */ (function () {
        /**
         * Creates a new instance of ResizeObserver.
         *
         * @param {ResizeObserverCallback} callback - Callback that is invoked when
         *      dimensions of the observed elements change.
         */
        function ResizeObserver(callback) {
            if (!(this instanceof ResizeObserver)) {
                throw new TypeError('Cannot call a class as a function.');
            }
            if (!arguments.length) {
                throw new TypeError('1 argument required, but only 0 present.');
            }
            var controller = ResizeObserverController.getInstance();
            var observer = new ResizeObserverSPI(callback, controller, this);
            observers.set(this, observer);
        }
        return ResizeObserver;
    }());
    // Expose public methods of ResizeObserver.
    [
        'observe',
        'unobserve',
        'disconnect'
    ].forEach(function (method) {
        ResizeObserver.prototype[method] = function () {
            var _a;
            return (_a = observers.get(this))[method].apply(_a, arguments);
        };
    });

    var index = (function () {
        // Export existing implementation if available.
        if (typeof global$1.ResizeObserver !== 'undefined') {
            return global$1.ResizeObserver;
        }
        return ResizeObserver;
    })();

    /* src\CanvasDraw.svelte generated by Svelte v3.24.0 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;
    const file = "src\\CanvasDraw.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i].name;
    	child_ctx[54] = list[i].zIndex;
    	return child_ctx;
    }

    // (549:4) {#each canvasTypes as {name, zIndex}}
    function create_each_block(ctx) {
    	let canvas_1;
    	let canvas_1_key_value;
    	let name = /*name*/ ctx[53];
    	let mounted;
    	let dispose;
    	const assign_canvas_1 = () => /*canvas_1_binding*/ ctx[23](canvas_1, name);
    	const unassign_canvas_1 = () => /*canvas_1_binding*/ ctx[23](null, name);

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			attr_dev(canvas_1, "key", canvas_1_key_value = /*name*/ ctx[53]);
    			set_style(canvas_1, "display", "block");
    			set_style(canvas_1, "position", "absolute");
    			set_style(canvas_1, "z-index", /*zIndex*/ ctx[54]);
    			add_location(canvas_1, file, 549, 6, 13223);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas_1, anchor);
    			assign_canvas_1();

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						canvas_1,
    						"mousedown",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawStart*/ ctx[7]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"mousemove",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawMove*/ ctx[8]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"mouseup",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawEnd*/ ctx[9]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"mouseout",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawEnd*/ ctx[9]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"touchstart",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawStart*/ ctx[7]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"touchmove",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawMove*/ ctx[8]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"touchend",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawEnd*/ ctx[9]
    						: undefined,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						canvas_1,
    						"touchcancel",
    						/*name*/ ctx[53] === "interface"
    						? /*handleDrawEnd*/ ctx[9]
    						: undefined,
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (name !== /*name*/ ctx[53]) {
    				unassign_canvas_1();
    				name = /*name*/ ctx[53];
    				assign_canvas_1();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			unassign_canvas_1();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(549:4) {#each canvasTypes as {name, zIndex}}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let div_class_value;
    	let each_value = /*canvasTypes*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", div_class_value = "drwaing-container " + /*classes*/ ctx[3] + " svelte-h9f8x2");
    			set_style(div, "height", /*canvasHeight*/ ctx[2] + "px");
    			set_style(div, "width", /*canvasWidth*/ ctx[1] + "px");
    			set_style(div, "background-color", /*backgroundColor*/ ctx[0]);
    			add_location(div, file, 544, 2, 12997);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			/*div_binding*/ ctx[24](div);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*canvasTypes, canvas, handleDrawEnd, handleDrawStart, handleDrawMove*/ 976) {
    				each_value = /*canvasTypes*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*classes*/ 8 && div_class_value !== (div_class_value = "drwaing-container " + /*classes*/ ctx[3] + " svelte-h9f8x2")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*canvasHeight*/ 4) {
    				set_style(div, "height", /*canvasHeight*/ ctx[2] + "px");
    			}

    			if (dirty[0] & /*canvasWidth*/ 2) {
    				set_style(div, "width", /*canvasWidth*/ ctx[1] + "px");
    			}

    			if (dirty[0] & /*backgroundColor*/ 1) {
    				set_style(div, "background-color", /*backgroundColor*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			/*div_binding*/ ctx[24](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function midPointBtw(p1, p2) {
    	return {
    		x: p1.x + (p2.x - p1.x) / 2,
    		y: p1.y + (p2.y - p1.y) / 2
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { onChange = null } = $$props;
    	let { loadTimeOffset = 5 } = $$props;
    	let { lazyRadius = 12 } = $$props;
    	let { brushRadius = 10 } = $$props;
    	let { brushColor = "#444" } = $$props;
    	let { catenaryColor = "#0a0302" } = $$props;
    	let { gridColor = "rgba(150,150,150,0.17)" } = $$props;
    	let { backgroundColor = "#FFF" } = $$props;
    	let { hideGrid = false } = $$props;
    	let { canvasWidth = 800 } = $$props;
    	let { canvasHeight = 800 } = $$props;
    	let { disabled = false } = $$props;
    	let { imgSrc = "" } = $$props;
    	let { saveData = "" } = $$props;
    	let { immediateLoading = false } = $$props;
    	let { hideInterface = false } = $$props;
    	let { classes = "" } = $$props;
    	const canvasStyle = { display: "block", position: "absolute" };

    	const canvasTypes = [
    		{ name: "interface", zIndex: 15 },
    		{ name: "drawing", zIndex: 11 },
    		{ name: "temp", zIndex: 12 },
    		{ name: "grid", zIndex: 10 }
    	];

    	let canvas = {};
    	let ctx = {};
    	let catenary = new lib_2$1();
    	let points = [];
    	let lines = [];
    	let mouseHasMoved = true;
    	let valuesChanged = true;
    	let isDrawing = false;
    	let isPressing = false;
    	let lazy = null;
    	let image = null;
    	let chainLength = null;
    	let canvasContainer = null;
    	let canvasObserver = null;

    	onMount(() => {
    		Object.keys(canvas).forEach(key => {
    			ctx[key] = canvas[key].getContext("2d");
    		});

    		console.log(ctx);

    		lazy = new lib_3({
    				radius: lazyRadius * window.devicePixelRatio,
    				enabled: true,
    				initialPoint: {
    					x: window.innerWidth / 2,
    					y: window.innerHeight / 2
    				}
    			});

    		chainLength = lazyRadius * window.devicePixelRatio;
    		canvasObserver = new index((entries, observer) => handleCanvasResize(entries, observer));
    		canvasObserver.observe(canvasContainer);
    		drawImage();
    		loop();

    		window.setTimeout(
    			() => {
    				const initX = window.innerWidth / 2;
    				const initY = window.innerHeight / 2;
    				lazy.update({ x: initX - chainLength / 4, y: initY }, { both: true });
    				lazy.update({ x: initX + chainLength / 4, y: initY }, { both: false });
    				mouseHasMoved = true;
    				valuesChanged = true;
    				clear();

    				// Load saveData from prop if it exists
    				if (saveData) {
    					loadSaveData(saveData);
    				}
    			},
    			100
    		);
    	});

    	// afterUpdate(() => {
    	//   // Set new lazyRadius values
    	//   chainLength = lazyRadius * window.devicePixelRatio;
    	//   lazy.setRadius(lazyRadius * window.devicePixelRatio);
    	//   loadSaveData(saveData);
    	//   // Signal loop function that values changed
    	//   valuesChanged = true;
    	// });
    	// onDestroy(() => {
    	//   canvasObserver.unobserve(canvasContainer)
    	// });
    	let drawImage = () => {
    		if (!imgSrc) return;
    		image = new Image();
    		image.crossOrigin = "anonymous";
    		image.onload = () => drawImage({ ctx: ctx.grid, img: image });
    		image.src = imgSrc;
    	};

    	let undo = () => {
    		const lines = lines.slice(0, -1);
    		clear();
    		simulateDrawingLines({ lines, immediate: true });
    		triggerOnChange();
    	};

    	let getSaveData = () => {
    		return JSON.stringify({
    			lines,
    			width: canvasWidth,
    			height: canvasHeight
    		});
    	};

    	let loadSaveData = (saveData, immediate = immediateLoading) => {
    		console.log(saveData);

    		if (typeof saveData !== "string") {
    			throw new Error("saveData needs to be of type string!");
    		}

    		const { lines, width, height } = JSON.parse(saveData);

    		if (!lines || typeof lines.push !== "function") {
    			throw new Error("saveData.lines needs to be an array!");
    		}

    		clear();

    		if (width === canvasWidth && height === canvasHeight) {
    			simulateDrawingLines({ lines, immediate });
    		} else {
    			const scaleX = canvasWidth / width;
    			const scaleY = canvasHeight / height;
    			const scaleAvg = (scaleX + scaleY) / 2;

    			simulateDrawingLines({
    				lines: lines.map(line => ({
    					...line,
    					points: line.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })),
    					brushRadius: line.brushRadius * scaleAvg
    				})),
    				immediate
    			});
    		}
    	};

    	let simulateDrawingLines = ({ lines, immediate }) => {
    		// Simulate live-drawing of the loaded lines
    		// TODO use a generator
    		let curTime = 0;

    		let timeoutGap = immediate ? 0 : loadTimeOffset;

    		lines.forEach(line => {
    			const { points, brushColor, brushRadius } = line;

    			// Draw all at once if immediate flag is set, instead of using setTimeout
    			if (immediate) {
    				// Draw the points
    				drawPoints({ points, brushColor, brushRadius });

    				// Save line with the drawn points
    				points = points;

    				saveLine({ brushColor, brushRadius });
    				return;
    			}

    			// Use timeout to draw
    			for (let i = 1; i < points.length; i++) {
    				curTime += timeoutGap;

    				window.setTimeout(
    					() => {
    						drawPoints({
    							points: points.slice(0, i + 1),
    							brushColor,
    							brushRadius
    						});
    					},
    					curTime
    				);
    			}

    			curTime += timeoutGap;

    			window.setTimeout(
    				() => {
    					// Save this line with its props instead of props
    					points = points;

    					saveLine({ brushColor, brushRadius });
    				},
    				curTime
    			);
    		});
    	};

    	let handleDrawStart = e => {
    		e.preventDefault();

    		// Start drawing
    		isPressing = true;

    		const { x, y } = getPointerPos(e);

    		if (e.touches && e.touches.length > 0) {
    			// on touch, set catenary position to touch pos
    			lazy.update({ x, y }, { both: true });
    		}

    		// Ensure the initial down position gets added to our line
    		handlePointerMove(x, y);
    	};

    	let handleDrawMove = e => {
    		e.preventDefault();
    		const { x, y } = getPointerPos(e);
    		handlePointerMove(x, y);
    	};

    	let handleDrawEnd = e => {
    		e.preventDefault();

    		// Draw to this end pos
    		handleDrawMove(e);

    		// Stop drawing & save the drawn line
    		isDrawing = false;

    		isPressing = false;
    		saveLine();
    	};

    	let handleCanvasResize = (entries, observer) => {
    		const saveData = getSaveData();

    		for (const entry of entries) {
    			console.log(entry);
    			const { width, height } = entry.contentRect;
    			setCanvasSize(canvas.interface, width, height);
    			setCanvasSize(canvas.drawing, width, height);
    			setCanvasSize(canvas.temp, width, height);
    			setCanvasSize(canvas.grid, width, height);
    			drawGrid(ctx.grid);
    			drawImage();
    			loop({ once: true });
    		}

    		loadSaveData(saveData, true);
    	};

    	let setCanvasSize = (canvas, width, height) => {
    		canvas.width = width;
    		canvas.height = height;
    		canvas.style.width = width;
    		canvas.style.height = height;
    	};

    	let getPointerPos = e => {
    		const rect = canvas.interface.getBoundingClientRect();

    		// use cursor pos as default
    		let clientX = e.clientX;

    		let clientY = e.clientY;

    		// use first touch if available
    		if (e.changedTouches && e.changedTouches.length > 0) {
    			clientX = e.changedTouches[0].clientX;
    			clientY = e.changedTouches[0].clientY;
    		}

    		// return mouse/touch position inside canvas
    		return {
    			x: clientX - rect.left,
    			y: clientY - rect.top
    		};
    	};

    	let handlePointerMove = (x, y) => {
    		if (disabled) return;
    		lazy.update({ x, y });
    		const isDisabled = !lazy.isEnabled();

    		if (isPressing && !isDrawing || isDisabled && isPressing) {
    			// Start drawing and add point
    			isDrawing = true;

    			points.push(lazy.brush.toObject());
    		}

    		if (isDrawing) {
    			// Add new point
    			points.push(lazy.brush.toObject());

    			// Draw current points
    			drawPoints({ points, brushColor, brushRadius });
    		}

    		mouseHasMoved = true;
    	};

    	let drawPoints = ({ points, brushColor, brushRadius }) => {
    		ctx.temp.lineJoin = "round";
    		ctx.temp.lineCap = "round";
    		ctx.temp.strokeStyle = brushColor;
    		ctx.temp.clearRect(0, 0, ctx.temp.canvas.width, ctx.temp.canvas.height);
    		ctx.temp.lineWidth = brushRadius * 2;
    		let p1 = points[0];
    		let p2 = points[1];
    		ctx.temp.moveTo(p2.x, p2.y);
    		ctx.temp.beginPath();

    		for (var i = 1, len = points.length; i < len; i++) {
    			// we pick the point between pi+1 & pi+2 as the
    			// end point and p1 as our control point
    			var midPoint = midPointBtw(p1, p2);

    			ctx.temp.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    			p1 = points[i];
    			p2 = points[i + 1];
    		}

    		// Draw last line as a straight line while
    		// we wait for the next point to be able to calculate
    		// the bezier control point
    		ctx.temp.lineTo(p1.x, p1.y);

    		ctx.temp.stroke();
    	};

    	let saveLine = ({ brushColor, brushRadius } = {}) => {
    		if (points.length < 2) return;

    		// Save as new line
    		lines.push({
    			points: [...points],
    			brushColor: brushColor || brushColor,
    			brushRadius: brushRadius || brushRadius
    		});

    		// Reset points array
    		points.length = 0;

    		const width = canvas.temp.width;
    		const height = canvas.temp.height;

    		// Copy the line to the drawing canvas
    		ctx.drawing.drawImage(canvas.temp, 0, 0, width, height);

    		// Clear the temporary line-drawing canvas
    		ctx.temp.clearRect(0, 0, width, height);

    		triggerOnChange();
    	};

    	// let triggerOnChange = () => {
    	//   onChange && onChange(this);
    	// };
    	let clear = () => {
    		lines = [];
    		valuesChanged = true;
    		ctx.drawing.clearRect(0, 0, canvas.drawing.width, canvas.drawing.height);
    		ctx.temp.clearRect(0, 0, canvas.temp.width, canvas.temp.height);
    	};

    	let loop = ({ once = false } = {}) => {
    		if (mouseHasMoved || valuesChanged) {
    			const pointer = lazy.getPointerCoordinates();
    			const brush = lazy.getBrushCoordinates();
    			drawInterface(ctx.interface, pointer, brush);
    			mouseHasMoved = false;
    			valuesChanged = false;
    		}

    		if (!once) {
    			window.requestAnimationFrame(() => {
    				loop();
    			});
    		}
    	};

    	let drawGrid = ctx => {
    		if (hideGrid) return;
    		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    		ctx.beginPath();
    		ctx.setLineDash([5, 1]);
    		ctx.setLineDash([]);
    		ctx.strokeStyle = gridColor;
    		ctx.lineWidth = 0.5;
    		const gridSize = 25;
    		let countX = 0;

    		while (countX < ctx.canvas.width) {
    			countX += gridSize;
    			ctx.moveTo(countX, 0);
    			ctx.lineTo(countX, ctx.canvas.height);
    		}

    		ctx.stroke();
    		let countY = 0;

    		while (countY < ctx.canvas.height) {
    			countY += gridSize;
    			ctx.moveTo(0, countY);
    			ctx.lineTo(ctx.canvas.width, countY);
    		}

    		ctx.stroke();
    	};

    	let drawInterface = (ctx, pointer, brush) => {
    		if (hideInterface) return;
    		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    		// Draw brush preview
    		ctx.beginPath();

    		ctx.fillStyle = brushColor;
    		ctx.arc(brush.x, brush.y, brushRadius, 0, Math.PI * 2, true);
    		ctx.fill();

    		// Draw mouse point (the one directly at the cursor)
    		ctx.beginPath();

    		ctx.fillStyle = catenaryColor;
    		ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2, true);
    		ctx.fill();

    		// Draw catenary
    		if (lazy.isEnabled()) {
    			ctx.beginPath();
    			ctx.lineWidth = 2;
    			ctx.lineCap = "round";
    			ctx.setLineDash([2, 4]);
    			ctx.strokeStyle = catenaryColor;

    			// catenary.drawToCanvas(
    			//   ctx.interface,
    			//   brush,
    			//   pointer,
    			//   chainLength
    			// );
    			ctx.stroke();
    		}

    		// Draw brush point (the one in the middle of the brush preview)
    		ctx.beginPath();

    		ctx.fillStyle = catenaryColor;
    		ctx.arc(brush.x, brush.y, 2, 0, Math.PI * 2, true);
    		ctx.fill();
    	};

    	const writable_props = [
    		"onChange",
    		"loadTimeOffset",
    		"lazyRadius",
    		"brushRadius",
    		"brushColor",
    		"catenaryColor",
    		"gridColor",
    		"backgroundColor",
    		"hideGrid",
    		"canvasWidth",
    		"canvasHeight",
    		"disabled",
    		"imgSrc",
    		"saveData",
    		"immediateLoading",
    		"hideInterface",
    		"classes"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<CanvasDraw> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CanvasDraw", $$slots, []);

    	function canvas_1_binding($$value, name) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas[name] = $$value;
    			$$invalidate(4, canvas);
    			$$invalidate(6, canvasTypes);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvasContainer = $$value;
    			$$invalidate(5, canvasContainer);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("onChange" in $$props) $$invalidate(10, onChange = $$props.onChange);
    		if ("loadTimeOffset" in $$props) $$invalidate(11, loadTimeOffset = $$props.loadTimeOffset);
    		if ("lazyRadius" in $$props) $$invalidate(12, lazyRadius = $$props.lazyRadius);
    		if ("brushRadius" in $$props) $$invalidate(13, brushRadius = $$props.brushRadius);
    		if ("brushColor" in $$props) $$invalidate(14, brushColor = $$props.brushColor);
    		if ("catenaryColor" in $$props) $$invalidate(15, catenaryColor = $$props.catenaryColor);
    		if ("gridColor" in $$props) $$invalidate(16, gridColor = $$props.gridColor);
    		if ("backgroundColor" in $$props) $$invalidate(0, backgroundColor = $$props.backgroundColor);
    		if ("hideGrid" in $$props) $$invalidate(17, hideGrid = $$props.hideGrid);
    		if ("canvasWidth" in $$props) $$invalidate(1, canvasWidth = $$props.canvasWidth);
    		if ("canvasHeight" in $$props) $$invalidate(2, canvasHeight = $$props.canvasHeight);
    		if ("disabled" in $$props) $$invalidate(18, disabled = $$props.disabled);
    		if ("imgSrc" in $$props) $$invalidate(19, imgSrc = $$props.imgSrc);
    		if ("saveData" in $$props) $$invalidate(20, saveData = $$props.saveData);
    		if ("immediateLoading" in $$props) $$invalidate(21, immediateLoading = $$props.immediateLoading);
    		if ("hideInterface" in $$props) $$invalidate(22, hideInterface = $$props.hideInterface);
    		if ("classes" in $$props) $$invalidate(3, classes = $$props.classes);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		onDestroy,
    		LazyBrush: lib_3,
    		Catenary: lib_2$1,
    		ResizeObserver: index,
    		onChange,
    		loadTimeOffset,
    		lazyRadius,
    		brushRadius,
    		brushColor,
    		catenaryColor,
    		gridColor,
    		backgroundColor,
    		hideGrid,
    		canvasWidth,
    		canvasHeight,
    		disabled,
    		imgSrc,
    		saveData,
    		immediateLoading,
    		hideInterface,
    		classes,
    		midPointBtw,
    		canvasStyle,
    		canvasTypes,
    		canvas,
    		ctx,
    		catenary,
    		points,
    		lines,
    		mouseHasMoved,
    		valuesChanged,
    		isDrawing,
    		isPressing,
    		lazy,
    		image,
    		chainLength,
    		canvasContainer,
    		canvasObserver,
    		drawImage,
    		undo,
    		getSaveData,
    		loadSaveData,
    		simulateDrawingLines,
    		handleDrawStart,
    		handleDrawMove,
    		handleDrawEnd,
    		handleCanvasResize,
    		setCanvasSize,
    		getPointerPos,
    		handlePointerMove,
    		drawPoints,
    		saveLine,
    		clear,
    		loop,
    		drawGrid,
    		drawInterface
    	});

    	$$self.$inject_state = $$props => {
    		if ("onChange" in $$props) $$invalidate(10, onChange = $$props.onChange);
    		if ("loadTimeOffset" in $$props) $$invalidate(11, loadTimeOffset = $$props.loadTimeOffset);
    		if ("lazyRadius" in $$props) $$invalidate(12, lazyRadius = $$props.lazyRadius);
    		if ("brushRadius" in $$props) $$invalidate(13, brushRadius = $$props.brushRadius);
    		if ("brushColor" in $$props) $$invalidate(14, brushColor = $$props.brushColor);
    		if ("catenaryColor" in $$props) $$invalidate(15, catenaryColor = $$props.catenaryColor);
    		if ("gridColor" in $$props) $$invalidate(16, gridColor = $$props.gridColor);
    		if ("backgroundColor" in $$props) $$invalidate(0, backgroundColor = $$props.backgroundColor);
    		if ("hideGrid" in $$props) $$invalidate(17, hideGrid = $$props.hideGrid);
    		if ("canvasWidth" in $$props) $$invalidate(1, canvasWidth = $$props.canvasWidth);
    		if ("canvasHeight" in $$props) $$invalidate(2, canvasHeight = $$props.canvasHeight);
    		if ("disabled" in $$props) $$invalidate(18, disabled = $$props.disabled);
    		if ("imgSrc" in $$props) $$invalidate(19, imgSrc = $$props.imgSrc);
    		if ("saveData" in $$props) $$invalidate(20, saveData = $$props.saveData);
    		if ("immediateLoading" in $$props) $$invalidate(21, immediateLoading = $$props.immediateLoading);
    		if ("hideInterface" in $$props) $$invalidate(22, hideInterface = $$props.hideInterface);
    		if ("classes" in $$props) $$invalidate(3, classes = $$props.classes);
    		if ("canvas" in $$props) $$invalidate(4, canvas = $$props.canvas);
    		if ("ctx" in $$props) ctx = $$props.ctx;
    		if ("catenary" in $$props) catenary = $$props.catenary;
    		if ("points" in $$props) points = $$props.points;
    		if ("lines" in $$props) lines = $$props.lines;
    		if ("mouseHasMoved" in $$props) mouseHasMoved = $$props.mouseHasMoved;
    		if ("valuesChanged" in $$props) valuesChanged = $$props.valuesChanged;
    		if ("isDrawing" in $$props) isDrawing = $$props.isDrawing;
    		if ("isPressing" in $$props) isPressing = $$props.isPressing;
    		if ("lazy" in $$props) lazy = $$props.lazy;
    		if ("image" in $$props) image = $$props.image;
    		if ("chainLength" in $$props) chainLength = $$props.chainLength;
    		if ("canvasContainer" in $$props) $$invalidate(5, canvasContainer = $$props.canvasContainer);
    		if ("canvasObserver" in $$props) canvasObserver = $$props.canvasObserver;
    		if ("drawImage" in $$props) drawImage = $$props.drawImage;
    		if ("undo" in $$props) undo = $$props.undo;
    		if ("getSaveData" in $$props) getSaveData = $$props.getSaveData;
    		if ("loadSaveData" in $$props) loadSaveData = $$props.loadSaveData;
    		if ("simulateDrawingLines" in $$props) simulateDrawingLines = $$props.simulateDrawingLines;
    		if ("handleDrawStart" in $$props) $$invalidate(7, handleDrawStart = $$props.handleDrawStart);
    		if ("handleDrawMove" in $$props) $$invalidate(8, handleDrawMove = $$props.handleDrawMove);
    		if ("handleDrawEnd" in $$props) $$invalidate(9, handleDrawEnd = $$props.handleDrawEnd);
    		if ("handleCanvasResize" in $$props) handleCanvasResize = $$props.handleCanvasResize;
    		if ("setCanvasSize" in $$props) setCanvasSize = $$props.setCanvasSize;
    		if ("getPointerPos" in $$props) getPointerPos = $$props.getPointerPos;
    		if ("handlePointerMove" in $$props) handlePointerMove = $$props.handlePointerMove;
    		if ("drawPoints" in $$props) drawPoints = $$props.drawPoints;
    		if ("saveLine" in $$props) saveLine = $$props.saveLine;
    		if ("clear" in $$props) clear = $$props.clear;
    		if ("loop" in $$props) loop = $$props.loop;
    		if ("drawGrid" in $$props) drawGrid = $$props.drawGrid;
    		if ("drawInterface" in $$props) drawInterface = $$props.drawInterface;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		backgroundColor,
    		canvasWidth,
    		canvasHeight,
    		classes,
    		canvas,
    		canvasContainer,
    		canvasTypes,
    		handleDrawStart,
    		handleDrawMove,
    		handleDrawEnd,
    		onChange,
    		loadTimeOffset,
    		lazyRadius,
    		brushRadius,
    		brushColor,
    		catenaryColor,
    		gridColor,
    		hideGrid,
    		disabled,
    		imgSrc,
    		saveData,
    		immediateLoading,
    		hideInterface,
    		canvas_1_binding,
    		div_binding
    	];
    }

    class CanvasDraw extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				onChange: 10,
    				loadTimeOffset: 11,
    				lazyRadius: 12,
    				brushRadius: 13,
    				brushColor: 14,
    				catenaryColor: 15,
    				gridColor: 16,
    				backgroundColor: 0,
    				hideGrid: 17,
    				canvasWidth: 1,
    				canvasHeight: 2,
    				disabled: 18,
    				imgSrc: 19,
    				saveData: 20,
    				immediateLoading: 21,
    				hideInterface: 22,
    				classes: 3
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CanvasDraw",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get onChange() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onChange(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get loadTimeOffset() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loadTimeOffset(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lazyRadius() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lazyRadius(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get brushRadius() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set brushRadius(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get brushColor() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set brushColor(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get catenaryColor() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set catenaryColor(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gridColor() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gridColor(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get backgroundColor() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backgroundColor(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideGrid() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideGrid(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get canvasWidth() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set canvasWidth(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get canvasHeight() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set canvasHeight(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imgSrc() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imgSrc(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get saveData() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set saveData(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get immediateLoading() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set immediateLoading(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideInterface() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideInterface(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classes() {
    		throw new Error_1("<CanvasDraw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classes(value) {
    		throw new Error_1("<CanvasDraw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* dev\App.svelte generated by Svelte v3.24.0 */
    const file$1 = "dev\\App.svelte";

    function create_fragment$1(ctx) {
    	let input;
    	let t;
    	let canvasdraw;
    	let current;
    	let mounted;
    	let dispose;

    	canvasdraw = new CanvasDraw({
    			props: { brushColor: /*brushColor*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			create_component(canvasdraw.$$.fragment);
    			attr_dev(input, "type", "color");
    			add_location(input, file$1, 5, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*brushColor*/ ctx[0]);
    			insert_dev(target, t, anchor);
    			mount_component(canvasdraw, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*brushColor*/ 1) {
    				set_input_value(input, /*brushColor*/ ctx[0]);
    			}

    			const canvasdraw_changes = {};
    			if (dirty & /*brushColor*/ 1) canvasdraw_changes.brushColor = /*brushColor*/ ctx[0];
    			canvasdraw.$set(canvasdraw_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvasdraw.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvasdraw.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t);
    			destroy_component(canvasdraw, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let brushColor = "#444";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input_input_handler() {
    		brushColor = this.value;
    		$$invalidate(0, brushColor);
    	}

    	$$self.$capture_state = () => ({ CanvasDraw, brushColor });

    	$$self.$inject_state = $$props => {
    		if ("brushColor" in $$props) $$invalidate(0, brushColor = $$props.brushColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [brushColor, input_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
