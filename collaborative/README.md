# Recipe Book - Collaborative

## Installation

First, install [Node.js](https://nodejs.org/). Then run `npm i`.

## Commands

### `npm run dev`

Build the recipe book from `src/`, in [development mode](https://webpack.js.org/guides/development/).

### `npm run build`

Build the recipe book from `src/`, in [production mode](https://webpack.js.org/guides/production/) (smaller output files; longer build time; no source maps).

### `npm start`

Run the testing server. Open [http://localhost:3000/](http://localhost:3000/) to view the recipe book. Use multiple browser windows at once to test collaboration.

See [container-testing-server](https://www.npmjs.com/package/@collabs/container-testing-server) for usage info.

### `npm run clean`

Delete `dist/`.
