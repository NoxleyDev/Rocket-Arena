
/**
 * ROCKET ARENA
 * Match Results Screen
 *
 * Displays the final score and individual player statistics.
 * This module only handles the interface.
 * It never modifies the physics engine or match statistics.
 */

const escapeHtml = (value) => {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
};

const numberOrZero = (value) => {
  return Math.max(0, Math.floor(Number(value) || 0));
};

export class MatchResultsScreen {

  constructor(container = document.body) {
    this.container = container || document.body;
    this.actions = {};
    this.root = null;
    this.panel = null;

    this._mount();
  }

  // ------------------------------------------------------------
  // CREATE INTERFACE
  // ------------------------------------------------------------

  _mount() {

    const existing = document.getElementById('ra-match-results');

    if (existing) {
      this.root = existing;
      this.panel = existing.querySelector('.ra-results-panel');
      return;
    }

    const style = document.createElement('style');

    style.id = 'ra-match-results-styles';

    style.textContent = `

      #ra-match-results {
        position: fixed;
        inset: 0;
        z-index: 10040;

        display: flex;
        align-items: center;
        justify-content: center;

        padding: clamp(12px, 3vw, 32px);

        overflow-y: auto;

        background: rgba(3, 8, 17, .90);

        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        opacity: 0;
        visibility: hidden;
        pointer-events: none;

        transition:
          opacity .22s ease,
          visibility .22s ease;

        font-family:
          'Chakra Petch',
          'Rajdhani',
          system-ui,
          sans-serif;

        color: #eef6ff;
      }

      #ra-match-results.is-visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      #ra-match-results .ra-results-panel {
        width: min(940px, 100%);
        max-height: min(92vh, 900px);

        overflow-y: auto;

        padding: clamp(18px, 3vw, 30px);

        border: 1px solid rgba(105, 190, 245, .24);
        border-radius: 18px;

        background: linear-gradient(
          145deg,
          rgba(13, 25, 43, .99),
          rgba(6, 13, 25, .99)
        );

        box-shadow:
          0 24px 80px rgba(0, 0, 0, .5),
          inset 0 1px rgba(255,255,255,.04);
      }

      #ra-match-results .ra-results-topline {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;

        color: #80d9ff;

        font-size: 10px;
        font-weight: 800;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      #ra-match-results .ra-results-mode {
        color: #8ba1b9;
        letter-spacing: .12em;
      }

      #ra-match-results .ra-results-heading {
        margin: 20px 0 22px;

        text-align: center;

        font-size: clamp(28px, 5vw, 46px);
        line-height: 1;
        font-weight: 900;
        letter-spacing: .07em;
        text-transform: uppercase;

        color: #f5f9ff;

        text-shadow:
          0 0 28px rgba(58, 177, 255, .18);
      }

      #ra-match-results .ra-results-heading.blue {
        color: #69baff;
      }

      #ra-match-results .ra-results-heading.orange {
        color: #ffad69;
      }

      #ra-match-results .ra-results-heading.draw {
        color: #e5edf7;
      }

      #ra-match-results .ra-results-score {
        display: grid;

        grid-template-columns: 1fr auto 1fr;

        align-items: center;

        gap: clamp(12px, 4vw, 40px);

        width: min(540px, 100%);

        margin: 0 auto 22px;

        padding: 16px 20px;

        border: 1px solid rgba(132, 164, 198, .18);
        border-radius: 14px;

        background: rgba(255,255,255,.035);
      }

      #ra-match-results .ra-results-team {
        text-align: center;
      }

      #ra-match-results .ra-results-team-name {
        display: block;
        margin-bottom: 4px;

        font-size: 11px;
        font-weight: 900;
        letter-spacing: .16em;
      }

      #ra-match-results .ra-results-team.blue .ra-results-team-name {
        color: #55b3ff;
      }

      #ra-match-results .ra-results-team.orange .ra-results-team-name {
        color: #ff9b50;
      }

      #ra-match-results .ra-results-goals {
        font: 800 clamp(34px, 6vw, 54px)/1
          ui-monospace,
          SFMono-Regular,
          Consolas,
          monospace;

        color: #fff;
      }

      #ra-match-results .ra-results-separator {
        color: #71859d;
        font-size: 20px;
        font-weight: 800;
      }

      #ra-match-results .ra-results-meta {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;

        margin: -8px 0 22px;
      }

      #ra-match-results .ra-results-chip {
        padding: 5px 9px;

        border: 1px solid rgba(135, 165, 196, .18);
        border-radius: 999px;

        color: #9eb2c8;
        background: rgba(255,255,255,.035);

        font-size: 9px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      #ra-match-results .ra-results-section-title {
        margin: 18px 0 9px;

        color: #cbd8e7;

        font-size: 11px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      #ra-match-results .ra-results-table-wrap {
        overflow-x: auto;

        border: 1px solid rgba(128, 159, 191, .16);
        border-radius: 11px;

        background: rgba(0,0,0,.12);
      }

      #ra-match-results table {
        width: 100%;
        min-width: 580px;

        border-collapse: collapse;

        font-size: 12px;
      }

      #ra-match-results th,
      #ra-match-results td {
        padding: 11px 12px;

        border-bottom:
          1px solid rgba(128, 159, 191, .12);

        text-align: right;
        white-space: nowrap;
      }

      #ra-match-results th {
        color: #8198b1;

        font-size: 9px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;

        background: rgba(255,255,255,.025);
      }

      #ra-match-results th:first-child,
      #ra-match-results td:first-child {
        text-align: left;
      }

      #ra-match-results tbody tr:last-child td {
        border-bottom: 0;
      }

      #ra-match-results .ra-player-cell {
        display: flex;
        align-items: center;
        gap: 9px;

        color: #edf5ff;
        font-weight: 700;
      }

      #ra-match-results .ra-team-dot {
        width: 7px;
        height: 7px;

        border-radius: 50%;

        flex: 0 0 7px;
      }

      #ra-match-results .ra-team-dot.blue {
        background: #42aaff;

        box-shadow:
          0 0 9px rgba(66,170,255,.65);
      }

      #ra-match-results .ra-team-dot.orange {
        background: #ff963d;

        box-shadow:
          0 0 9px rgba(255,150,61,.6);
      }

      #ra-match-results .ra-self-tag {
        color: #74d7ff;

        font-size: 8px;
        letter-spacing: .1em;
      }

      #ra-match-results .ra-results-actions {
        display: grid;

        grid-template-columns: 1.4fr 1fr 1fr;

        gap: 10px;

        margin-top: 24px;
      }

      #ra-match-results .ra-results-button {
        min-height: 44px;

        padding: 11px 14px;

        border: 1px solid rgba(130, 165, 198, .28);
        border-radius: 9px;

        color: #dcecff;
        background: rgba(255,255,255,.045);

        font: 800 10px
          'Chakra Petch',
          'Rajdhani',
          system-ui,
          sans-serif;

        letter-spacing: .1em;

        cursor: pointer;

        transition:
          transform .15s ease,
          background .15s ease,
          border-color .15s ease;
      }

      #ra-match-results .ra-results-button:hover {
        transform: translateY(-1px);

        background: rgba(255,255,255,.09);

        border-color:
          rgba(130, 200, 245, .55);
      }

      #ra-match-results .ra-results-button.primary {
        color: #061321;

        border-color: #55baff;

        background: linear-gradient(
          100deg,
          #56baff,
          #67ddff
        );
      }

      #ra-match-results .ra-results-button.primary:hover {
        background: linear-gradient(
          100deg,
          #79caff,
          #91e7ff
        );
      }

      #ra-match-results .ra-results-button:focus-visible {
        outline: 2px solid #7bdcff;
        outline-offset: 3px;
      }

      @media (max-width: 620px) {

        #ra-match-results {
          padding: 8px;
        }

        #ra-match-results .ra-results-panel {
          padding: 15px;
          border-radius: 13px;
          max-height: 96vh;
        }

        #ra-match-results .ra-results-actions {
          grid-template-columns: 1fr;
        }

        #ra-match-results .ra-results-topline {
          font-size: 8px;
        }
      }
    `;

    document.head.appendChild(style);

    this.root = document.createElement('div');

    this.root.id = 'ra-match-results';

    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Match results');

    this.root.innerHTML = `
      <div class="ra-results-panel" tabindex="-1"></div>
    `;

    this.panel = this.root.querySelector(
      '.ra-results-panel'
    );

    this.container.appendChild(this.root);

    // Handle result screen buttons.
    this.root.addEventListener('click', (event) => {

      const button = event.target.closest(
        '[data-result-action]'
      );

      if (!button) return;

      const action = button.getAttribute(
        'data-result-action'
      );

      const callback = this.actions[action];

      if (typeof callback === 'function') {
        callback();
      }

    });
  }

