# Privacy Policy

Effective date: 2026-07-30

Indie Keyword Finder is a local-first Chrome Extension for user-requested
keyword research.

## Data the Extension handles

The Extension may handle:

- seed keywords and user-maintained keyword lists;
- favorites, history, root sequences, settings, language, and cursor position;
- Mining session state, including queued, related, processed, and qualified
  keywords;
- Google Trends request URLs and response data required to evaluate the
  user-started Mining session;
- the Google Trends page content needed to place user-invoked inline tools.

This information may constitute website content, browsing activity, or
user-generated content under Chrome Web Store terminology even when it remains
on the user's device.

## Use and storage

Indie Keyword Finder uses this data only to:

- perform keyword research requested by the user;
- preserve the user's local lists, settings, and recoverable Mining session;
- show progress and results;
- open a destination explicitly chosen by the user.

Keywords, settings, and Mining sessions are stored in
`chrome.storage.local`. Indie Keyword Finder does not operate a backend,
account database, analytics service, advertising service, or telemetry
collector.

## Third-party processing

The Extension sends comparison terms and scope parameters to Google Trends
because Google Trends is the data source selected for the research workflow.
Google processes those requests under its own terms and privacy practices.

The Extension can also open Google Search, X, Reddit, Ahrefs, or NameBeta after
the user clicks the corresponding action. Indie Keyword Finder does not send
data to those destinations before that explicit action.

No Indie Keyword Finder-controlled third party receives or sells the user's
keywords, browsing activity, or research results.

## Retention and deletion

Local data remains until the user:

- removes an individual keyword;
- clears a list;
- chooses **Clear all local data** in Settings;
- clears the Extension's site data in Chrome; or
- uninstalls the Extension.

No copy remains on an Indie Keyword Finder server because no such server is
used.

## Permissions

- `sidePanel`: display the Extension interface.
- `storage`: save local lists, settings, and recoverable Mining state.
- `webRequest`: observe completed Google Trends data requests needed for a
  user-started Mining session.
- `https://trends.google.com/*`: open Google Trends, read the supported Trends
  page for inline tools, and retrieve the Trends responses required for the
  requested research.

## Limited Use

Indie Keyword Finder's use of information received from Chrome APIs adheres to
the Chrome Web Store User Data Policy, including the Limited Use requirements.
Data is used only to provide and improve the single disclosed
keyword-research purpose, protect the product and users, or comply with law.

## Changes and contact

Material changes will be documented in the repository and reflected in the
Chrome Web Store disclosures before new data practices begin.

For privacy questions, open a repository issue that contains no sensitive data.
For sensitive reports, use GitHub's private vulnerability reporting channel.
