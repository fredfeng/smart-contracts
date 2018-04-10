/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Thu Sep 21 2017 23:09:07 GMT-0500 (CDT).
 */

define(['scsrc/bower_components/codemirror/lib/codemirror',
    'scsrc/bower_components/codemirror/mode/clike/clike',
  'css!./styles/SolidityCodeEditorWidget.css',
  'css!scsrc/bower_components/codemirror/lib/codemirror.css',
  'css!scsrc/bower_components/codemirror/theme/monokai.css'
], function (CodeMirror) {
    'use strict';

    var SolidityCodeEditorWidget,
        WIDGET_CLASS = 'solidity-code-editor',
        SYNTAX_GUTTER = 'code-syntax';

    SolidityCodeEditorWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this._el = container;
        this._segmentedDocument = {
            composition: [],
            segments: {}
        };
        this._wholeDocument = null;
        //this._autoSaveTimer = null;
        //this._autoSaveInterval = 20000;

        this._initialize();
        this._logger.debug('ctor finished');
    };

    SolidityCodeEditorWidget.prototype._initialize = function () {
        var self = this,
          saving = function () {
            //self._save();
            self._autoSave();
        };

        // set widget class
        this._el.addClass(WIDGET_CLASS);

        //handling the ctrl+S / cmd+S key pressing
        CodeMirror.commands.save = function (editor) {
            //if (self._autoSaveTimer) {
                //clearTimeout(self._autoSaveTimer);
                saving();
            //}
        };

        // The code editor.
        this.editor = CodeMirror(this._el[0], {
            readOnly: false,
            lineNumbers: true,
            matchBrackets: true,
            lint: false,
            path: './bower_components/codemirror/lib/',
            theme: 'monokai',
            //TODO: update MIME type
            mode: 'text/x-java',
            autofocus: true,
            dragDrop: false,
            gutters: [SYNTAX_GUTTER, "CodeMirror-linenumbers"]
        });

        $(this.editor.getWrapperElement()).addClass('code-editor');
        this._wholeDocument = this.editor.getDoc();
        // this._wholeDocument.on('beforeChange', function(doc, changeObj){
        //   var markers = doc.findMarksAt(changeObj.from),
        //       i;
        //   for (i = 0; i <markers.length; i += 1) {
        //     if (markers[i].readonly){
        //       changeObj.cancel();
        //     }
        //   }
        // });
        this._wholeDocument.on('change', function (/*doc,changeObj*/) {
          self.editor.clearGutter(SYNTAX_GUTTER);
        });
        // this._wholeDocument.on('change', function (/*doc,changeObj*/) {
        //     self.editor.clearGutter(SYNTAX_GUTTER);
        //     if (self._autoSaveTimer) {
        //         clearTimeout(self._autoSaveTimer);
        //         self._autoSaveTimer = setTimeout(saving, self._autoSaveInterval);
        //     }
        //     self._autoSaveTimer = setTimeout(saving, self._autoSaveInterval);
        // });
    };

    SolidityCodeEditorWidget.prototype._setSyntaxError = function (lineNumber, message) {
        var marker = document.createElement("i");
        marker.className = "glyphicon glyphicon-exclamation-sign";
        marker.style.color = "#822";
        marker.title = message;
        this.editor.setGutterMarker(lineNumber - 1, SYNTAX_GUTTER, marker);
    };

    SolidityCodeEditorWidget.prototype.onWidgetContainerResize = function (width, height) {
        this._el.width(width);
        this._el.height(height);
        this._logger.debug('Widget is resizing...');
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */
    // SolidityCodeEditorWidget.prototype.onSave = function (/*segmentedDocumentObject*/) {
    //     this._logger.info('The onSave event is not overwritten!');
    // };

    /* * * * * * * * Complex document management services  * * * * */
    SolidityCodeEditorWidget.prototype.setDocumentSegment = function (segmentName, segmentValue) {
        if (this._segmentedDocument.segments[segmentName]) {
            this._segmentedDocument.segments[segmentName].value = segmentValue;
            this._rebuildCompleteDocument();
        } else {
            this._logger.error('unknown segment [' + segmentName + '] cannot be changed');
        }
    };

    SolidityCodeEditorWidget.prototype.setSegmentedDocument = function (segmentedDocumentObject) {
            // we do not have to worry about cleaning, as setting the main document allegedly does it
            var newDocument = {segments: {}},
            i;

            newDocument.composition = JSON.parse(JSON.stringify(segmentedDocumentObject.composition));

            if (Array.isArray(newDocument.composition) !== true) {
                this._logger.error('Invalid segmentedDocumentObject [should have a composition array tag]');
                return;
            }
            if (typeof segmentedDocumentObject.segments !== 'object' || segmentedDocumentObject.segments === null) {
                this._logger.error('Invalid segmentedDocumentObject ' +
                  '[should have a segments tag that is the collection of the segments]');
                return;
            }

            for (i = 0; i < newDocument.composition.length; i += 1) {
                if (typeof newDocument.composition[i] !== 'string') {
                    this._logger.error('Invalid segmentedDocumentObject [segment identification should be string based]');
                    return;
                }

                if (segmentedDocumentObject.segments.hasOwnProperty(newDocument.composition[i]) !== true) {
                    this._logger.error('Invalid segmentedDocumentObject [segment \'' +
                    newDocument.composition[i] + '\' is missing]');
                    return;
                }

                if (segmentedDocumentObject.segments[newDocument.composition[i]].options &&
              typeof segmentedDocumentObject.segments[newDocument.composition[i]].options !== 'object') {
                    this._logger.error('Invalid segmentedDocumentObject [segment \'' +
                  newDocument.composition[i] + '\' has an invalid options field]');
                    return;
                }

                if (typeof segmentedDocumentObject.segments[newDocument.composition[i]].value !== 'string') {
                    this._logger.error('All document segment value has to be a string.');
                    return;
                }
                newDocument.segments[newDocument.composition[i]] = {
                    options: JSON.parse(
                  JSON.stringify(segmentedDocumentObject.segments[newDocument.composition[i]].options || {})),
                    value: segmentedDocumentObject.segments[newDocument.composition[i]].value
                };
            }

            this._segmentedDocument = newDocument;
            this._rebuildCompleteDocument();
            if (segmentedDocumentObject.errors) {
                for (i = 0; i < segmentedDocumentObject.errors.length; i += 1) {
                    this._setSyntaxError(segmentedDocumentObject.errors[i].line, segmentedDocumentObject.errors[i].message);
                }
            }
            // if (this._autoSaveTimer) {
            //     clearTimeout(this._autoSaveTimer);
            //     this._autoSaveTimer = null;
            // }
        };

    SolidityCodeEditorWidget.prototype.getDocument = function () {
            return this._wholeDocument.getValue();
        };

    SolidityCodeEditorWidget.prototype.getDocumentSegment = function (segmentName) {
            if (this._segmentedDocument.segments[segmentName]) {
                return this._segmentedDocument.segments[segmentName].value;
            } else {
                this._logger.error('unknown segment [' + segmentName + ']');
                return null;
            }
        };

    SolidityCodeEditorWidget.prototype.getChangedSegments = function () {
        var segments = {},
          segment, doc;

        for (segment in this._segmentedDocument.segments) {
            doc = this._segmentedDocument.segments[segment].doc.getValue();
            if (doc !== this._segmentedDocument.segments[segment].value) {
                segments[segment] = doc;
            }
        }
        return segments;
    };

    SolidityCodeEditorWidget.prototype._getNumberOfLinesOfSegment = function (segmentName) {
                //TODO: check if this is enough or we need some more sophisticated thing
                return this._segmentedDocument.segments[segmentName].value.split('\n').length;
            };

    SolidityCodeEditorWidget.prototype._rebuildCompleteDocument = function () {
            var i, segment, wholeDocument = '',
          oldCursorPosition = this._wholeDocument.getCursor(),
          oldScrollInfo = this.editor.getScrollInfo(),
          lineIndex, segmentLines;

            this.editor.clearGutter(SYNTAX_GUTTER);
            for (i = 0; i < this._segmentedDocument.composition.length; i += 1) {
                segment = this._segmentedDocument.segments[this._segmentedDocument.composition[i]];
                if (segment.doc) {
                    this._wholeDocument.unlinkDoc(segment.doc);
                    delete segment.doc;
                    if (segment.readOnlyMarker) {
                        segment.readOnlyMarker.clear();
                        delete segment.readOnlyMarker;
                    }
                }
                wholeDocument += segment.value + '\n';
            }
            this._wholeDocument.setValue(wholeDocument);
            lineIndex = 0;
            for (i = 0; i < this._segmentedDocument.composition.length; i += 1) {
                segment = this._segmentedDocument.segments[this._segmentedDocument.composition[i]];
                segmentLines = this._getNumberOfLinesOfSegment(this._segmentedDocument.composition[i]);
                segment.doc = this._wholeDocument.linkedDoc({
                    sharedHist: true,
                    from: lineIndex,
                    to: lineIndex + segmentLines
                });
                lineIndex += segmentLines;
                if (segment.options.readonly === true) {
                    this._setSegmentReadOnly(this._segmentedDocument.composition[i], true);
                }
            }

            this.editor.focus();
            this.editor.refresh();
            this._wholeDocument.setCursor(oldCursorPosition);
            this.editor.scrollTo(oldScrollInfo.left, oldScrollInfo.top);
        };

    SolidityCodeEditorWidget.prototype._setSegmentReadOnly = function (segmentName, readOnly) {
            var segmentInfo,
          fromLine,
          toLine;
            if (this._segmentedDocument.segments[segmentName]) {
                segmentInfo = this._segmentedDocument.segments[segmentName];
                if (segmentInfo.readOnlyMarker) {
                    segmentInfo.readOnlyMarker.clear();
                    delete segmentInfo.readOnlyMarker;
                }

                if (readOnly) {
                    fromLine = segmentInfo.doc.firstLine();
                    toLine = segmentInfo.doc.lastLine() + 1;

                    segmentInfo.readOnlyMarker = this._wholeDocument.markText(
                  {line: fromLine, ch: 0},
                  {line: toLine, ch: 0},
                  {
                        readonly: true,
                        atomic: true,
                        inclusiveLeft: true,
                        inclusiveRight: false,
                        className: 'read-only-code'
                    }
              );
                }
            } else {
                this._logger.error('unknown segment [' + segmentName + '] cannot be changed');
            }
        };

    // SolidityCodeEditorWidget.prototype._autoSave = function () {
    //     var changedSegments = this.getChangedSegments(),
    //       segment;
    //
    //     this._autoSaveTimer = null;
    //     if (Object.keys(changedSegments).length > 0) {
    //         for (segment in changedSegments) {
    //             this._segmentedDocument.segments[segment].value = changedSegments[segment];
    //         }
    //
    //         this.onSave(changedSegments);
    //     }
    // };

    SolidityCodeEditorWidget.prototype._autoSave = function () {
      var changedSegments = this.getChangedSegments(),
          segment;

      if (Object.keys(changedSegments).length > 0) {
        for (segment in changedSegments) {
          this._segmentedDocument.segments[segment].value = changedSegments[segment];
        }
        this.onSave(changedSegments);
      }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    SolidityCodeEditorWidget.prototype.destroy = function () {
      //  if (this._autoSaveTimer) {
            //this._autoSave();
        //}
    };

    SolidityCodeEditorWidget.prototype.onActivate = function () {
        this._logger.debug('SolidityCodeEditorWidget has been activated');
    };

    SolidityCodeEditorWidget.prototype.onDeactivate = function () {
      this._logger.debug('SolidityCodeEditorWidget has been deactivated');
      //if (this._autoSaveTimer) {
          //this._autoSave();
    //  }
    };
    return SolidityCodeEditorWidget;
});
