module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.dependencies && pkg.dependencies['adm-zip']) {
        pkg.dependencies['adm-zip'] = '>=0.6.0';
      }
      return pkg;
    }
  }
}
