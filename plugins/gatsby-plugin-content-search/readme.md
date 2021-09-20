A Gatsby plugin that implements the client-side search backend
of [APIDocs](https://github.com/carrotsearch/gatsby-starter-apidocs).

The plugin takes all the text snippets extracted by
the [HTML transformer](https://github.com/carrotsearch/gatsby-transformer-html) plugin and
builds a [fuzzysort](https://github.com/farzher/fuzzysort) index for them. Based on that
index, a client-side Sublime-like searches can be applied to all the content in the
APIDocs documentation site.

See [`gatsby-starter-apidocs`](https://github.com/carrotsearch/gatsby-starter-apidocs) for
usage example and documentation.