  // ------------------------------------------------------------
  // PUBLIC METHODS
  // ------------------------------------------------------------

  show(result, actions = {}) {

    this.actions = actions || {};

    this._render(result || {});

    this.root.classList.add('is-visible');

    this.panel.focus({
      preventScroll: true
    });
  }

  hide() {

    if (this.root) {
      this.root.classList.remove('is-visible');
    }

  }

  // ------------------------------------------------------------
  // RENDER RESULTS
  // ------------------------------------------------------------

  _render(result) {

    const score = result.score || {
      blue: 0,
      orange: 0
    };

    const blue = numberOrZero(score.blue);
    const orange = numberOrZero(score.orange);

    const winner = result.winner ||
      (blue > orange
        ? 'blue'
        : orange > blue
          ? 'orange'
          : 'draw');

    const winnerLabel = winner === 'draw'
      ? 'DRAW'
      : `${winner.toUpperCase()} TEAM WINS`;

    const mode = String(
      result.mode || 'MATCH'
    ).replace(/[^a-z0-9]/gi, ' ').toUpperCase();

    const duration = result.overtime
      ? 'OVERTIME'
      : 'FULL TIME';

    const players = Array.isArray(result.players)
      ? result.players
      : [];

    // Keep blue and orange teams grouped together.
    const orderedPlayers = [
      ...players.filter(player => player.team === 'blue'),
      ...players.filter(player => player.team === 'orange')
    ];

    const playerRows = orderedPlayers.map(player => {

      const team = player.team === 'orange'
        ? 'orange'
        : 'blue';

      const isSelf = Boolean(player.isPlayer);

      return `
        <tr>
          <td>
            <div class="ra-player-cell">

              <span class="ra-team-dot ${team}"></span>

              <span>
                ${escapeHtml(player.name || 'Player')}
              </span>

              ${isSelf
                ? '<span class="ra-self-tag">YOU</span>'
                : ''
              }

            </div>
          </td>

          <td>${numberOrZero(player.goals)}</td>

          <td>${numberOrZero(player.shotsOnGoal)}</td>

          <td>${numberOrZero(player.saves)}</td>

          <td>${numberOrZero(player.demolitions)}</td>

          <td>${numberOrZero(player.touches)}</td>
        </tr>
      `;

    }).join('');

    this.panel.innerHTML = `

      <div class="ra-results-topline">

        <span>
          ROCKET ARENA · MATCH REPORT
        </span>

        <span class="ra-results-mode">
          ${escapeHtml(mode)}
        </span>

      </div>

      <h1 class="ra-results-heading ${escapeHtml(winner)}">
        ${escapeHtml(winnerLabel)}
      </h1>

      <div class="ra-results-score">

        <div class="ra-results-team blue">

          <span class="ra-results-team-name">
            BLUE
          </span>

          <span class="ra-results-goals">
            ${blue}
          </span>

        </div>

        <span class="ra-results-separator">
          —
        </span>

        <div class="ra-results-team orange">

          <span class="ra-results-team-name">
            ORANGE
          </span>

          <span class="ra-results-goals">
            ${orange}
          </span>

        </div>

      </div>

      <div class="ra-results-meta">

        <span class="ra-results-chip">
          ${escapeHtml(duration)}
        </span>

        <span class="ra-results-chip">
          ${players.length} PLAYERS
        </span>

      </div>

      <div class="ra-results-section-title">
        PLAYER STATISTICS
      </div>

      <div class="ra-results-table-wrap">

        <table>

          <thead>
            <tr>
              <th>Player</th>
              <th>Goals</th>
              <th>Shots on goal</th>
              <th>Saves</th>
              <th>Demos</th>
              <th>Touches</th>
            </tr>
          </thead>

          <tbody>
            ${
              playerRows ||
              '<tr><td colspan="6">No player statistics available.</td></tr>'
            }
          </tbody>

        </table>

      </div>

      <div class="ra-results-actions">

        <button
          class="ra-results-button primary"
          type="button"
          data-result-action="playAgain"
        >
          PLAY AGAIN
        </button>

        <button
          class="ra-results-button"
          type="button"
          data-result-action="mainMenu"
        >
          MAIN MENU
        </button>

        <button
          class="ra-results-button"
          type="button"
          data-result-action="changeMode"
        >
          CHANGE MODE
        </button>

      </div>

    `;

  }

}


if (typeof window !== 'undefined') {
  window.RLModules = window.RLModules || {};
  window.RLModules.Results = { MatchResultsScreen };
}
