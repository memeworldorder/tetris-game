# GameFi SDK Repository Specification

## Repository: `gamefi-sdk`

### Overview

The GameFi SDK is a standalone JavaScript/TypeScript library that provides a simple, drop-in solution for integrating any HTML5 game with the GameFi platform. It abstracts all the complexity of blockchain interactions, session management, and P2E mechanics.

## Repository Structure

```
gamefi-sdk/
├── src/
│   ├── core/
│   │   ├── sdk.ts                 # Main SDK class
│   │   ├── session-manager.ts     # Game session handling
│   │   ├── wallet-connector.ts    # Wallet integration
│   │   ├── api-client.ts          # Core API communication
│   │   └── vrf-client.ts          # VRF integration
│   ├── components/
│   │   ├── lives-display.tsx      # React component for lives
│   │   ├── leaderboard.tsx        # Leaderboard component
│   │   ├── wallet-button.tsx      # Connect wallet button
│   │   └── score-submit.tsx       # Score submission UI
│   ├── utils/
│   │   ├── validation.ts          # Move validation helpers
│   │   ├── encryption.ts          # Data encryption
│   │   ├── retry.ts               # Retry logic
│   │   └── storage.ts             # Local storage helpers
│   ├── types/
│   │   ├── index.ts               # Exported types
│   │   ├── game.ts                # Game-related types
│   │   ├── wallet.ts              # Wallet types
│   │   └── api.ts                 # API response types
│   └── index.ts                   # Main export file
├── examples/
│   ├── vanilla-js/                # Plain JavaScript example
│   ├── react/                     # React integration example
│   ├── phaser/                    # Phaser game example
│   ├── unity-webgl/               # Unity WebGL integration
│   └── construct3/                # Construct 3 integration
├── docs/
│   ├── getting-started.md         # Quick start guide
│   ├── api-reference.md           # Full API documentation
│   ├── integration-guide.md       # Step-by-step integration
│   ├── security-best-practices.md # Security guidelines
│   └── troubleshooting.md         # Common issues
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
├── dist/                          # Built files
│   ├── gamefi-sdk.js             # UMD build
│   ├── gamefi-sdk.min.js         # Minified UMD
│   ├── gamefi-sdk.esm.js         # ES modules build
│   └── types/                     # TypeScript declarations
├── package.json
├── tsconfig.json
├── rollup.config.js               # Build configuration
├── .npmignore
├── .gitignore
├── LICENSE
├── CHANGELOG.md
└── README.md
```

## Core SDK Implementation

### Main SDK Class (`src/core/sdk.ts`)

```typescript
export interface GameFiConfig {
  apiUrl: string;
  gameId: string;
  version?: string;
  debug?: boolean;
  autoConnect?: boolean;
  network?: 'mainnet' | 'devnet';
}

export class GameFiSDK {
  private config: GameFiConfig;
  private sessionManager: SessionManager;
  private walletConnector: WalletConnector;
  private apiClient: ApiClient;
  private vrfClient: VrfClient;
  
  constructor(config: GameFiConfig) {
    this.config = config;
    this.apiClient = new ApiClient(config.apiUrl);
    this.sessionManager = new SessionManager(this.apiClient);
    this.walletConnector = new WalletConnector(config.network);
    this.vrfClient = new VrfClient(config.apiUrl);
  }

  // Initialize SDK
  async init(): Promise<void> {
    if (this.config.autoConnect) {
      await this.connectWallet();
    }
    await this.validateGameId();
    this.setupEventListeners();
  }

  // Wallet management
  async connectWallet(): Promise<string> {
    const address = await this.walletConnector.connect();
    await this.apiClient.authenticate(address);
    return address;
  }

  // Game session management
  async startSession(): Promise<GameSession> {
    return this.sessionManager.create(this.config.gameId);
  }

  async endSession(sessionId: string, score: number, validationData: any): Promise<SessionResult> {
    return this.sessionManager.end(sessionId, score, validationData);
  }

  // Lives management
  async getLivesBalance(): Promise<number> {
    return this.apiClient.getLives();
  }

  async purchaseLives(amount: number): Promise<PurchaseResult> {
    return this.apiClient.purchaseLives(amount);
  }

  async claimDailyLife(): Promise<ClaimResult> {
    return this.apiClient.claimDaily();
  }

  // Leaderboard
  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly'): Promise<LeaderboardEntry[]> {
    return this.apiClient.getLeaderboard(period);
  }

  // VRF integration
  async requestRandomSeed(): Promise<string> {
    const { requestId } = await this.vrfClient.requestRandomness({
      purpose: 'game_seed',
      gameId: this.config.gameId
    });
    return this.vrfClient.waitForRandomness(requestId);
  }

  // React components
  get components() {
    return {
      LivesDisplay,
      Leaderboard,
      WalletButton,
      ScoreSubmit
    };
  }
}
```

