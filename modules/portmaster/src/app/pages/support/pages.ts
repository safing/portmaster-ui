export interface PageSections {
  title?: string;
  choices: SupportType[];
}

export interface QuestionSection {
  title: string;
  help?: string;
}

export interface SupportPage {
  type?: undefined;
  id: string;
  title: string;
  shortHelp: string;
  prologue?: string;
  epilogue?: string;
  sections: QuestionSection[];
  privateTicket?: boolean;
  ghIssuePreset?: string;
  includeDebugData?: boolean;
  repositories?: { repo: string, name: string }[];
}

export interface ExternalLink {
  type: 'link',
  url: string;
  title: string;
  shortHelp: string;
}

export type SupportType = SupportPage | ExternalLink;

export const supportTypes: PageSections[] = [
  {
    choices: [
      {
        id: "report-bug",
        title: "Report a Bug",
        shortHelp: "Found a bug? Report your discovery and make the Portmaster better for everyone.",
        sections: [
          {
            title: "What happened?",
            // help: "Please describe what happened to you as detailed as possible"
          },
          {
            title: "What did you expect to happen?"
          },
          {
            title: "How did you reproduce it?",
          },
          {
            title: "Something we have missed?",
          },
        ],
        includeDebugData: true,
        privateTicket: true,
        ghIssuePreset: "report-bug.md",
        repositories: [
          { repo: 'portmaster', name: 'Portmaster Core' },
          { repo: 'portmaster-ui', name: 'User Interface' },
          { repo: 'portmaster-packaging', name: 'Packaging & Installers' },
          { repo: 'spn', name: 'SPN' },
        ]
      },
      {
        id: "give-feedback",
        title: "Suggest an Improvement",
        shortHelp: "Suggest an enhancement or a new feature for the Portmaster.",
        sections: [
          {
            title: "What would you like to add or change?",
          },
          {
            title: "Why do you and others need this?"
          }
        ],
        includeDebugData: false,
        privateTicket: true,
        ghIssuePreset: "suggest-feature.md",
      },
      {
        type: 'link',
        title: 'Open Portmaster Docs',
        url: 'https://docs.safing.io/',
        shortHelp: 'View the Settings Handbook, get help with DNS Configuration and check VPN Compatibility.',
      },
    ],
  },
  {
    title: "Further Resources",
    choices: [
      {
        type: 'link',
        title: 'Upcoming Features',
        url: 'https://safing.io/next',
        shortHelp: 'See what we are currently working on!',
      },
      {
        type: 'link',
        title: 'Backlog',
        url: 'https://safing.io/backlog',
        shortHelp: 'Want to see a bigger picture of future planned features? Well, this is the place for you.',
      },
      {
        type: 'link',
        title: 'Blog',
        url: 'https://safing.io/next',
        shortHelp: 'Follow us on our blog and get monthly progress updates.',
      },
      {
        type: 'link',
        title: 'Ask On Reddit',
        url: 'https://reddit.com/r/safing',
        shortHelp: 'Directly ask us on our Sub-Reddit r/safing.'
      },
      {
        type: 'link',
        title: 'Support',
        url: 'https://safing.io/support',
        shortHelp: 'See how to get further support on using the Portmaster.'
      }
    ]
  }
]

