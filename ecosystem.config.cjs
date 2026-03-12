module.exports = {
  apps: [{
    name: 'claude-code-ui',
    script: 'server/index.js',
    cwd: '/usr/lib/node_modules/@siteboon/claude-code-ui',
    env: {
      WORKSPACES_ROOT: '/home/claude-workspace',
      CLAUDECODE: '',
      CLAUDE_CODE_ENTRYPOINT: ''
    },
    filter_env: ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT']
  }]
};