## SDK Features

### 1. **Easy Integration**

```javascript
// Vanilla JavaScript
const gamefi = new GameFiSDK({
  apiUrl: 'https://api.gamefi.com',
  gameId: 'space-shooter'
});

await gamefi.init();
```

### 2. **Framework Agnostic**

- Works with vanilla JavaScript
- React components included
- Vue.js compatible
- Angular friendly
- Unity WebGL bridge

### 3. **Built-in Security**

- Move validation helpers
- Anti-cheat utilities
- Encrypted communication
- Session tampering prevention

### 4. **Developer Experience**

- TypeScript support
- Comprehensive docs
- Example integrations
- Debug mode
- Error handling

## NPM Package Configuration

### package.json
```json
{
  "name": "@gamefi/sdk",
  "version": "1.0.0",
  "description": "Official GameFi Platform SDK for Web3 game integration",
  "main": "dist/gamefi-sdk.js",
  "module": "dist/gamefi-sdk.esm.js",
  "types": "dist/types/index.d.ts",
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts,.tsx",
    "docs": "typedoc --out docs/api src",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "gamefi",
    "web3",
    "gaming",
    "blockchain",
    "solana",
    "sdk",
    "p2e"
  ],
  "author": "GameFi Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/gamefi-platform/gamefi-sdk"
  },
  "dependencies": {
    "@solana/wallet-adapter-base": "^0.9.0",
    "@solana/web3.js": "^1.73.0",
    "axios": "^1.3.0",
    "eventemitter3": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "rollup": "^3.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    },
    "react-dom": {
      "optional": true
    }
  }
}
```

## SDK Distribution

### 1. **NPM Registry**
```bash
npm install @gamefi/sdk
# or
yarn add @gamefi/sdk
# or
pnpm add @gamefi/sdk
```

### 2. **CDN Distribution**
```html
<!-- Latest version -->
<script src="https://unpkg.com/@gamefi/sdk/dist/gamefi-sdk.min.js"></script>

<!-- Specific version -->
<script src="https://unpkg.com/@gamefi/sdk@1.0.0/dist/gamefi-sdk.min.js"></script>
```

### 3. **Direct Download**
- GitHub releases page
- Bundled with game templates

## SDK Usage Examples

### Simple Integration
```javascript
// 1. Initialize SDK
const gamefi = new GameFiSDK({
  apiUrl: 'https://api.gamefi.com',
  gameId: 'tetris',
  autoConnect: true
});

// 2. Start game session
const session = await gamefi.startSession();

// 3. During gameplay
const moves = [];
moves.push({ type: 'rotate', timestamp: Date.now() });
moves.push({ type: 'drop', timestamp: Date.now() });

// 4. Submit score
const result = await gamefi.endSession(session.id, finalScore, moves);

// 5. Check leaderboard
const leaders = await gamefi.getLeaderboard('daily');
```

### React Integration
```jsx
import { GameFiSDK } from '@gamefi/sdk';
import { LivesDisplay, WalletButton } from '@gamefi/sdk/components';

function GameHeader() {
  return (
    <div className="game-header">
      <WalletButton />
      <LivesDisplay />
    </div>
  );
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: SDK CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  release:
    types: [created]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  publish:
    needs: build
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Version Management

- **Major versions**: Breaking changes
- **Minor versions**: New features
- **Patch versions**: Bug fixes

### Release Process
1. Update CHANGELOG.md
2. Bump version in package.json
3. Create git tag
4. Push to GitHub
5. GitHub Actions publishes to NPM

## SDK Metrics

- Download stats via NPM
- GitHub stars and forks
- Integration success rate
- Error tracking
- Performance monitoring

This SDK repository provides the bridge between any game and the GameFi platform, making integration as simple as possible while maintaining security and performance!