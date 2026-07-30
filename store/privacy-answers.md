# Chrome Web Store privacy answers

## Permission justifications

### sidePanel

Displays the user-facing Indie Keyword Finder research interface in Chrome's
Side Panel after the user opens the Extension.

### storage

Stores user-created keyword lists, favorites, settings, language, cursor
position, and recoverable Mining session state locally in Chrome. The Settings
screen provides a clear-all-data action.

### webRequest

Observes completed Google Trends data requests only during a user-started Mining
session so the Extension can identify the relevant time-series and
related-query responses. It does not block, redirect, or modify requests.

### https://trends.google.com/*

Required to open Google Trends comparisons, place user-invoked inline research
tools on supported Trends pages, and retrieve the Google Trends responses
needed for the user-requested Mining workflow. No broader host access is
requested.

## Remote code

No. All executable JavaScript is packaged in the Manifest V3 Extension ZIP.

## Data disclosure

The Extension handles website content, browsing activity related to Google
Trends, and user-generated keyword lists. Processing and persistence occur
locally, except for the Google Trends requests required to provide the
user-requested research and destinations the user explicitly chooses to open.

## Limited Use certification

The product uses data only to provide its disclosed keyword-research purpose,
maintain user-requested local state, protect the product and users, or comply
with law. It does not sell data, use it for advertising, or perform credit
decisions.
