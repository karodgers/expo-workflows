/**
 * Dashboard webview stylesheet. Kept apart from the document shell in
 * dashboardHtml so the markup, the CSP, and the resource URIs stay readable;
 * this module is a single inert string with no imports and no interpolation.
 *
 * Every colour is a VS Code theme variable so the dashboard follows the
 * active theme instead of shipping its own palette.
 */
export const DASHBOARD_STYLES = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 12px 12px 24px;
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    font: var(--vscode-font-size)/1.4 var(--vscode-font-family);
  }
  button, input { font: inherit; }
  button { color: inherit; }
  button:focus-visible, input:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
  .masthead {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 3px 2px 13px;
  }
  .masthead-mark {
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    border-radius: 7px;
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
  }
  .masthead-mark .codicon { font-size: 15px; }
  .masthead-copy { flex: 1; min-width: 0; }
  .masthead-title { font-weight: 650; line-height: 1.2; }
  .masthead-subtitle { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .loading-bar {
    height: 2px;
    margin: -2px 0 8px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--vscode-progressBar-background);
    opacity: .7;
  }
  .loading-bar::after {
    content: '';
    display: block;
    width: 35%;
    height: 100%;
    background: var(--vscode-button-foreground);
    animation: loading 1.1s ease-in-out infinite;
  }
  @keyframes loading { from { transform: translateX(-120%); } to { transform: translateX(390%); } }
  .hero {
    padding: 14px;
    margin-bottom: 13px;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 9px;
    background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
  }
  .hero-top { display: flex; align-items: flex-start; gap: 8px; }
  .hero-copy { flex: 1; min-width: 0; }
  .eyebrow {
    margin-bottom: 2px;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .055em;
    text-transform: uppercase;
  }
  .project-name {
    overflow: hidden;
    margin: 0;
    font-size: 17px;
    font-weight: 650;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .project-path {
    overflow: hidden;
    margin-top: 2px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icon-button {
    display: inline-grid;
    flex: 0 0 auto;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    color: var(--vscode-foreground);
    background: transparent;
    cursor: pointer;
  }
  .icon-button:hover { background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground)); }
  .status-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 11px; }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 21px;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid var(--vscode-widget-border, transparent);
    color: var(--vscode-badge-foreground, var(--vscode-foreground));
    background: var(--vscode-badge-background);
    font-size: 10px;
  }
  .status-pill .codicon { font-size: 11px; }
  .notice {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 10px;
    margin-bottom: 13px;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 7px;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-textBlockQuote-background, transparent);
    font-size: 11px;
  }
  .notice.warning .codicon { color: var(--vscode-editorWarning-foreground); }
  .notice.success .codicon { color: var(--vscode-testing-iconPassed); }
  .notice.error { border-color: var(--vscode-inputValidation-errorBorder); background: var(--vscode-inputValidation-errorBackground); }
  .notice.error > .codicon { color: var(--vscode-errorForeground); }
  .notice.info > .codicon { color: var(--vscode-textLink-foreground); }
  .notice-copy { flex: 1; }
  .link-button {
    padding: 0;
    border: 0;
    color: var(--vscode-textLink-foreground);
    background: transparent;
    cursor: pointer;
  }
  .link-button:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
  section { margin: 0 0 16px; }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0 2px 7px;
  }
  .section-heading h2 {
    margin: 0;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: .055em;
    text-transform: uppercase;
  }
  .action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .primary-action, .action-row, .profile-button, .category-chip {
    border: 1px solid var(--vscode-widget-border, transparent);
    background: var(--vscode-editorWidget-background, transparent);
    cursor: pointer;
  }
  .primary-action {
    display: flex;
    min-height: 73px;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    padding: 10px;
    border-radius: 7px;
    text-align: left;
  }
  .primary-action:hover, .action-row:hover, .profile-button:hover, .category-chip:hover {
    background: var(--vscode-list-hoverBackground);
  }
  .primary-action .codicon { color: var(--vscode-textLink-foreground); font-size: 16px; }
  .primary-label { font-weight: 600; }
  .primary-description { color: var(--vscode-descriptionForeground); font-size: 10px; line-height: 1.3; }
  .release-card {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--vscode-button-background);
    border-radius: 7px;
    color: var(--vscode-foreground);
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .release-card:hover { background: var(--vscode-list-hoverBackground); }
  .release-card > .codicon { color: var(--vscode-testing-iconPassed, var(--vscode-textLink-foreground)); font-size: 18px; }
  .release-copy { flex: 1; min-width: 0; }
  .release-title { font-weight: 600; }
  .release-description { color: var(--vscode-descriptionForeground); font-size: 10px; }
  .profile-list { display: flex; flex-direction: column; gap: 4px; }
  .profile-button, .action-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 9px;
    padding: 8px 9px;
    border-radius: 6px;
    text-align: left;
  }
  .profile-button .codicon, .action-row > .codicon {
    flex: 0 0 18px;
    color: var(--vscode-textLink-foreground);
    text-align: center;
  }
  .row-copy { flex: 1; min-width: 0; }
  .row-label { display: block; font-weight: 550; }
  .row-description {
    display: block;
    overflow: hidden;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .profile-meta { display: flex; flex: 0 1 auto; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
  .row-meta {
    display: inline-flex;
    max-width: 110px;
    padding: 2px 6px;
    overflow: hidden;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 999px;
    color: var(--vscode-badge-foreground, var(--vscode-foreground));
    background: var(--vscode-badge-background);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .secondary-button, .primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 30px;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
  }
  .secondary-button {
    width: 100%;
    border: 1px solid var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    background: var(--vscode-button-secondaryBackground);
  }
  .secondary-button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .primary-button {
    border: 0;
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
  }
  .primary-button:hover { background: var(--vscode-button-hoverBackground); }
  .wide-button { width: 100%; margin-top: 6px; }
  .open-folder-button {
    border: 1px dotted var(--vscode-button-secondaryForeground);
    color: var(--vscode-button-secondaryForeground);
    background: transparent;
  }
  .open-folder-button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    padding: 35px 13px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
  }
  .empty > .codicon { font-size: 30px; opacity: .75; }
  .empty-title { color: var(--vscode-foreground); font-size: 14px; font-weight: 600; }
  .empty .prompt-actions { margin-top: 15px; align-items: stretch; }
  .empty .prompt-actions > button { flex: 1; width: auto; white-space: nowrap; }
  .screen-header { display: flex; align-items: center; gap: 8px; margin: 1px 0 12px; }
  .screen-title { flex: 1; font-size: 13px; font-weight: 650; }
  .screen-subtitle { color: var(--vscode-descriptionForeground); font-size: 10px; }
  .search-input, .text-input {
    width: 100%;
    min-width: 0;
    padding: 7px 8px;
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
  }
  .search-wrap { position: relative; margin-bottom: 9px; }
  .search-wrap .codicon { position: absolute; top: 9px; left: 8px; color: var(--vscode-descriptionForeground); }
  .search-wrap .search-input { padding-left: 28px; }
  .category-chips { display: flex; gap: 5px; padding-bottom: 9px; overflow-x: auto; scrollbar-width: none; }
  .category-chips::-webkit-scrollbar { display: none; }
  .category-chip {
    flex: 0 0 auto;
    padding: 4px 8px;
    border-radius: 999px;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
  }
  .category-chip.active {
    border-color: var(--vscode-focusBorder);
    color: var(--vscode-badge-foreground);
    background: var(--vscode-badge-background);
  }
  .catalog-section { margin-bottom: 14px; }
  .catalog-section h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 2px 5px;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .catalog-empty { padding: 25px 8px; color: var(--vscode-descriptionForeground); text-align: center; }
  .feedback-title { margin-bottom: 2px; color: var(--vscode-foreground); font-weight: 600; }
  .feedback-action { margin-top: 5px; }
  .task-card { margin-bottom: 13px; }
  .task-card .release-card { border-color: var(--vscode-widget-border, transparent); }
  .task-card.error .release-card { border-color: var(--vscode-inputValidation-errorBorder); }
  .task-card.running .release-card { border-color: var(--vscode-editorWarning-foreground); }
  .prompt-intro { margin: -3px 1px 11px; color: var(--vscode-descriptionForeground); font-size: 11px; }
  .prompt-detail { margin-top: 3px; color: var(--vscode-descriptionForeground); font-size: 10px; }
  .validation-message {
    padding: 6px 8px;
    margin: 0 0 7px;
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    background: var(--vscode-inputValidation-errorBackground);
    font-size: 10px;
  }
  .multi-toolbar { display: flex; align-items: center; gap: 8px; margin: 2px 0 8px; }
  .multi-count { flex: 1; color: var(--vscode-descriptionForeground); font-size: 11px; }
  .multi-list { display: flex; flex-direction: column; gap: 4px; max-height: min(68vh, 680px); padding-right: 2px; overflow-y: auto; }
  .multi-item { display: flex; align-items: flex-start; gap: 8px; }
  .multi-item input { margin-top: 2px; accent-color: var(--vscode-checkbox-selectBackground); }
  .multi-item .prompt-description, .multi-item .prompt-detail { display: block; }
  .prompt-actions { display: flex; gap: 6px; margin-top: 10px; }
  .prompt-actions > button { flex: 1; }
  .confirm-card, .action-detail {
    padding: 12px;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 7px;
    background: var(--vscode-editorWidget-background, transparent);
  }
  .confirm-card.warning { border-color: var(--vscode-editorWarning-foreground); }
  .detail-copy { margin: 0 0 10px; color: var(--vscode-descriptionForeground); }
  .detail-list { padding-left: 18px; margin: 8px 0 0; color: var(--vscode-descriptionForeground); font-size: 11px; }
  .detail-list li { margin-bottom: 4px; }
  .detail-docs { margin-top: 10px; }
  .docs-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; }
  .docs-link .codicon { font-size: 12px; }
  .recovery-docs { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; }
  .recovery-docs:empty { display: none; }
  .detail-badges { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0; }
  .prompt-list { display: flex; flex-direction: column; gap: 5px; }
  .prompt-item {
    width: 100%;
    padding: 9px 10px;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 6px;
    color: var(--vscode-foreground);
    background: var(--vscode-editorWidget-background, transparent);
    text-align: left;
    cursor: pointer;
  }
  .prompt-item:hover { background: var(--vscode-list-hoverBackground); }
  .prompt-label { font-weight: 550; }
  .prompt-description { margin-top: 2px; color: var(--vscode-descriptionForeground); font-size: 10px; }
  .input-row { display: flex; align-items: stretch; gap: 6px; }
  .input-row .text-input { flex: 1; }
  .pending { display: flex; align-items: center; gap: 8px; padding: 9px 1px; color: var(--vscode-descriptionForeground); }
  .run-status { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; }
  .run-status.running { color: var(--vscode-editorWarning-foreground); }
  .run-status.stopping { color: var(--vscode-editorWarning-foreground); }
  .run-status.success { color: var(--vscode-testing-iconPassed); }
  .run-status.error { color: var(--vscode-testing-iconFailed); }
  .run-status.cancelled { color: var(--vscode-descriptionForeground); }
  .run-output {
    min-height: 110px;
    max-height: 65vh;
    padding: 10px;
    margin: 0 0 9px;
    overflow: auto;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 6px;
    color: var(--vscode-editor-foreground);
    background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
    font: 11px/1.5 var(--vscode-editor-font-family, monospace);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .run-summary { padding: 8px 9px; margin-bottom: 9px; border-radius: 5px; color: var(--vscode-descriptionForeground); background: var(--vscode-textBlockQuote-background, transparent); font-size: 10px; }
  .run-summary.error { color: var(--vscode-errorForeground); background: var(--vscode-inputValidation-errorBackground); }
  .recovery-panel { padding: 10px; margin-bottom: 9px; border: 1px solid var(--vscode-focusBorder); border-radius: 6px; background: var(--vscode-editorWidget-background, transparent); }
  .recovery-heading { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; font-weight: 650; }
  .recovery-list { display: flex; flex-direction: column; gap: 5px; }
  .recovery-action { display: flex; align-items: flex-start; gap: 8px; width: 100%; padding: 8px; border: 1px solid var(--vscode-widget-border, transparent); border-radius: 5px; color: var(--vscode-foreground); background: var(--vscode-button-secondaryBackground); text-align: left; cursor: pointer; }
  .recovery-action:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .recovery-action .codicon { margin-top: 2px; color: var(--vscode-textLink-foreground); }
  .recovery-description { display: block; margin-top: 2px; color: var(--vscode-descriptionForeground); font-size: 10px; }
  @media (max-width: 220px) { .action-grid { grid-template-columns: 1fr; } }
  @media (max-width: 300px) { .empty .prompt-actions { flex-direction: column; } }
  @media (prefers-reduced-motion: reduce) { .loading-bar::after { animation: none; width: 100%; } }
`;
