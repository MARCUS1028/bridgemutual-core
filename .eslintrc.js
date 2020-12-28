module.exports = {
  extends: ["eslint:recommended", `prettier`],
  env: {
    node: true,
    es6: true,
    mocha: true,
  },
  globals: {
    artifacts: true,
  },
  parserOptions: {
    ecmaVersion: 2017,
  },
  plugins: ["editorconfig"],
};
