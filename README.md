# Website Source Extractor

[![npm version](https://img.shields.io/npm/v/website-source-extractor.svg)](https://www.npmjs.com/package/website-source-extractor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![GitHub Stars](https://img.shields.io/github/stars/kabonkoda/website-source-extractor.svg)](https://github.com/kabonkoda/website-source-extractor/stargazers)

> ⭐ **If you find this tool helpful, please consider giving it a star on [GitHub](https://github.com/kabonkoda/website-source-extractor)!** ⭐

A command-line tool that extracts source code and assets from websites for analysis and offline viewing.

## Features

- Extract HTML, JavaScript, CSS, and media assets from websites
- Process source maps to recover original source code
- Support for iframe processing with configurable depth
- Save all content to a configurable output directory
- Detect npm dependencies used in JavaScript files
- Verbose logging options for detailed output

## Installation

### Global Installation (Recommended)

```bash
npm install -g website-source-extractor
```

### Local Installation

```bash
npm install website-source-extractor
```

## Usage

### Basic Usage

```bash
website-source-extractor https://example.com
```

### With Options

```bash
website-source-extractor https://example.com --output ./my-extracted-site --verbose --max-depth 2
```

## Command Options

| Option          | Alias | Description                                            | Default                  |
| --------------- | ----- | ------------------------------------------------------ | ------------------------ |
| `--output`      | `-o`  | Output directory for extracted content                 | `./extracted-{hostname}` |
| `--verbose`     | `-v`  | Enable verbose logging                                 | `false`                  |
| `--save-assets` | `-a`  | Save all assets (images, CSS, JS, and process iframes) | `true`                   |
| `--max-depth`   | `-d`  | Maximum depth for processing iframes                   | `2`                      |
| `--help`        |       | Show help                                              |                          |

## Examples

### Extract a Single-Page Application with Iframes

```bash
website-source-extractor https://my-react-app.com --save-assets --max-depth 2
```

### Extract Only HTML and JavaScript (No Assets)

```bash
website-source-extractor https://example.com --no-save-assets
```

## Troubleshooting

### CORS Issues

If you encounter CORS issues when extracting from certain websites, this is expected behavior as the tool respects web security protocols. Some assets may not be accessible.

### Large Websites

For large websites with many assets, the extraction process may take some time. Use the `--verbose` flag to see detailed progress.

### Memory Issues

If you encounter memory issues with very large websites, try extracting specific sections or limiting the iframe depth with `--max-depth`.

## Support this Project

If you find this tool valuable for your work, please consider supporting its development:

### ⭐ Star the Repository

The simplest way to show your support is to star the project on [GitHub](https://github.com/kabonkoda/website-source-extractor).

### 💖 Sponsor

You can financially support this project through:

- [GitHub Sponsors](https://github.com/sponsors/kabonkoda)
- [Ko-fi](https://ko-fi.com/kabonkoda)
- [PayPal](https://paypal.me/kabonkoda)

### 🤝 Contribute

Contributions are welcome! Check out the [contribution guidelines](CONTRIBUTING.md).

## Development

### Building from Source

```bash
git clone https://github.com/kabonkoda/website-source-extractor.git
cd website-source-extractor
npm install
npm run build
```

### Running in Development Mode

```bash
npm run dev -- https://example.com
```

## License

MIT

## Author

Adeyeye Oluwatobiloba ([@kabonkoda](https://github.com/kabonkoda))
