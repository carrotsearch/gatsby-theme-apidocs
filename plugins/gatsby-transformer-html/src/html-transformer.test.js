const demand = require("must/register");
const { loadHtml, renderHtml } = require("./html-transformer");
const { CodeHighlighter } = require("./transformers/code-highlighter");

// A simplified pipeline
const transform = rawHtml => {
  const codeHighlighter = new CodeHighlighter();
  let $ = loadHtml(rawHtml);
  $ = codeHighlighter.transform($);
  return renderHtml($);
};

describe("html transformer", function () {
  it("must highlight Java correctly", function () {
    const html = transform(`
<article>
  <pre data-language="java">
    static final class Attribute {
      @JsonProperty private final String name;

      @JsonProperty private final String value;

      private Attribute(String name, String value) {
        this.name = name;
        this.value = value;
      }

      private static List&lt;TaskStatus.Attribute&gt; from(Task&lt;?&gt; task) {
        return task.attributes().stream()
            .map(a -> new TaskStatus.Attribute(a.key, a.value))
            .collect(Collectors.toList());
      }
    }
  </pre>
</article>`);

    console.log(html);
  });

  it("must highlight js correctly", function () {
    const html = transform(`
<article>
  <h1>Code highlighting</h1>

  <p>This page shows how APIDocs highlights code in different languages.</p>

  <pre data-language="js">
api.schedule(function(done) {
  performCalculations();
    i > 11;
  done();
}, "when-idle");</pre>
</article>`);

    console.log(html);
  });

  it("must highlight doctype", function () {
    const html = transform(`
<article>
  <pre data-language="markup">
    <!doctype html>
    <html>
      <head>
        <TITLE>Test</TITLE>
      </head>
    
      <body>
        Test
      </body>
    </html>
  </pre>
</article>  
`);

    console.log(html);
  })
});