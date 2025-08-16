# Contributing to GitHub Notes

We love your input! We want to make contributing to GitHub Notes as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. **Fork the repo** and create your branch from `main`.
2. **Make your changes** following our coding standards.
3. **Test your changes** thoroughly.
4. **Update documentation** if you've changed APIs or added features.
5. **Ensure your code follows** the existing style.
6. **Issue a pull request** with a clear description of your changes.

## Development Setup

### Prerequisites
- Chrome 88+ or Microsoft Edge 88+
- Basic knowledge of JavaScript and browser extensions

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/zjkal/github-notes.git
   cd github-notes
   ```

2. **Load the extension in your browser**
   - Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project folder

3. **Make your changes**
   - Edit the source files
   - Reload the extension to see your changes
   - Test on various GitHub repository pages

### Project Structure

```
github-notes/
├── manifest.json          # Extension configuration
├── src/                   # Source code directory
│   ├── background.js      # Service worker
│   ├── content.js         # Content script for GitHub pages
│   ├── i18n.js            # Internationalization utilities
│   ├── options.js         # Settings functionality
│   └── popup.js           # Popup functionality
├── pages/                 # HTML pages directory
│   ├── options.html       # Settings page
│   └── popup.html         # Extension popup interface
├── styles/                # CSS styles directory
│   └── content.css        # Styles for GitHub integration
├── assets/                # Assets directory
│   ├── icon-16.png        # Extension icon (16x16)
│   ├── icon-48.png        # Extension icon (48x48)
│   ├── icon-128.png       # Extension icon (128x128)
│   └── icon.svg           # Extension icon (SVG)
├── _locales/              # Internationalization files
│   ├── en/messages.json   # English translations
│   └── zh_CN/messages.json # Chinese translations
└── README.md              # Documentation
```

## Coding Standards

### JavaScript
- Use modern ES6+ syntax
- Follow consistent naming conventions (camelCase for variables and functions)
- Add comments for complex logic
- Use async/await for asynchronous operations
- Handle errors gracefully

### CSS
- Use consistent class naming (kebab-case)
- Follow GitHub's design patterns
- Ensure responsive design
- Use CSS custom properties for theming

### HTML
- Use semantic HTML elements
- Include proper accessibility attributes
- Support internationalization with `data-i18n` attributes

## Internationalization

When adding new text strings:

1. **Add the key to both language files**:
   - `_locales/en/messages.json`
   - `_locales/zh_CN/messages.json`

2. **Use the i18n system in your code**:
   ```javascript
   // In JavaScript
   const text = chrome.i18n.getMessage('yourKey');
   
   // In HTML
   <span data-i18n="yourKey">Default text</span>
   ```

3. **Follow the existing message format**:
   ```json
   {
     "yourKey": {
       "message": "Your message text",
       "description": "Description of when this message is used"
     }
   }
   ```

## Testing

### Manual Testing
- Test on different GitHub repository pages
- Verify functionality in both Chrome and Edge
- Test with different screen sizes
- Verify internationalization works correctly
- Test import/export functionality

### Test Cases to Cover
- Adding notes to repositories
- Editing existing notes
- Deleting notes
- Searching notes in popup
- Exporting and importing data
- Settings changes
- Language switching

## Reporting Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/zjkal/github-notes/issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - Browser: [e.g. Chrome, Edge]
 - Version: [e.g. 96.0.4664.110]
 - Extension Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## Feature Requests

We welcome feature requests! Please [open an issue](https://github.com/zjkal/github-notes/issues) with:

- **Clear description** of the feature
- **Use case** - why would this be useful?
- **Proposed implementation** (if you have ideas)
- **Alternatives considered**

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to contact us if you have any questions:
- Open an issue for general questions
- Email: zjkal@example.com

Thank you for contributing to GitHub Notes! 🎉