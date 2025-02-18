const path = require('path');
const open = require('open');
const chalk = require('chalk');
const { NodeSSH } = require('node-ssh');

class SSHWatchUploadWebpackPlugin {
  /*
   * @param { Object } options
   */
  constructor({ mode, host, port, username, passphrase, privateKey, uploadPath, domain = false, openDomain = false }) {
    this.cache = {};
    this.outputPath = '';
    this.mode = mode;
    this.host = host;
    this.port = port;
    this.username = username;
    this.passphrase = passphrase;
    this.privateKey = privateKey;
    this.domain = domain;
    this.openDomain = openDomain;
    this.uploadPath = uploadPath;
    this.ssh = new NodeSSH();
  }

  /*
   * @param { String } key
   */
  getCacheValueByKey(key) {
    return this.cache[key] ? this.cache[key] : false;
  }

  /*
   * @param { String } key
   * @param { Buffer } value
   */
  setCacheValueByKey(key, value) {
    this.cache[key] = value;
  }

  /*
   * @param { String } file
   */
  uploadAsset(file) {
    console.log(chalk`{yellow [SSHWatchUpload]} {gray [}${this.timestamp()}{gray ]} {gray Uploading} {cyan ${file}...}`);
    const localPath = `${this.outputPath}/${file}`;
    const serverPath = `${this.uploadPath}/${file}`;
    this.ssh.putFile(localPath, serverPath).then(
      () => console.log(chalk`{yellow [SSHWatchUpload]} {gray [}${this.timestamp()}{gray ]} {green Upload complete: ${file}}`),
      (error) => console.log(chalk`{yellow [SSHWatchUpload]} {red [Upload error] ${error}}`),
    );
  }

  /*
   * @param { String } file
   * @param { Buffer } info
   */
  hook(file, info) {
    // Check cache
    const cachedValue = this.getCacheValueByKey(file);
    // No cache, set and exit
    if (!cachedValue) return this.setCacheValueByKey(file, info);
    // Cache match, skip
    if (cachedValue.equals(info)) return;
    // Update cache
    this.setCacheValueByKey(file, info);
    // SSH
    this.uploadAsset(file);
  }

  /*
   * @param { WebpackCompiler } compiler
   */
  init(compiler) {
    this.connect();
    this.outputPath = compiler.options.output.path;
    if (this.openDomain && this.domain) this.openTheme();
  }

  /*
   * @param { WebpackCompiler } compiler
   */
  apply(compiler) {
    if (this.mode !== 'development') return console.log(chalk`{yellow [SSHWatchUpload] Warning: SSHWatchUpload will only run in development mode}`);
    this.init(compiler);
    compiler.hooks.assetEmitted.tap('SSHWatchUploadWebpackPlugin', this.hook.bind(this));
  }

  connect() {
    const { host, port, username, passphrase, privateKey } = this;
    const valideOptions = this.validateConnectionOptions({ host, port, username, passphrase, privateKey });
    if (!valideOptions) return false;
    this.ssh
      .connect({
        host,
        port,
        username,
        passphrase,
        privateKey,
      })
      .then(() => console.log(chalk`{yellow [SSHWatchUpload]} {gray [}${this.timestamp()}{gray ]} {gray Connected to server}\n{yellow [SSHWatchUpload]} {gray [}${this.timestamp()}{gray ]} {magenta Watching for changes...}`));
  }

  openTheme() {
    open(`https://${this.domain}`);
  }

  timestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  validateConnectionOptions(options) {
    return Object.keys(options).every((key) => {
      if (!options[key]) console.log(chalk`{yellow [SSHWatchUpload]} {red Missing configuration option: ${key}}`);
      return !!options[key];
    });
  }
}

module.exports = SSHWatchUploadWebpackPlugin;
