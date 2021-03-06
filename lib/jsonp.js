/**
 * jsonp.js
 * Created by Kilian Ciuffolo on Dec 25, 2013
 * Copyright (c) 2013 Kilian Ciuffolo, me@nailik.org
 */

var http = require('http')
  , parseqs = require('qs').parse
  , JSONPStream = require('./jsonp-stream')

module.exports = function jsonp(options) {
  options = options || {}
  var domain = options.domain || '.default.lan'
  var callbackName = options.callbackName || 'callback'

  var iframeHtmlTemplate = [
    '<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html charset=utf-8"/><script type="text/javascript">document.domain = "' + domain + '";parent.',
    '(',
    ');</script></head><body></body></html>'
  ]

  return function *(next) {
    yield next

    var startChunk, endChunk
    var qs = parseqs(this.querystring)

    if (!qs[callbackName]) return

    if (this.method === 'POST') {
      this.type = 'html'
      startChunk = iframeHtmlTemplate[0] + qs[callbackName] + iframeHtmlTemplate[1]
      endChunk = iframeHtmlTemplate[2]
    } else {
      this.type = 'text/javascript'
      startChunk = ';' + qs[callbackName] + '('
      endChunk = ');'
    }

    // handle streams
    if ('function' === typeof this.body.pipe) {
      this.body = this.body.pipe(JSONPStream({
        startChunk: startChunk,
        endChunk: endChunk
      }))
    } else {
      // JSON parse vs eval fix. https://github.com/rack/rack-contrib/pull/37
      this.body =  startChunk + JSON.stringify(this.body, null, this.app.jsonSpaces) + endChunk
      this.body = this.body.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
    }
  }
}
