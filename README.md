# Website Source Extractor

[![npm version](https://img.shields.io/npm/v/website-source-extractor.svg)](https://www.npmjs.com/package/website-source-extractor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![GitHub Stars](https://img.shields.io/github/stars/kabonKoda/website-source-extractor.svg)](https://github.com/kabonKoda/website-source-extractor/stargazers)

**`website-source-extractor` is a powerful command-line interface (CLI) tool designed for developers, security researchers, and web archivists. It meticulously extracts the complete source code of websites—including HTML, CSS, JavaScript, images, and other assets. A key feature is its ability to process JavaScript source maps, reconstructing the original, human-readable code, which is invaluable for debugging, analysis, and understanding complex web applications.**

This tool allows you to download entire websites for offline browsing, in-depth code review, security auditing, or educational purposes. It intelligently handles iframes, respects website structures by organizing files by domain, and can even detect npm package dependencies used within the client-side JavaScript.

> ⭐ **If `website-source-extractor` helps you, please consider giving it a star on [GitHub](https://github.com/kabonKoda/website-source-extractor)! Your support is appreciated!** ⭐

## What can it do?

- **Comprehensive Asset Extraction:** Downloads HTML, CSS, JavaScript, images, fonts, and other media files.
- **Source Map Processing:** Automatically fetches and processes JavaScript source maps to de-minify code and recover original source file structures. This is crucial for understanding modern web applications built with frameworks like React, Angular, or Vue.
- **Organized Output:** Saves all extracted content into a well-structured directory, organized by domain and preserving the original path structure where possible.
- **Iframe Handling:** Recursively processes iframes up to a configurable depth, allowing you to capture content from embedded pages.
- **Dependency Detection:** Identifies and lists npm package dependencies imported in JavaScript files, providing insights into the libraries used by a website.
- **Offline Browsing & Analysis:** Enables you to browse websites offline or perform detailed source code analysis and security reviews locally.
- **Customizable Extraction:** Offers options to control verbosity, output directory, asset saving, and iframe processing depth.

## Installation

### Global Installation (Recommended)

Make the `website-source-extractor` command available system-wide:

```bash
npm install -g website-source-extractor
```

### Local Installation

Install it as a dependency in your project:

```bash
npm install website-source-extractor
```

## Usage

### Basic Usage

Simply provide the URL of the website you want to extract:

```bash
website-source-extractor https://example.com
```

This will save the extracted content to a directory like `./extracted-example.com`.

### With Options

Customize the extraction process:

```bash
website-source-extractor https://my-complex-app.com --output ./retrieved-sources --verbose --max-depth 3 --no-save-assets
```

## Command Options

| Option          | Alias | Description                                                                  | Default                  |
| --------------- | ----- | ---------------------------------------------------------------------------- | ------------------------ |
| `<url>`         |       | (Required) The URL of the website to extract.                                |                          |
| `--output`      | `-o`  | Output directory for extracted content.                                      | `./extracted-{hostname}` |
| `--verbose`     | `-v`  | Enable detailed (verbose) logging for troubleshooting or progress tracking.  | `false`                  |
| `--save-assets` | `-a`  | Save all assets (images, CSS, JS). If false, only HTML and JS are processed. | `true`                   |
| `--max-depth`   | `-d`  | Maximum depth for recursively processing iframes. `0` means no iframes.      | `2`                      |
| `--help`        |       | Show help and available command options.                                     |                          |

## Examples

### Extract a Single-Page Application (SPA) with Deep Iframes

```bash
website-source-extractor https://my-react-app.com --output ./spa-source --max-depth 3
```

### Extract Only HTML and JavaScript (No Assets, No Iframes)

```bash
website-source-extractor https://example.com --no-save-assets --max-depth 0
```

## Troubleshooting

- **CORS Issues:** The tool fetches resources like a browser. If a website has strict Cross-Origin Resource Sharing (CORS) policies, some assets might not be directly downloadable. This is expected behavior.
- **Large Websites:** Extraction can take time for websites with numerous assets or deep iframe structures. Use the `--verbose` flag for detailed progress.
- **Memory Usage:** For very large or complex sites, Node.js might consume significant memory. If you encounter issues, try reducing `--max-depth` or processing specific sub-pages if possible.
- **Dynamic Content:** The tool primarily fetches static assets and initial HTML. Content loaded dynamically by JavaScript after the initial page load might not always be captured completely if it involves complex XHR/Fetch calls without direct asset links.

## Support This Project

If `website-source-extractor` has been useful to you, please consider showing your support:

### ⭐ Star the Repository

This is the easiest way to show your appreciation! Head over to [GitHub](https://github.com/kabonKoda/website-source-extractor) and click the 'Star' button.

### 💖 Sponsor the Developer

You can financially support the ongoing development and maintenance of this project through:

- [GitHub Sponsors](https://github.com/sponsors/kabonKoda) (⭐ Recommended)
- [Ko-fi](https://ko-fi.com/kabonkoda)

Your sponsorship helps dedicate more time to new features, bug fixes, and community support.

### 🤝 Contribute

Contributions, whether code, documentation, or bug reports, are highly welcome! Please check out the [Contribution Guidelines](CONTRIBUTING.md) to get started.

## Development

Interested in contributing to the development?

### Building from Source

```bash
git clone https://github.com/kabonKoda/website-source-extractor.git
cd website-source-extractor
npm install
npm run build
```

### Running in Development Mode

Test your local changes with:

```bash
npm run dev -- https://example.com [options]
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Adeyeye Oluwatobiloba ([@kabonKoda](https://github.com/kabonKoda))
