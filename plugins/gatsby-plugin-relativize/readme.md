# gatsby-plugin-relativize

A Gatsby plugin that post-processes the output to remove the dependency on absolute URLs. The post-processed site should work when deployed at any URL prefix.

The plugin is pretty much a fork of [gatsby-plugin-ifps](https://github.com/moxystudio/gatsby-plugin-ipfs). The difference is in how it arrives at the runtime `pathPrefix` to use.

## Installation

```sh
$ npm install --save @carrotsearch/gatsby-plugin-relativize
```


## Usage

In `gatsby-config.js`, set `prefixPath` to `__RELATIVIZE_PREFIX__` and include the plugin in the `plugins` array:

```js
{
  pathPrefix: '__RELATIVIZE_PREFIX__',
  "plugins": [
    `@carrotsearch/gatsby-plugin-relativize`
  ]
}
```

Then, build the project with `npm run build -- --prefix-paths`. Better yet, set it by default in your `package.json`:

```json
"scripts": {
  "build": "gatsby build --prefix-paths"
},
```

## The hacks

The plugin applies the following post-processing hacks:

* Iterate over all output HTML files and replace every occurrence of `__RELATIVIZE_PREFIX__` with the correct relative path based on the nesting depth of the file within the `public/` folder.

* Iterate over all output JavaScript files and replace every occurrence
of `__RELATIVIZE_PREFIX__` with a runtime reference to `window.__RELATIVIZE_PREFIX__`.

- Adds a very small code snippet to every HTML page that defines the `window.__RELATIVIZE_PREFIX__` global based on the current `window.location.pathname`. This ensures that Gatsby's runtime routing replaces the location with correct URLs.
 