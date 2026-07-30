# Contributing

Thanks for helping improve Indie Keyword Finder.

## Before coding

Open or join an issue before substantial work. Keep each change focused on one
problem, and do not expand release scope without updating its acceptance
criteria.

## Development workflow

1. Fork the repository and create a focused branch.
2. Run `npm run generate:skill` after changing Mining Core behavior.
3. Run `npm run check`, `npm test`, and `npm run package`.
4. Confirm that UI claims, README text, privacy disclosures, and requested
   permissions still match actual behavior.
5. Submit a pull request explaining the user-visible outcome and verification.

Do not commit extension packages, credentials, cookies, tokens, Google account
data, Chrome Web Store keys, recovery codes, or captured browsing data.

## Developer Certificate of Origin

Contributions use the Developer Certificate of Origin 1.1. Add this line to
every commit:

```text
Signed-off-by: Your Name <your.email@example.com>
```

Use `git commit -s` to add it automatically. By signing off, you certify that
you have the right to submit the contribution under this repository's license.
Read the canonical DCO at <https://developercertificate.org/>.

## Code expectations

- Put deterministic Mining behavior behind the `mining-core` interface.
- Keep Chrome, browser, filesystem, and agent-tool concerns in adapters.
- Test observable behavior through the module interface.
- Never duplicate editable Mining rules in the Extension and Skill.
- Use accurate relative-signal language; do not add unsupported SEO claims.
- Add no runtime dependency or outbound destination without documenting its
  license, data flow, and release impact.
