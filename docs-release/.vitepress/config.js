export default {
  title: 'Docs Release',
  description: 'Documentation site for releases',
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            processTerm: (term) => {
              const synonyms = {
                'guide': ['guide', 'manual', 'help'],
                'troubleshooting': ['troubleshooting', 'fix', 'error']
              };
              return synonyms[term.toLowerCase()] || term.toLowerCase();
            }
          },
          searchOptions: {
            fuzzy: 0.2
          }
        }
      }
    }
  }
}
