// The duplicated "name: function name()" are in fact intentional.
// They can help with debugging if you use these functions anonymously, so you still have a name attached.
var Boil = {
  // v------------- Standard Use -------------v
  // Localize all sub-elements, or the entire page if none are provided
  localize: function localize($el) {
    $el = $el || $(document);
    var self = this;
    $el.find('[data-l10n]').each(function(idx, el) {
      self.localizeElement($(el));
    });
  }
  ,save: function save(localStorageKey, $el) {
    localStorageKey = localStorageKey || "preferences";
    $el = $el || $('#content');
    localStorage[localStorageKey] = JSON.stringify(this.serialize($el));
  }
  ,load: function load(localStorageKey, $el) {
    localStorageKey = localStorageKey || "preferences";
    $el = $el || $('#content');
    var data = localStorage[localStorageKey];
    if (data) {
      data = JSON.parse(data);
    } else {
      data = {};
    }
    this.marshal(data, $el);
  }
  // display a tab based on the handler
  ,selectTab: function selectTab($el) {
    // find relevant data
    var name = $el.attr('id');
    var $content = $('#' + name + 'Content');
    // remove current selections
    $('#prefList .selected, #content > .selected').removeClass('selected');
    // select
    $el.addClass('selected');
    $content.addClass('selected');
  }
  // ^------------- Standard Use -------------^
  // v------------- Helpers -------------v
  // Localize an element as is appropriate
  ,localizeElement: function localizeElement($el) {
    var messageKey = $el.attr('data-l10n');
    if (messageKey) {
      var rawArgs = $el.attr('data-l10n-args');
      var messageArgs;
      if (rawArgs) { messageArgs = JSON.parse(rawArgs); }
      var message = chrome.i18n.getMessage(messageKey, messageArgs);
      if ($el.is('input')) {
        if ($el.is('[type=button],[type=submit]')) {
          $el.val(message);
        } else {
          $el.attr('placeholder', message);
        }
      } else {
        $el.html(message);
      }
    }
  }
  // Escapes (with backslash) all characters (2nd arg) in the string (1st arg).
  // You probably only want to do this with single / double quotes.
  // Other uses are unlikely to be correct.
  ,escape: function escape(str, chars) {
    return str.replace(new RegExp('(' + chars.split('').join('|') + ')', 'g'), '\\$1');
  }
  ,getFieldsetElements: function getFieldsetElements($el) {
    // get elements which are not in sub-fieldsets
    // there appears to be a bug in jQuery:
    //   $elements.not($elements.find('fieldset input, fieldset select'))
    // behaves as if the not-selector were 'fieldset input, select', despite the
    // inner $elements.find returning the correct objects.
    // as such, I am using a workaround - multiple .not() calls work as they should
    return $el.find('input, select, textarea')
      .not('[type=button],[type=submit]')
      .not($el.find('fieldset input'))
      .not($el.find('fieldset select'))
      .not($el.find('fieldset textarea'));
  }
  ,getSubFieldsets: function getSubFieldsets($el) {
    // get fieldsets which are not in sub-fieldsets
    return $el.find('fieldset').not($el.find('fieldset fieldset'));
  }
  // recursively serializes a fieldset that's passed in.
  ,serializeFieldset: function serializeFieldset($fieldset) {
    var $subs = this.getSubFieldsets($fieldset);
    var ret = {};
    // serialize the elements, and assign to their name
    this.getFieldsetElements($fieldset).each(function(idx, el) {
      var $el = $(el);
      ret[$el.attr('name')] = $el.is(':checkbox') ? $el.is(':checked') : $el.val();
    });
    // serialize sub-fieldsets, and assign to their 'data-group-name'
    // maybe this will change to just be 'name'?
    for (var i = 0; i < $subs.length; i += 1) {
      ret[$subs.eq(i).attr('data-group-name')] = this.serializeFieldset($subs.eq(i));
    }
    return ret;
  }
  // Recursively serializes all fieldsets in the document, or within the element passed in.
  ,serialize: function serializeContent($contents) {
    $contents = $contents || $(document);
    var $sets = this.getSubFieldsets($contents);
    var ret = {};
    var self = this;
    $sets.each(function(idx, e) {
      var $e = $(e);
      ret[$e.attr('data-group-name')] = self.serializeFieldset($e);
    });
    return ret;
  }
  ,marshalFieldset: function marshalFieldset(data, $sub) {
    var $fields = this.getFieldsetElements($sub);
    var $subs = this.getSubFieldsets($sub);
    for (key in data) {
      if (!data.hasOwnProperty(key)) { continue; }
      if (typeof data[key] === 'object' && !data[key].length) {
        // is an object and not an array.  arrays imply multi-selects, basically.
        var $innerSub = $subs.filter('[data-group-name="' + this.escape(key, '"') + '"]');
        this.marshalFieldset(data[key], $innerSub);
      } else if (typeof data[key] === 'boolean') {
        $fields.filter('[name="' + this.escape(key, '"') + '"]').attr('checked', data[key]);
      } else {
        $fields.filter('[name="' + this.escape(key, '"') + '"]').val(data[key]);
      }
    }
  }
  ,marshal: function marshal(data, $el) {
    var $subs = this.getSubFieldsets($el);
    for (key in data) {
      if (!data.hasOwnProperty(key)) { continue; }
      var $sub = $subs.filter('[data-group-name="' + this.escape(key, '"') + '"]');
      this.marshalFieldset(data[key], $sub);
    }
  }
  // ^------------- Helpers -------------^
};
