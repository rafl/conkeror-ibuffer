/**
 * Copyright (C) 2010 Florian Ragwitz
 *
 * Licensed under GPL2.
 */

in_module(null);

require("special-buffer.js");
require("interactive.js");

function ibuffer_generator (document, buffer) {
    dom_generator.call(this, document, XHTML_NS);
    this.buffer = buffer;
}

ibuffer_generator.prototype = {
    constructor: ibuffer_generator,
    __proto__: dom_generator.prototype,
    generate: function (bufs) {
        this.document.body.setAttribute("class", "ibuffer");

        let (g = this,
             p = this.element("p", this.document.body),
             ul = this.element("ul")) {

            bufs.for_each(function (b) {
                let (li = g.element("li"),
                     a = g.element("a", "class", "ibuffer-buffer-name",
                                   "href", "javascript:")) {

                    a.addEventListener("click", function (ev) {
                        bufs.bury_buffer(g.buffer)
                        switch_to_buffer(g.buffer.window, b);
                        ev.preventDefault();
                        ev.stopPropagation();
                    }, false);

                    g.text(b.title.length ? b.title : b.description, a);

                    li.appendChild(a);
                    ul.appendChild(li);
                }
            });

            p.appendChild(ul);
        }
    }
};

define_keymap("ibuffer_buffer_keymap", $parent = special_buffer_keymap);
define_key(ibuffer_buffer_keymap, "q", "ibuffer-bury");
define_key(ibuffer_buffer_keymap, "r", "ibuffer-regenerate");
define_key(ibuffer_buffer_keymap, "return", "follow",
           $browser_object = browser_object_focused_element);

define_key(default_global_keymap, "C-x C-b", "ibuffer");

function ibuffer_buffer_modality (buffer, element) {
    buffer.keymaps.push(ibuffer_buffer_keymap);
}

var ibuffer_instance;

function ibuffer_buffer (window) {
    /* FIXME: While I think the singleton-ish behaviour of ibuffer should be the
     * default, limiting the ibuffer_buffer class to only ever have one instance
     * is wrong. The singleton-ness should be provided by its user. I guess
     * having create_buffer return the buffer it created would be a good way to
     * achieve that. */
    ibuffer_instance = this;

    this.constructor_begin();
    keywords(arguments);
    special_buffer.call(this, window, forward_keywords(arguments));
    this.modalities.push(ibuffer_buffer_modality);
    this.constructor_end();

    /* When doing view-buffer in our ibuffer, this hook seems to be inherited by
     * the buffer used to view the source. Therefore we're trying to be somewhat
     * defensive here. */
    add_hook('kill_buffer_hook', function (b) {
        if (ibuffer_instance == b) {
            ibuffer_instance = null;
        }
    });
}

ibuffer_buffer.prototype = {
    constructor: ibuffer_buffer,
    title: "Buffer List",

    description: "*Ibuffer*",

    regenerate: function () {
        /* FIXME: horrible hack to clear document */
        this.document.close();
        this.document.open();
        this.document.write('<body>');
        this.generate();
    },

    generate: function () {
        var d = this.document;
        var g = new ibuffer_generator(d, this);
        g.generate(this.window.buffers);
    },

    __proto__: special_buffer.prototype
};

function ibuffer (buffer) {
    if (ibuffer_instance) {
        switch_to_buffer(buffer.window, ibuffer_instance);
        ibuffer_instance.regenerate();
        return;
    }

    create_buffer(
        buffer.window,
        buffer_creator(
            ibuffer_buffer
        ),
        OPEN_NEW_BUFFER
    );
}

interactive(
    "ibuffer", "Begin using Ibuffer to edit a list of buffers",
    function (I) { ibuffer(I.buffer); }
);

interactive(
    "ibuffer-bury", "Quit Ibuffer",
    function (I) { I.window.buffers.bury_buffer(I.buffer); }
);

interactive(
    "ibuffer-regenerate", "Refresh Ibuffer contents",
    function (I) { I.buffer.regenerate() }
);

provide("ibuffer");
