module.exports = {
  publicPath: './test-reports/alert',
  filename: 'test-results.html',
  expand: true,
  hideIcon: false,
  pageTitle: 'Alert Module Test Results',
  includeFailureMsg: true,
  includeSuiteFailure: true,
  includeConsoleLog: true,
  dateFormat: 'yyyy-MM-dd HH:mm:ss',
  sort: 'titleAsc',
  executionTimeWarningThreshold: 5,
  inlineSource: true,  // Embed CSS and JS inline to make report self-contained
  customInfos: [
    {
      title: 'Project',
      value: 'Smart Stock Data System - Alert Module'
    },
    {
      title: 'Environment',
      value: process.env.NODE_ENV || 'test'
    },
    {
      title: 'Test Command',
      value: 'npm run test:unit:alert:reports'
    }
  ]
};