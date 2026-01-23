# Contributing to Priva Chat

Thank you for your interest in contributing to Priva Chat! We welcome all types of contributions.

## Code of Conduct

By participating in this project, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear description of the bug
- Steps to reproduce
- Expected behavior vs actual behavior
- Screenshots if relevant
- Environment information (OS, browser, version)

### Suggesting New Features

We welcome ideas for new features! Please create an issue with:
- Description of the proposed feature
- Why this feature would be useful
- Example use cases if possible

### Pull Requests

1. **Fork the repository** and create a new branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing style guide
   - Add tests if possible
   - Update documentation if needed

3. **Commit your changes** with a clear message
   ```bash
   git commit -m "feat: add feature X"
   ```
   
   Use appropriate prefixes:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for refactoring
   - `test:` for tests
   - `chore:` for maintenance

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub
   - Describe the changes you made
   - Reference related issues if any
   - Ensure all checks pass

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) (latest version)
- Node.js 18+ (for some tools)

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/priva-chat.git
   cd priva-chat
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Setup Convex:
   ```bash
   bunx convex dev
   ```

4. Copy environment file:
   ```bash
   cp .env.example .env
   ```

5. Start development server:
   ```bash
   bun run dev
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Avoid `any` type, use specific types
- Use interfaces for object types
- Follow existing naming conventions

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Target coverage: minimum 70% for new code

## Security

If you find a security vulnerability, **DO NOT** create a public issue. Please email security@privachat.app or follow our [Security Policy](SECURITY.md).

## Questions?

If you have questions, please create a discussion on GitHub or create an issue with the `question` label.

Thank you for your contribution! 🎉
